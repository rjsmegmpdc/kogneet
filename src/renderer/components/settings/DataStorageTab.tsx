import { useState } from 'react'
import { useSettingsStore } from '../../stores/settings-store'
import { Select } from '../shared/Select'
import { Toggle } from '../shared/Toggle'
import { Button } from '../shared/Button'
import { Modal } from '../shared/Modal'

const retentionOptions = [
  { value: '7', label: '7 days' },
  { value: '14', label: '14 days' },
  { value: '30', label: '30 days' },
  { value: '90', label: '90 days' },
  { value: '-1', label: 'Forever' }
]

const emailRetentionOptions = [
  { value: '30', label: '30 days' },
  { value: '90', label: '90 days' },
  { value: '365', label: '1 year' },
  { value: '-1', label: 'Forever' }
]

export function DataStorageTab(): JSX.Element {
  const { settings, updateSetting, resetSettings } = useSettingsStore()
  const [showResetConfirm, setShowResetConfirm] = useState(false)

  if (!settings) return <div>Loading...</div>

  const handleReset = async (): Promise<void> => {
    await resetSettings()
    setShowResetConfirm(false)
  }

  return (
    <div className="divide-y divide-gray-100 dark:divide-gray-700">
      <Select
        label="Keep raw files for"
        value={String(settings.data.keepRawDays)}
        options={retentionOptions}
        onChange={(v) => updateSetting('data.keepRawDays', Number(v))}
      />

      <Select
        label="Keep processed files for"
        value={String(settings.data.keepProcessedDays)}
        options={retentionOptions}
        onChange={(v) => updateSetting('data.keepProcessedDays', Number(v))}
      />

      <Select
        label="Keep email log for"
        value={String(settings.data.keepEmailLogDays)}
        options={emailRetentionOptions}
        onChange={(v) => updateSetting('data.keepEmailLogDays', Number(v))}
      />

      <Toggle
        label="Auto-cleanup on launch"
        description="Automatically delete files beyond the retention window on app start"
        checked={settings.data.autoCleanupOnLaunch}
        onChange={(v) => updateSetting('data.autoCleanupOnLaunch', v)}
      />

      {/* Storage info */}
      <div className="py-3">
        <div className="text-sm font-medium mb-2">Storage</div>
        <div className="flex gap-4 text-sm text-gray-500 dark:text-gray-400">
          <span>Database: kogneet.db</span>
          <span>Raw files: raw/</span>
          <span>Processed: processed/</span>
        </div>
      </div>

      {/* Reset */}
      <div className="py-4">
        <Button variant="danger" size="sm" onClick={() => setShowResetConfirm(true)}>
          Reset all settings to defaults
        </Button>
      </div>

      {showResetConfirm && (
        <Modal title="Reset settings?" onClose={() => setShowResetConfirm(false)}>
          <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
            This will reset all preferences to their defaults. Your feeds, articles, SKILL.md files, and subscribers will NOT be affected.
          </p>
          <div className="flex gap-2 justify-end">
            <Button variant="secondary" onClick={() => setShowResetConfirm(false)}>
              Cancel
            </Button>
            <Button variant="danger" onClick={handleReset}>
              Reset
            </Button>
          </div>
        </Modal>
      )}
    </div>
  )
}
