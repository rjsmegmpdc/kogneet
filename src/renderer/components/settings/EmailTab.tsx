import { useSettingsStore } from '../../stores/settings-store'
import { TextInput } from '../shared/TextInput'
import { TimePicker } from '../shared/TimePicker'
import { Toggle } from '../shared/Toggle'

export function EmailTab(): JSX.Element {
  const { settings, updateSetting } = useSettingsStore()
  if (!settings) return <div>Loading...</div>

  return (
    <div className="divide-y divide-gray-100 dark:divide-gray-700">
      <TextInput
        label="Sender display name"
        description="Name shown in the From field of digest emails"
        value={settings.email.senderDisplayName}
        onChange={(v) => updateSetting('email.senderDisplayName', v)}
      />

      <TextInput
        label="Sender email address"
        description="Defaults to your SMTP username if left blank"
        value={settings.email.senderEmail}
        onChange={(v) => updateSetting('email.senderEmail', v)}
        type="email"
      />

      <TextInput
        label="Reply-to address"
        description="Where subscriber replies go (leave blank to use sender address)"
        value={settings.email.replyTo}
        onChange={(v) => updateSetting('email.replyTo', v)}
        type="email"
      />

      <TimePicker
        label="Daily send time"
        description="When to automatically send the digest email"
        value={settings.email.sendTimeLocal}
        onChange={(v) => updateSetting('email.sendTimeLocal', v)}
      />

      <Toggle
        label="Send even if no items"
        description="Send the digest email even when there are no new items for the day"
        checked={settings.email.sendIfNoItems}
        onChange={(v) => updateSetting('email.sendIfNoItems', v)}
      />

      <Toggle
        label="Enable unsubscribe processing"
        description="Poll IMAP inbox for unsubscribe and manage-subscription emails"
        checked={settings.email.unsubscribeEnabled}
        onChange={(v) => updateSetting('email.unsubscribeEnabled', v)}
      />

      <div className="py-4">
        <p className="text-xs text-gray-400 dark:text-gray-500">
          SMTP and IMAP server configuration will be available in the next phase.
        </p>
      </div>
    </div>
  )
}
