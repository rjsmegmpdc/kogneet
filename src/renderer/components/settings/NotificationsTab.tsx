import { useSettingsStore } from '../../stores/settings-store'
import { Toggle } from '../shared/Toggle'

const notificationEvents = [
  { key: 'fetchComplete', label: 'Fetch completed successfully', description: 'When a feed fetch finishes without errors' },
  { key: 'fetchError', label: 'Fetch error', description: 'When a feed fetch fails' },
  { key: 'coworkComplete', label: 'Cowork processing complete', description: 'When batch AI enrichment finishes' },
  { key: 'emailSent', label: 'Email digest sent', description: 'When the daily email is successfully sent' },
  { key: 'emailFailed', label: 'Email send failure', description: 'When email delivery fails' },
  { key: 'changedItemsDetected', label: 'New/changed items detected', description: 'When content changes are found in a feed' }
] as const

export function NotificationsTab(): JSX.Element {
  const { settings, updateSetting } = useSettingsStore()
  if (!settings) return <div>Loading...</div>

  return (
    <div>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
        All notifications use Windows native toast notifications.
      </p>
      <div className="divide-y divide-gray-100 dark:divide-gray-700">
        {notificationEvents.map((event) => (
          <Toggle
            key={event.key}
            label={event.label}
            description={event.description}
            checked={settings.notifications[event.key]}
            onChange={(v) => updateSetting(`notifications.${event.key}`, v)}
          />
        ))}
      </div>
    </div>
  )
}
