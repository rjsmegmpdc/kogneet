import { useSettingsStore } from '../../stores/settings-store'
import { ButtonGroup } from '../shared/ButtonGroup'
import { Select } from '../shared/Select'
import { Toggle } from '../shared/Toggle'

export function DisplayTab(): JSX.Element {
  const { settings, updateSetting } = useSettingsStore()
  if (!settings) return <div>Loading...</div>

  return (
    <div className="divide-y divide-gray-100 dark:divide-gray-700">
      <ButtonGroup
        label="Card density"
        value={settings.display.cardDensity}
        options={[
          { value: 'compact', label: 'Compact' },
          { value: 'comfortable', label: 'Comfortable' },
          { value: 'spacious', label: 'Spacious' }
        ]}
        onChange={(v) => updateSetting('display.cardDensity', v)}
      />

      <Select
        label="Default sort"
        value={settings.display.defaultSort}
        options={[
          { value: 'urgency', label: 'Urgency first' },
          { value: 'newest', label: 'Newest first' },
          { value: 'feedOrder', label: 'Feed order' },
          { value: 'category', label: 'Category' }
        ]}
        onChange={(v) => updateSetting('display.defaultSort', v)}
      />

      <Toggle
        label="Show source URL on card"
        checked={settings.display.showSourceUrlOnCard}
        onChange={(v) => updateSetting('display.showSourceUrlOnCard', v)}
      />

      <Toggle
        label="Expand learning items by default"
        description="AI-enriched insights are expanded when the digest loads"
        checked={settings.display.expandLearningByDefault}
        onChange={(v) => updateSetting('display.expandLearningByDefault', v)}
      />

      <Toggle
        label="Group cards by category"
        checked={settings.display.groupByCategory}
        onChange={(v) => updateSetting('display.groupByCategory', v)}
      />

      <Select
        label="Date format"
        value={settings.display.dateFormat}
        options={[
          { value: 'DD/MM/YYYY', label: 'DD/MM/YYYY' },
          { value: 'MM/DD/YYYY', label: 'MM/DD/YYYY' },
          { value: 'YYYY-MM-DD', label: 'YYYY-MM-DD' }
        ]}
        onChange={(v) => updateSetting('display.dateFormat', v)}
      />

      <Select
        label="Time format"
        value={settings.display.timeFormat}
        options={[
          { value: '12h', label: '12-hour' },
          { value: '24h', label: '24-hour' }
        ]}
        onChange={(v) => updateSetting('display.timeFormat', v)}
      />
    </div>
  )
}
