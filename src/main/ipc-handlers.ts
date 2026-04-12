import { ipcMain, dialog, app } from 'electron'
import fs from 'fs/promises'
import path from 'path'
import type { AppConfig, Settings } from './types'
import { saveAppConfig } from './storage/appconfig'
import { loadSettings, saveSettings, resetSettings } from './storage/settings'
import { initDatabase } from './database'
import { log } from './utils/logger'
import { getSkillsDir } from './utils/paths'
import {
  PROVIDERS,
  getByokConfig,
  getConfiguredProviders,
  saveProviderKey,
  removeProviderKey,
  saveFeatureRouting
} from './services/key-manager'
import { testProvider, getTokenUsageSummary } from './services/ai-provider'

interface HandlerDeps {
  getAppConfig: () => AppConfig | null
  setAppConfig: (c: AppConfig) => void
  getSettings: () => Settings | null
  setSettings: (s: Settings) => void
  isFirstLaunch: () => boolean
}

export function registerIpcHandlers(deps: HandlerDeps): void {
  // ── App state ──────────────────────────────────────────────────
  ipcMain.handle('app:isFirstLaunch', () => deps.isFirstLaunch())

  // ── AppConfig ──────────────────────────────────────────────────
  ipcMain.handle('appconfig:get', () => deps.getAppConfig())
  ipcMain.handle('appconfig:save', async (_e, config: AppConfig) => {
    deps.setAppConfig(config)
    await saveAppConfig(config)
    return { success: true }
  })

  // ── Settings ───────────────────────────────────────────────────
  ipcMain.handle('settings:get', () => deps.getSettings())
  ipcMain.handle('settings:save', async (_e, newSettings: Settings) => {
    const config = deps.getAppConfig()
    if (!config) return { success: false, error: 'No config' }
    deps.setSettings(newSettings)
    await saveSettings(config.dataFolder, newSettings)
    return { success: true }
  })
  ipcMain.handle('settings:reset', async () => {
    const config = deps.getAppConfig()
    if (!config) return { success: false, error: 'No config' }
    const fresh = await resetSettings(config.dataFolder)
    deps.setSettings(fresh)
    return fresh
  })

  // ── Dialogs ────────────────────────────────────────────────────
  ipcMain.handle('dialog:selectFolder', async () => {
    const result = await dialog.showOpenDialog({ properties: ['openDirectory'] })
    return result.canceled ? null : result.filePaths[0]
  })

  // ── File system ────────────────────────────────────────────────
  ipcMain.handle('fs:validateFolder', async (_e, folderPath: string) => {
    try {
      await fs.access(folderPath)
      const stat = await fs.stat(folderPath)
      if (!stat.isDirectory()) return { valid: false, error: 'Not a directory' }
      return { valid: true }
    } catch {
      // Directory doesn't exist — that's OK, we'll create it
      return { valid: true }
    }
  })

  // ── Wizard ─────────────────────────────────────────────────────
  ipcMain.handle('wizard:complete', async (_e, config: {
    dataFolder: string
    theme: string
    fontSize: string
  }) => {
    // Create data folder and subdirectories
    await fs.mkdir(config.dataFolder, { recursive: true })
    await fs.mkdir(path.join(config.dataFolder, 'raw'), { recursive: true })
    await fs.mkdir(path.join(config.dataFolder, 'processed'), { recursive: true })
    await fs.mkdir(path.join(config.dataFolder, 'cowork'), { recursive: true })
    await fs.mkdir(getSkillsDir(config.dataFolder), { recursive: true })

    // Initialise SQLite database
    await initDatabase(config.dataFolder)

    // Save appconfig
    const appCfg: AppConfig = { dataFolder: config.dataFolder }
    deps.setAppConfig(appCfg)
    await saveAppConfig(appCfg)

    // Save initial settings
    const settings = await loadSettings(config.dataFolder)
    settings.appearance.theme = config.theme as 'light' | 'dark' | 'system'
    settings.appearance.fontSize = config.fontSize as 'small' | 'medium' | 'large'
    deps.setSettings(settings)
    await saveSettings(config.dataFolder, settings)

    await log('INFO', `Wizard complete. Data folder: ${config.dataFolder}`)
    return { success: true }
  })

  // ── Startup ────────────────────────────────────────────────────
  ipcMain.handle('app:setLoginItem', (_e, enabled: boolean) => {
    app.setLoginItemSettings({ openAtLogin: enabled })
    return { success: true }
  })

  // ── BYOK Key Management ─────────────────────────────────────────
  ipcMain.handle('byok:getProviders', () => PROVIDERS)

  ipcMain.handle('byok:getConfigured', () => {
    const config = deps.getAppConfig()
    if (!config) return []
    return getConfiguredProviders(config)
  })

  ipcMain.handle('byok:getRouting', () => {
    const config = deps.getAppConfig()
    if (!config) return {}
    return getByokConfig(config).featureRouting
  })

  ipcMain.handle('byok:saveProvider', async (_e, data: {
    providerId: string
    key: string
    baseUrl?: string
    defaultModel?: string
  }) => {
    const config = deps.getAppConfig()
    if (!config) return { success: false, error: 'No config' }
    const updated = await saveProviderKey(config, data.providerId, data.key, data.baseUrl, data.defaultModel)
    deps.setAppConfig(updated)
    return { success: true }
  })

  ipcMain.handle('byok:removeProvider', async (_e, providerId: string) => {
    const config = deps.getAppConfig()
    if (!config) return { success: false, error: 'No config' }
    const updated = await removeProviderKey(config, providerId)
    deps.setAppConfig(updated)
    return { success: true }
  })

  ipcMain.handle('byok:testProvider', async (_e, data: {
    providerId: string
    key: string
    baseUrl?: string
  }) => {
    return testProvider(data.providerId, data.key, data.baseUrl)
  })

  ipcMain.handle('byok:saveRouting', async (_e, routing: Record<string, string>) => {
    const config = deps.getAppConfig()
    if (!config) return { success: false, error: 'No config' }
    const updated = await saveFeatureRouting(config, routing)
    deps.setAppConfig(updated)
    return { success: true }
  })

  ipcMain.handle('byok:getUsage', (_e, days?: number) => {
    return getTokenUsageSummary(days ?? 30)
  })

  // ── Logs ───────────────────────────────────────────────────────
  ipcMain.handle('logs:tail', async (_e, lines = 100) => {
    const config = deps.getAppConfig()
    if (!config) return ''
    const logPath = path.join(config.dataFolder, 'app.log')
    try {
      const content = await fs.readFile(logPath, 'utf-8')
      const allLines = content.split('\n')
      return allLines.slice(-lines).join('\n')
    } catch {
      return ''
    }
  })
}
