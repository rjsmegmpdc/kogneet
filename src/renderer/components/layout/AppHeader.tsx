import { useUIStore } from '../../stores/ui-store'

export function AppHeader(): JSX.Element {
  const { activeView } = useUIStore()

  const titles: Record<string, string> = {
    digest: 'Digest',
    skills: 'SKILL.md Editor',
    feeds: 'Feeds',
    social: 'Social Publishing',
    subscribers: 'Subscribers',
    logs: 'Activity Log',
    settings: 'Settings'
  }

  return (
    <header className="h-12 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 flex items-center px-4 shrink-0">
      <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-200">
        {titles[activeView] ?? activeView}
      </h2>
    </header>
  )
}
