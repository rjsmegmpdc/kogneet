import { ipcMain, dialog, app } from 'electron'
import fs from 'fs/promises'
import path from 'path'
import type { AppConfig, Settings } from './types'
import { saveAppConfig } from './storage/appconfig'
import { loadSettings, saveSettings, resetSettings } from './storage/settings'
import { initDatabase, getDb } from './database'
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
import {
  createSkill,
  getCurrentSkill,
  getSkillHistory,
  getSkillVersion,
  saveSkillVersion,
  rollbackSkill,
  checkDiskSync,
  getFeedsWithSkills
} from './services/skill-manager'
import { applyInstruction, previewChanges, applyAndSave } from './services/skill-editor'
import {
  getReasoningForArticle,
  getReasoningForFeed,
  getReasoningStats
} from './services/reasoning-logger'
import {
  loadFeeds as loadFeedsDb,
  getFeed,
  addFeed as addFeedDb,
  updateFeed as updateFeedDb,
  deleteFeed as deleteFeedDb,
  toggleFeed as toggleFeedDb,
  updateLastFetched,
  validateFeedUrl
} from './storage/feeds'
import { fetchFeed, getArticles } from './services/feed-fetcher'
import { processArticles } from './services/skill-processor'
import { scheduleFeed, unscheduleFeed, rescheduleFeed, startAll, setFetchCallback } from './services/scheduler'
import {
  loadSubscribers,
  getSubscriber,
  addSubscriber as addSubDb,
  updateSubscriber as updateSubDb,
  deleteSubscriber as deleteSubDb,
  toggleSubscriber as toggleSubDb
} from './storage/subscribers'
import { verifySmtp, sendTestEmail, sendWelcomeEmail, sendDigestEmail } from './services/email-sender'
import { runDigestSend, getDigestEmailStatus } from './services/email-scheduler'

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

  // ── Feeds ──────────────────────────────────────────────────────
  ipcMain.handle('feeds:getAll', () => loadFeedsDb())

  ipcMain.handle('feeds:get', (_e, feedId: string) => getFeed(feedId))

  ipcMain.handle('feeds:validate', async (_e, url: string) => validateFeedUrl(url))

  ipcMain.handle('feeds:add', async (_e, feedData: {
    name: string; url: string; category: string; sourceType?: string
    schedule: { type: string; intervalMinutes?: number; timeLocal?: string; cronExpression?: string }
    enabled: boolean
  }) => {
    const config = deps.getAppConfig()
    if (!config) return { success: false, error: 'No config' }

    const { randomUUID } = await import('crypto')
    const feed = {
      id: randomUUID(),
      name: feedData.name,
      url: feedData.url,
      category: feedData.category || '',
      sourceType: (feedData.sourceType as 'rss') || 'rss',
      schedule: feedData.schedule,
      enabled: feedData.enabled,
      lastFetchedAt: null,
      addedAt: new Date().toISOString(),
      skillVersion: null
    } as import('./types').Feed

    addFeedDb(feed)

    // Auto-create SKILL.md for the feed
    try {
      await createSkill(config.dataFolder, feed.id, feed.name, feed.url)
    } catch (err) {
      await log('WARN', `Auto SKILL.md creation failed for ${feed.name}: ${err}`)
    }

    // Schedule if enabled
    if (feed.enabled) {
      scheduleFeed(feed)
    }

    return { success: true, feed }
  })

  ipcMain.handle('feeds:update', async (_e, feedData: import('./types').Feed) => {
    updateFeedDb(feedData)
    rescheduleFeed(feedData)
    return { success: true }
  })

  ipcMain.handle('feeds:delete', async (_e, feedId: string) => {
    unscheduleFeed(feedId)
    deleteFeedDb(feedId)
    return { success: true }
  })

  ipcMain.handle('feeds:toggle', async (_e, feedId: string) => {
    const enabled = toggleFeedDb(feedId)
    const feed = getFeed(feedId)
    if (feed) {
      if (enabled) scheduleFeed(feed)
      else unscheduleFeed(feedId)
    }
    return { success: true, enabled }
  })

  ipcMain.handle('feeds:fetchNow', async (_e, feedId: string) => {
    const config = deps.getAppConfig()
    const settings = deps.getSettings()
    if (!config || !settings) return { error: 'Not configured' }

    const feed = getFeed(feedId)
    if (!feed) return { error: 'Feed not found' }

    try {
      const result = await fetchFeed(feed, config.dataFolder, settings)
      updateLastFetched(feedId)

      // Auto-process with SKILL.md if AI is configured
      try {
        await processArticles(config, feedId)
      } catch {
        // Non-fatal — articles are still saved unprocessed
      }

      return { success: true, ...result }
    } catch (err) {
      return { error: String(err) }
    }
  })

  ipcMain.handle('feeds:getArticles', (_e, feedId: string, limit?: number) => {
    return getArticles(feedId, limit)
  })

  // ── SKILL.md Management ────────────────────────────────────────
  ipcMain.handle('skill:create', async (_e, data: {
    feedId: string; feedName: string; feedUrl: string; content?: string
  }) => {
    const config = deps.getAppConfig()
    if (!config) return { success: false, error: 'No config' }
    const version = await createSkill(config.dataFolder, data.feedId, data.feedName, data.feedUrl, data.content)
    return { success: true, version }
  })

  ipcMain.handle('skill:getCurrent', (_e, feedId: string) => {
    return getCurrentSkill(feedId)
  })

  ipcMain.handle('skill:getVersion', (_e, feedId: string, version: number) => {
    return getSkillVersion(feedId, version)
  })

  ipcMain.handle('skill:getHistory', (_e, feedId: string) => {
    return getSkillHistory(feedId)
  })

  ipcMain.handle('skill:save', async (_e, data: {
    feedId: string; content: string; instruction: string | null; diffSummary: string | null
  }) => {
    const config = deps.getAppConfig()
    if (!config) return { success: false, error: 'No config' }
    const version = await saveSkillVersion(
      config.dataFolder, data.feedId, data.content, data.instruction, data.diffSummary
    )
    return { success: true, version }
  })

  ipcMain.handle('skill:rollback', async (_e, feedId: string, targetVersion: number) => {
    const config = deps.getAppConfig()
    if (!config) return { success: false, error: 'No config' }
    const version = await rollbackSkill(config.dataFolder, feedId, targetVersion)
    return version ? { success: true, version } : { success: false, error: 'Version not found' }
  })

  ipcMain.handle('skill:applyInstruction', async (_e, data: {
    feedId: string; instruction: string
  }) => {
    const config = deps.getAppConfig()
    if (!config) return { success: false, error: 'No config' }
    try {
      const result = await applyAndSave(config, config.dataFolder, data.feedId, data.instruction)
      return { success: true, version: result.version, changes: result.changes }
    } catch (err) {
      return { success: false, error: String(err) }
    }
  })

  ipcMain.handle('skill:preview', async (_e, data: {
    oldSkill: string; newSkill: string
    articles: { title: string; content: string }[]
  }) => {
    const config = deps.getAppConfig()
    if (!config) return { success: false, error: 'No config' }
    try {
      const results = await previewChanges(config, data.oldSkill, data.newSkill, data.articles)
      return { success: true, results }
    } catch (err) {
      return { success: false, error: String(err) }
    }
  })

  ipcMain.handle('skill:checkDiskSync', async (_e, feedId: string) => {
    const config = deps.getAppConfig()
    if (!config) return null
    return checkDiskSync(config.dataFolder, feedId)
  })

  ipcMain.handle('skill:listFeeds', () => {
    return getFeedsWithSkills()
  })

  // ── Reasoning Log ─────────────────────────────────────────────
  ipcMain.handle('reasoning:getForArticle', (_e, articleId: string) => {
    return getReasoningForArticle(articleId)
  })

  ipcMain.handle('reasoning:getForFeed', (_e, feedId: string, skillVersion?: number) => {
    return getReasoningForFeed(feedId, skillVersion)
  })

  ipcMain.handle('reasoning:getStats', (_e, feedId: string) => {
    return getReasoningStats(feedId)
  })

  // ── Digest (article queries) ───────────────────────────────────
  ipcMain.handle('digest:getArticles', (_e, data?: {
    feedId?: string; priority?: string; status?: string; limit?: number
  }) => {
    const db = getDb()
    let query = `SELECT a.id, a.feed_id, a.title, a.link, a.content, a.summary, a.priority, a.status,
                        a.published_at, a.fetched_at, a.metadata, f.name as feed_name
                 FROM articles a JOIN feeds f ON a.feed_id = f.id WHERE 1=1`
    const params: unknown[] = []

    if (data?.feedId) { query += ' AND a.feed_id = ?'; params.push(data.feedId) }
    if (data?.priority) { query += ' AND a.priority = ?'; params.push(data.priority) }
    if (data?.status && data.status !== 'all') { query += ' AND a.status = ?'; params.push(data.status) }

    query += ` ORDER BY CASE a.priority WHEN 'high' THEN 1 WHEN 'medium' THEN 2 ELSE 3 END, a.fetched_at DESC`
    query += ` LIMIT ?`
    params.push(data?.limit ?? 100)

    const result = db.exec(query, params)
    if (result.length === 0) return []
    return result[0].values.map((row) => ({
      id: row[0], feedId: row[1], title: row[2], link: row[3], content: row[4],
      summary: row[5], priority: row[6], status: row[7],
      publishedAt: row[8], fetchedAt: row[9],
      metadata: row[10] ? JSON.parse(row[10] as string) : {},
      feedName: row[11]
    }))
  })

  ipcMain.handle('digest:getFeedOptions', () => {
    const db = getDb()
    const result = db.exec('SELECT id, name FROM feeds WHERE enabled = 1 ORDER BY name')
    if (result.length === 0) return []
    return result[0].values.map((row) => ({ id: row[0], name: row[1] }))
  })

  // ── Subscribers ───────────────────────────────────────────────
  ipcMain.handle('subscribers:getAll', () => loadSubscribers())

  ipcMain.handle('subscribers:add', async (_e, data: { name: string; email: string; feedIds?: string[] }) => {
    const { randomUUID } = await import('crypto')
    const sub = {
      id: randomUUID(),
      name: data.name,
      email: data.email,
      addedAt: new Date().toISOString(),
      enabled: true,
      feedIds: data.feedIds ?? []
    }
    addSubDb(sub)
    return { success: true, subscriber: sub }
  })

  ipcMain.handle('subscribers:update', (_e, sub: import('./types').Subscriber) => {
    updateSubDb(sub)
    return { success: true }
  })

  ipcMain.handle('subscribers:delete', (_e, id: string) => {
    deleteSubDb(id)
    return { success: true }
  })

  ipcMain.handle('subscribers:toggle', (_e, id: string) => {
    const enabled = toggleSubDb(id)
    return { success: true, enabled }
  })

  // ── Email ─────────────────────────────────────────────────────
  ipcMain.handle('email:verifySmtp', async (_e, smtp: import('./types').SmtpConfig) => {
    return verifySmtp(smtp)
  })

  ipcMain.handle('email:sendTest', async (_e, toEmail: string) => {
    const config = deps.getAppConfig()
    const settings = deps.getSettings()
    if (!config?.smtp || !settings) return { success: false, error: 'SMTP or settings not configured' }
    return sendTestEmail(config.smtp, settings, toEmail)
  })

  ipcMain.handle('email:sendWelcome', async (_e, subscriberId: string) => {
    const config = deps.getAppConfig()
    const settings = deps.getSettings()
    if (!config?.smtp || !settings) return { success: false, error: 'SMTP not configured' }
    const sub = getSubscriber(subscriberId)
    if (!sub) return { success: false, error: 'Subscriber not found' }
    const feeds = loadFeedsDb()
    const feedNames = sub.feedIds.length > 0
      ? feeds.filter((f) => sub.feedIds.includes(f.id)).map((f) => f.name)
      : feeds.filter((f) => f.enabled).map((f) => f.name)
    return sendWelcomeEmail(config.smtp, settings, sub, feedNames)
  })

  ipcMain.handle('email:sendDigest', async (_e, subscriberIds?: string[]) => {
    const config = deps.getAppConfig()
    const settings = deps.getSettings()
    if (!config?.smtp || !settings) return { success: false, recipientCount: 0, error: 'SMTP not configured' }
    const allSubs = loadSubscribers()
    const subs = subscriberIds
      ? allSubs.filter((s) => subscriberIds.includes(s.id))
      : allSubs
    return sendDigestEmail(config.smtp, settings, subs, config.dataFolder)
  })

  ipcMain.handle('email:runDigestSend', async () => {
    return runDigestSend()
  })

  ipcMain.handle('email:getScheduleStatus', () => {
    return getDigestEmailStatus()
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
