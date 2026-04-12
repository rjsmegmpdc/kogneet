import { useEffect, useState } from 'react'
import { useSettingsStore } from '../../stores/settings-store'
import { Toggle } from '../shared/Toggle'
import { Select } from '../shared/Select'
import { FolderPicker } from '../shared/FolderPicker'

export function GeneralTab(): JSX.Element {
  const { settings, updateSetting } = useSettingsStore()
  const [dataFolder, setDataFolder] = useState<string>('')

  useEffect(() => {
    window.electronAPI.getAppConfig().then((config: unknown) => {
      const c = config as { dataFolder?: string } | null
      if (c?.dataFolder) setDataFolder(c.dataFolder)
    })
  }, [])

  if (!settings) return <div>Loading...</div>

  const handleDataFolderChange = async (newPath: string): Promise<void> => {
    const result = (await window.electronAPI.saveAppConfig({
      dataFolder: newPath
    })) as { error?: string }
    if (!result?.error) setDataFolder(newPath)
  }

  return (
    <div className="divide-y divide-gray-100 dark:divide-gray-700">
      <FolderPicker
        label="Primary data folder"
        description="Where feeds, SKILL.md files, articles, and the SQLite database are stored"
        value={dataFolder}
        onChange={handleDataFolderChange}
      />

      <Toggle
        label="Launch on Windows startup"
        description="Start the app automatically when you log in"
        checked={settings.general.launchOnStartup}
        onChange={(v) => {
          updateSetting('general.launchOnStartup', v)
          window.electronAPI.setLoginItem(v)
        }}
      />

      <Toggle
        label="Start minimised to tray"
        description="App runs in background, accessible from system tray icon"
        checked={settings.general.startMinimised}
        onChange={(v) => updateSetting('general.startMinimised', v)}
      />

      <Toggle
        label="Auto-load latest digest on launch"
        description="Automatically load today's digest when opening the app"
        checked={settings.general.autoLoadLatestOnLaunch}
        onChange={(v) => updateSetting('general.autoLoadLatestOnLaunch', v)}
      />

      <Select
        label="Default new feed schedule"
        description="Pre-fills the schedule picker when adding a new feed"
        value={settings.general.defaultFeedSchedule}
        options={[
          { value: 'interval-30', label: 'Every 30 minutes' },
          { value: 'daily-0800', label: 'Daily at 08:00' },
          { value: 'daily-weekdays-0800', label: 'Weekdays at 08:00' },
          { value: 'custom', label: 'Custom cron' }
        ]}
        onChange={(v) => updateSetting('general.defaultFeedSchedule', v)}
      />

      <Select
        label="Financial year starts"
        description="First month of your financial year — used for quarter-based date filters"
        value={String(settings.financialYear.startMonth)}
        options={[
          { value: '1', label: 'January (calendar year)' },
          { value: '4', label: 'April (UK/India)' },
          { value: '7', label: 'July (AU/NZ)' },
          { value: '10', label: 'October (US federal)' }
        ]}
        onChange={(v) => updateSetting('financialYear.startMonth', Number(v))}
      />
    </div>
  )
}
