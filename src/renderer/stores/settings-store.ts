import { create } from 'zustand'
import type { Settings } from '../../main/types'

interface SettingsState {
  settings: Settings | null
  loading: boolean
  error: string | null
  loadSettings: () => Promise<void>
  updateSetting: (path: string, value: unknown) => Promise<void>
  resetSettings: () => Promise<void>
}

function deepSet(obj: Record<string, unknown>, path: string, value: unknown): Record<string, unknown> {
  const result = structuredClone(obj)
  const keys = path.split('.')
  let current: Record<string, unknown> = result
  for (let i = 0; i < keys.length - 1; i++) {
    current = current[keys[i]] as Record<string, unknown>
  }
  current[keys[keys.length - 1]] = value
  return result
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  settings: null,
  loading: true,
  error: null,

  loadSettings: async () => {
    set({ loading: true, error: null })
    try {
      const settings = (await window.electronAPI.getSettings()) as Settings | null
      set({ settings, loading: false })
      if (settings) applyTheme(settings)
    } catch (err) {
      set({ error: String(err), loading: false })
    }
  },

  updateSetting: async (path: string, value: unknown) => {
    const { settings } = get()
    if (!settings) return

    const updated = deepSet(settings as unknown as Record<string, unknown>, path, value) as unknown as Settings
    set({ settings: updated })
    applyTheme(updated)

    const result = (await window.electronAPI.saveSettings(updated)) as { error?: string }
    if (result?.error) {
      set({ settings, error: result.error })
    }
  },

  resetSettings: async () => {
    const fresh = (await window.electronAPI.resetSettings()) as Settings
    if (fresh) {
      set({ settings: fresh })
      applyTheme(fresh)
    }
  }
}))

function applyTheme(settings: Settings): void {
  const html = document.documentElement

  const theme = settings.appearance.theme
  if (theme === 'dark') {
    html.classList.add('dark')
  } else if (theme === 'light') {
    html.classList.remove('dark')
  } else {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    html.classList.toggle('dark', prefersDark)
  }

  html.setAttribute('data-accent', settings.appearance.accentColour)
  html.setAttribute('data-fontsize', settings.appearance.fontSize)
}
