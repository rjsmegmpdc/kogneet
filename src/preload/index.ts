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

  // Logs
  tailLogs: (lines?: number): Promise<string> => ipcRenderer.invoke('logs:tail', lines)
}

contextBridge.exposeInMainWorld('electronAPI', electronAPI)

export type ElectronAPI = typeof electronAPI
