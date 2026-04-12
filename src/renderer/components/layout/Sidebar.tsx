import { useUIStore, type ActiveView } from '../../stores/ui-store'

interface NavItem {
  id: ActiveView
  label: string
  icon: string
}

const navItems: NavItem[] = [
  { id: 'digest', label: 'Digest', icon: '📰' },
  { id: 'skills', label: 'Skills', icon: '🧠' },
  { id: 'feeds', label: 'Feeds', icon: '📡' },
  { id: 'social', label: 'Social', icon: '💬' },
  { id: 'subscribers', label: 'Subscribers', icon: '👥' },
  { id: 'logs', label: 'Logs', icon: '📋' },
  { id: 'settings', label: 'Settings', icon: '⚙️' }
]

export function Sidebar(): JSX.Element {
  const { activeView, setActiveView } = useUIStore()

  return (
    <aside className="w-56 bg-gray-50 dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex flex-col">
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <h1 className="text-lg font-bold text-accent-600 dark:text-accent-400">Kogneet</h1>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Content Intelligence</p>
      </div>

      <nav className="flex-1 py-2">
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setActiveView(item.id)}
            className={`w-full text-left px-4 py-2.5 flex items-center gap-3 text-sm transition-colors ${
              activeView === item.id
                ? 'bg-accent-500/10 text-accent-600 dark:text-accent-400 font-medium border-r-2 border-accent-500'
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
            }`}
          >
            <span className="text-base">{item.icon}</span>
            {item.label}
          </button>
        ))}
      </nav>

      <div className="p-3 border-t border-gray-200 dark:border-gray-700">
        <p className="text-xs text-gray-400 dark:text-gray-500">v2.0.0</p>
      </div>
    </aside>
  )
}
