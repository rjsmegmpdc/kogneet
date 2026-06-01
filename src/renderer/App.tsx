import { useEffect, useState } from 'react'
import { useSettingsStore } from './stores/settings-store'
import { useUIStore } from './stores/ui-store'
import { Sidebar } from './components/layout/Sidebar'
import { AppHeader } from './components/layout/AppHeader'
import { FirstLaunchWizard } from './components/wizard/FirstLaunchWizard'
import { SettingsPanel } from './components/settings/SettingsPanel'
import { SkillEditor } from './components/skills/SkillEditor'
import { FeedList } from './components/feeds/FeedList'

export function App(): JSX.Element {
  const [isFirstLaunch, setIsFirstLaunch] = useState<boolean | null>(null)
  const { loadSettings } = useSettingsStore()
  const { activeView } = useUIStore()

  useEffect(() => {
    window.electronAPI.isFirstLaunch().then(setIsFirstLaunch)
  }, [])

  useEffect(() => {
    if (isFirstLaunch === false) {
      loadSettings()
    }
  }, [isFirstLaunch, loadSettings])

  // Loading state
  if (isFirstLaunch === null) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="animate-pulse text-gray-400">Loading...</div>
      </div>
    )
  }

  // First launch wizard
  if (isFirstLaunch) {
    return (
      <FirstLaunchWizard
        onComplete={() => {
          loadSettings()
          setIsFirstLaunch(false)
        }}
      />
    )
  }

  // Main app
  return (
    <div className="h-screen flex overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <AppHeader />
        <main className="flex-1 overflow-auto p-6">
          {activeView === 'digest' && <PlaceholderView name="Digest" description="Article cards with AI-powered triage, filtering, and saved configurations." />}
          {activeView === 'skills' && <SkillEditor />}
          {activeView === 'feeds' && <FeedList />}
          {activeView === 'social' && <PlaceholderView name="Social Publishing" description="AI-powered social post generation with approval queue and analytics." />}
          {activeView === 'subscribers' && <PlaceholderView name="Subscribers" description="Manage email subscribers with per-feed personalisation." />}
          {activeView === 'logs' && <PlaceholderView name="Activity Log" description="Real-time application logs and AI reasoning trail." />}
          {activeView === 'settings' && <SettingsPanel />}
        </main>
      </div>
    </div>
  )
}

function PlaceholderView({ name, description }: { name: string; description: string }): JSX.Element {
  return (
    <div className="flex items-center justify-center h-full">
      <div className="text-center max-w-md">
        <div className="w-16 h-16 rounded-2xl bg-accent-500/10 flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-accent-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M11.42 15.17L17.25 21A2.652 2.652 0 0021 17.25l-5.877-5.877M11.42 15.17l2.496-3.03c.317-.384.74-.626 1.208-.766M11.42 15.17l-4.655 5.653a2.548 2.548 0 11-3.586-3.586l6.837-5.63m5.108-.233c.55-.164 1.163-.188 1.743-.14a4.5 4.5 0 004.486-6.336l-3.276 3.277a3.004 3.004 0 01-2.25-2.25l3.276-3.276a4.5 4.5 0 00-6.336 4.486c.091 1.076-.071 2.264-.904 2.95l-.102.085" />
          </svg>
        </div>
        <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-200 mb-2">{name}</h3>
        <p className="text-sm text-gray-500 dark:text-gray-400">{description}</p>
        <p className="text-xs text-gray-400 dark:text-gray-500 mt-4">Coming in the next phase</p>
      </div>
    </div>
  )
}
