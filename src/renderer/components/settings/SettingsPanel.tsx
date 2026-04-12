import { useState } from 'react'
import { GeneralTab } from './GeneralTab'
import { AppearanceTab } from './AppearanceTab'
import { AIKeysTab } from './AIKeysTab'
import { EmailTab } from './EmailTab'
import { NotificationsTab } from './NotificationsTab'
import { DisplayTab } from './DisplayTab'
import { DataStorageTab } from './DataStorageTab'

type TabId = 'general' | 'appearance' | 'aikeys' | 'email' | 'notifications' | 'display' | 'data'

const tabs: { id: TabId; label: string }[] = [
  { id: 'general', label: 'General' },
  { id: 'appearance', label: 'Appearance' },
  { id: 'aikeys', label: 'AI Keys' },
  { id: 'email', label: 'Email' },
  { id: 'notifications', label: 'Notifications' },
  { id: 'display', label: 'Display' },
  { id: 'data', label: 'Data & Storage' }
]

const tabComponents: Record<TabId, () => JSX.Element> = {
  general: GeneralTab,
  appearance: AppearanceTab,
  aikeys: AIKeysTab,
  email: EmailTab,
  notifications: NotificationsTab,
  display: DisplayTab,
  data: DataStorageTab
}

export function SettingsPanel(): JSX.Element {
  const [activeTab, setActiveTab] = useState<TabId>('general')

  const ActiveComponent = tabComponents[activeTab]

  return (
    <div className="h-full flex flex-col">
      {/* Tab bar */}
      <div className="flex gap-1 mb-6 border-b border-gray-200 dark:border-gray-700">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab.id
                ? 'border-[var(--accent-500)] text-[var(--accent-600)] dark:text-[var(--accent-400)]'
                : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-auto max-w-2xl">
        <ActiveComponent />
      </div>
    </div>
  )
}
