import { contextBridge, ipcRenderer } from 'electron'

const electronAPI = {
  // App state
  isFirstLaunch: (): Promise<boolean> => ipcRenderer.invoke('app:isFirstLaunch'),

  // AppConfig
  getAppConfig: (): Promise<unknown> => ipcRenderer.invoke('appconfig:get'),
  saveAppConfig: (config: unknown): Promise<unknown> => ipcRenderer.invoke('appconfig:save', config),

  // Settings
  getSettings: (): Promise<unknown> => ipcRenderer.invoke('settings:get'),
  saveSettings: (settings: unknown): Promise<unknown> => ipcRenderer.invoke('settings:save', settings),
  resetSettings: (): Promise<unknown> => ipcRenderer.invoke('settings:reset'),

  // Dialogs
  selectFolder: (): Promise<string | null> => ipcRenderer.invoke('dialog:selectFolder'),

  // File system
  validateFolder: (path: string): Promise<{ valid: boolean; error?: string }> =>
    ipcRenderer.invoke('fs:validateFolder', path),

  // Wizard
  completeWizard: (config: {
    dataFolder: string
    theme: string
    fontSize: string
  }): Promise<unknown> => ipcRenderer.invoke('wizard:complete', config),

  // Startup
  setLoginItem: (enabled: boolean): Promise<unknown> =>
    ipcRenderer.invoke('app:setLoginItem', enabled),

  // BYOK Key Management
  byokGetProviders: (): Promise<unknown> => ipcRenderer.invoke('byok:getProviders'),
  byokGetConfigured: (): Promise<unknown> => ipcRenderer.invoke('byok:getConfigured'),
  byokGetRouting: (): Promise<unknown> => ipcRenderer.invoke('byok:getRouting'),
  byokSaveProvider: (data: {
    providerId: string; key: string; baseUrl?: string; defaultModel?: string
  }): Promise<unknown> => ipcRenderer.invoke('byok:saveProvider', data),
  byokRemoveProvider: (providerId: string): Promise<unknown> =>
    ipcRenderer.invoke('byok:removeProvider', providerId),
  byokTestProvider: (data: {
    providerId: string; key: string; baseUrl?: string
  }): Promise<unknown> => ipcRenderer.invoke('byok:testProvider', data),
  byokSaveRouting: (routing: Record<string, string>): Promise<unknown> =>
    ipcRenderer.invoke('byok:saveRouting', routing),
  byokGetUsage: (days?: number): Promise<unknown> => ipcRenderer.invoke('byok:getUsage', days),

  // Logs
  tailLogs: (lines?: number): Promise<string> => ipcRenderer.invoke('logs:tail', lines)
}

contextBridge.exposeInMainWorld('electronAPI', electronAPI)

export type ElectronAPI = typeof electronAPI
