import { create } from 'zustand'
import type { Settings } from '../../main/types'

interface SettingsState {
  settings: Settings | null
  loaded: boolean
  error: string | null
  loadSettings: () => Promise<void>
  updateSetting: <K extends keyof Settings>(section: K, values: Partial<Settings[K]>) => Promise<void>
  resetSettings: () => Promise<void>
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  settings: null,
  loaded: false,
  error: null,

  loadSettings: async () => {
    try {
      const settings = (await window.electronAPI.getSettings()) as Settings | null
      if (settings) {
        set({ settings, loaded: true, error: null })
        applyTheme(settings)
      }
    } catch (err) {
      set({ error: String(err) })
    }
  },

  updateSetting: async (section, values) => {
    const { settings } = get()
    if (!settings) return

    const updated = {
      ...settings,
      [section]: { ...settings[section], ...values }
    }

    set({ settings: updated })
    await window.electronAPI.saveSettings(updated)
    applyTheme(updated)
  },

  resetSettings: async () => {
    const fresh = (await window.electronAPI.resetSettings()) as Settings
    set({ settings: fresh })
    applyTheme(fresh)
  }
}))

function applyTheme(settings: Settings): void {
  const html = document.documentElement

  // Dark mode
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
  const isDark =
    settings.appearance.theme === 'dark' ||
    (settings.appearance.theme === 'system' && prefersDark)
  html.classList.toggle('dark', isDark)

  // Accent colour
  html.setAttribute('data-accent', settings.appearance.accentColour)

  // Font size
  html.setAttribute('data-fontsize', settings.appearance.fontSize)
}
