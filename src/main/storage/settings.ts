import fs from 'fs/promises'
import type { Settings } from '../types'
import { getSettingsPath } from '../utils/paths'
import { atomicWrite } from '../utils/atomic-write'

export const DEFAULT_SETTINGS: Settings = {
  version: '2.0.0',
  general: {
    launchOnStartup: false,
    startMinimised: false,
    autoLoadLatestOnLaunch: true,
    defaultFeedSchedule: 'daily-weekdays-0800',
    coworkWatchFolder: 'raw',
    coworkBatchDelaySeconds: 120
  },
  appearance: {
    theme: 'system',
    accentColour: 'purple',
    fontSize: 'medium'
  },
  email: {
    senderDisplayName: 'Kogneet',
    senderEmail: '',
    sendTimeLocal: '08:00',
    sendIfNoItems: false,
    replyTo: '',
    unsubscribeEnabled: true,
    unsubscribeCheckIntervalMinutes: 15
  },
  notifications: {
    fetchComplete: true,
    fetchError: true,
    coworkComplete: true,
    emailSent: true,
    emailFailed: true,
    changedItemsDetected: true
  },
  display: {
    cardDensity: 'comfortable',
    defaultSort: 'newest',
    showSourceUrlOnCard: false,
    expandLearningByDefault: true,
    groupByCategory: true,
    dateFormat: 'DD/MM/YYYY',
    timeFormat: '24h'
  },
  data: {
    keepRawDays: 30,
    keepProcessedDays: 30,
    keepEmailLogDays: 90,
    autoCleanupOnLaunch: true
  },
  financialYear: {
    startMonth: 7
  },
  socialPosts: {
    enabled: true,
    tone: 'professional',
    maxLength: 280,
    includeEmoji: true,
    includeHashtags: false,
    targetAudience: '',
    callToAction: true,
    platform: 'linkedin'
  }
}

/**
 * Deep merge: recursively merge defaults with overrides.
 * Only defined values in override replace the default.
 */
function deepMerge<T extends Record<string, unknown>>(defaults: T, overrides: Partial<T>): T {
  const result = { ...defaults }
  for (const key of Object.keys(defaults) as (keyof T)[]) {
    const def = defaults[key]
    const ovr = overrides[key]
    if (ovr === undefined) continue
    if (def && typeof def === 'object' && !Array.isArray(def) && ovr && typeof ovr === 'object' && !Array.isArray(ovr)) {
      result[key] = deepMerge(def as Record<string, unknown>, ovr as Record<string, unknown>) as T[keyof T]
    } else {
      result[key] = ovr as T[keyof T]
    }
  }
  return result
}

export async function loadSettings(dataFolder: string): Promise<Settings> {
  try {
    const data = await fs.readFile(getSettingsPath(dataFolder), 'utf-8')
    const parsed = JSON.parse(data)
    return deepMerge(DEFAULT_SETTINGS, parsed)
  } catch {
    return { ...DEFAULT_SETTINGS }
  }
}

export async function saveSettings(dataFolder: string, settings: Settings): Promise<void> {
  await atomicWrite(getSettingsPath(dataFolder), JSON.stringify(settings, null, 2))
}

export async function resetSettings(dataFolder: string): Promise<Settings> {
  const fresh = { ...DEFAULT_SETTINGS }
  await saveSettings(dataFolder, fresh)
  return fresh
}
