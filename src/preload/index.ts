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

  // Feeds
  getFeeds: (): Promise<unknown> => ipcRenderer.invoke('feeds:getAll'),
  getFeed: (feedId: string): Promise<unknown> => ipcRenderer.invoke('feeds:get', feedId),
  validateFeedUrl: (url: string): Promise<unknown> => ipcRenderer.invoke('feeds:validate', url),
  addFeed: (data: unknown): Promise<unknown> => ipcRenderer.invoke('feeds:add', data),
  updateFeed: (feed: unknown): Promise<unknown> => ipcRenderer.invoke('feeds:update', feed),
  deleteFeed: (feedId: string): Promise<unknown> => ipcRenderer.invoke('feeds:delete', feedId),
  toggleFeed: (feedId: string): Promise<unknown> => ipcRenderer.invoke('feeds:toggle', feedId),
  fetchFeedNow: (feedId: string): Promise<unknown> => ipcRenderer.invoke('feeds:fetchNow', feedId),
  getArticles: (feedId: string, limit?: number): Promise<unknown> =>
    ipcRenderer.invoke('feeds:getArticles', feedId, limit),

  // SKILL.md Management
  skillCreate: (data: {
    feedId: string; feedName: string; feedUrl: string; content?: string
  }): Promise<unknown> => ipcRenderer.invoke('skill:create', data),
  skillGetCurrent: (feedId: string): Promise<unknown> =>
    ipcRenderer.invoke('skill:getCurrent', feedId),
  skillGetVersion: (feedId: string, version: number): Promise<unknown> =>
    ipcRenderer.invoke('skill:getVersion', feedId, version),
  skillGetHistory: (feedId: string): Promise<unknown> =>
    ipcRenderer.invoke('skill:getHistory', feedId),
  skillSave: (data: {
    feedId: string; content: string; instruction: string | null; diffSummary: string | null
  }): Promise<unknown> => ipcRenderer.invoke('skill:save', data),
  skillRollback: (feedId: string, targetVersion: number): Promise<unknown> =>
    ipcRenderer.invoke('skill:rollback', feedId, targetVersion),
  skillApplyInstruction: (data: {
    feedId: string; instruction: string
  }): Promise<unknown> => ipcRenderer.invoke('skill:applyInstruction', data),
  skillPreview: (data: {
    oldSkill: string; newSkill: string
    articles: { title: string; content: string }[]
  }): Promise<unknown> => ipcRenderer.invoke('skill:preview', data),
  skillCheckDiskSync: (feedId: string): Promise<unknown> =>
    ipcRenderer.invoke('skill:checkDiskSync', feedId),
  skillListFeeds: (): Promise<unknown> => ipcRenderer.invoke('skill:listFeeds'),

  // Reasoning Log
  reasoningGetForArticle: (articleId: string): Promise<unknown> =>
    ipcRenderer.invoke('reasoning:getForArticle', articleId),
  reasoningGetForFeed: (feedId: string, skillVersion?: number): Promise<unknown> =>
    ipcRenderer.invoke('reasoning:getForFeed', feedId, skillVersion),
  reasoningGetStats: (feedId: string): Promise<unknown> =>
    ipcRenderer.invoke('reasoning:getStats', feedId),

  // Digest
  digestGetArticles: (data?: {
    feedId?: string; priority?: string; status?: string; limit?: number
  }): Promise<unknown> => ipcRenderer.invoke('digest:getArticles', data),
  digestGetFeedOptions: (): Promise<unknown> => ipcRenderer.invoke('digest:getFeedOptions'),

  // Subscribers
  getSubscribers: (): Promise<unknown> => ipcRenderer.invoke('subscribers:getAll'),
  addSubscriber: (data: { name: string; email: string; feedIds?: string[] }): Promise<unknown> =>
    ipcRenderer.invoke('subscribers:add', data),
  updateSubscriber: (sub: unknown): Promise<unknown> => ipcRenderer.invoke('subscribers:update', sub),
  deleteSubscriber: (id: string): Promise<unknown> => ipcRenderer.invoke('subscribers:delete', id),
  toggleSubscriber: (id: string): Promise<unknown> => ipcRenderer.invoke('subscribers:toggle', id),

  // Email
  verifySmtp: (smtp: unknown): Promise<unknown> => ipcRenderer.invoke('email:verifySmtp', smtp),
  sendTestEmail: (toEmail: string): Promise<unknown> => ipcRenderer.invoke('email:sendTest', toEmail),
  sendWelcomeEmail: (subscriberId: string): Promise<unknown> =>
    ipcRenderer.invoke('email:sendWelcome', subscriberId),
  sendDigestToSubscribers: (subscriberIds?: string[]): Promise<unknown> =>
    ipcRenderer.invoke('email:sendDigest', subscriberIds),
  runDigestSend: (): Promise<unknown> => ipcRenderer.invoke('email:runDigestSend'),
  getEmailScheduleStatus: (): Promise<unknown> => ipcRenderer.invoke('email:getScheduleStatus'),

  // Logs
  tailLogs: (lines?: number): Promise<string> => ipcRenderer.invoke('logs:tail', lines)
}

contextBridge.exposeInMainWorld('electronAPI', electronAPI)

export type ElectronAPI = typeof electronAPI
