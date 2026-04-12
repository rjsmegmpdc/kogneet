import { useSettingsStore } from '../../stores/settings-store'
import { ButtonGroup } from '../shared/ButtonGroup'

export function AppearanceTab(): JSX.Element {
  const { settings, updateSetting } = useSettingsStore()
  if (!settings) return <div>Loading...</div>

  return (
    <div className="divide-y divide-gray-100 dark:divide-gray-700">
      <ButtonGroup
        label="Colour mode"
        value={settings.appearance.theme}
        options={[
          { value: 'light', label: 'Light' },
          { value: 'dark', label: 'Dark' },
          { value: 'system', label: 'System' }
        ]}
        onChange={(v) => updateSetting('appearance.theme', v)}
      />

      <div className="py-3">
        <div className="text-sm font-medium mb-2">Accent colour</div>
        <div className="flex gap-3">
          {([
            { value: 'purple', color: '#8b5cf6' },
            { value: 'teal', color: '#14b8a6' },
            { value: 'blue', color: '#3b82f6' }
          ] as const).map((opt) => (
            <button
              key={opt.value}
              onClick={() => updateSetting('appearance.accentColour', opt.value)}
              className={`w-10 h-10 rounded-full border-2 transition-all ${
                settings.appearance.accentColour === opt.value
                  ? 'border-gray-800 dark:border-white scale-110'
                  : 'border-transparent hover:scale-105'
              }`}
              style={{ backgroundColor: opt.color }}
              title={opt.value}
            />
          ))}
        </div>
      </div>

      <ButtonGroup
        label="Font size"
        value={settings.appearance.fontSize}
        options={[
          { value: 'small', label: 'Small' },
          { value: 'medium', label: 'Medium' },
          { value: 'large', label: 'Large' }
        ]}
        onChange={(v) => updateSetting('appearance.fontSize', v)}
      />
    </div>
  )
}
