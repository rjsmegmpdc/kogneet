import { useEffect, useState } from 'react'
import { useFeedsStore } from '../../stores/feeds-store'
import { useUIStore } from '../../stores/ui-store'
import { Button } from '../shared/Button'
import { Modal } from '../shared/Modal'
import { FeedForm } from './FeedForm'
import type { Feed } from '../../../main/types'

export function FeedList(): JSX.Element {
  const { feeds, loading, loadFeeds, addFeed, updateFeed, deleteFeed, toggleFeed } = useFeedsStore()
  const { setSkillEditorFeedId, setActiveView } = useUIStore()
  const [showForm, setShowForm] = useState(false)
  const [editingFeed, setEditingFeed] = useState<Feed | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)

  useEffect(() => {
    loadFeeds()
  }, [])

  const existingCategories = [...new Set(feeds.map((f) => f.category).filter(Boolean))]

  const handleSave = async (feedData: unknown): Promise<void> => {
    const data = feedData as Feed & { id?: string }
    if (data.id) {
      await updateFeed(data as Feed)
    } else {
      await addFeed(data as Omit<Feed, 'id' | 'addedAt' | 'lastFetchedAt' | 'skillVersion'>)
    }
  }

  const handleDelete = async (id: string): Promise<void> => {
    await deleteFeed(id)
    setDeleteConfirm(null)
  }

  const formatSchedule = (feed: Feed): string => {
    const s = feed.schedule
    switch (s.type) {
      case 'interval': return `Every ${s.intervalMinutes ?? 30}m`
      case 'daily': return `Daily ${s.timeLocal ?? '08:00'}`
      case 'weekdays': return `Weekdays ${s.timeLocal ?? '08:00'}`
      case 'custom': return 'Cron'
      default: return '—'
    }
  }

  const openSkillEditor = (feedId: string): void => {
    setSkillEditorFeedId(feedId)
    setActiveView('skills')
  }

  if (loading) {
    return <div className="text-gray-500 dark:text-gray-400">Loading feeds...</div>
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold">Feeds</h2>
        <div className="flex gap-2">
          <Button onClick={() => { setEditingFeed(null); setShowForm(true) }}>Add Feed</Button>
        </div>
      </div>

      {feeds.length === 0 ? (
        <div className="text-center py-12 text-gray-400 dark:text-gray-500">
          <svg className="w-12 h-12 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12.75 19.5v-.75a7.5 7.5 0 00-7.5-7.5H4.5m0-6.75h.75c7.87 0 14.25 6.38 14.25 14.25v.75M6 18.75a.75.75 0 11-1.5 0 .75.75 0 011.5 0z" />
          </svg>
          <p className="font-medium">No feeds yet</p>
          <p className="text-sm mt-1">Add your first RSS feed to get started.</p>
        </div>
      ) : (
        <div className="overflow-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-700">
                <th className="py-2 pr-4 font-medium">Name</th>
                <th className="py-2 pr-4 font-medium">Category</th>
                <th className="py-2 pr-4 font-medium">Schedule</th>
                <th className="py-2 pr-4 font-medium">Last Fetched</th>
                <th className="py-2 pr-4 font-medium">SKILL</th>
                <th className="py-2 pr-4 font-medium">Status</th>
                <th className="py-2 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {feeds.map((feed) => (
                <tr key={feed.id}>
                  <td className="py-2.5 pr-4">
                    <div className="font-medium">{feed.name}</div>
                    <div className="text-xs text-gray-400 truncate max-w-[200px]">{feed.url}</div>
                  </td>
                  <td className="py-2.5 pr-4">
                    {feed.category ? (
                      <span className="inline-flex px-2 py-0.5 rounded-full text-xs bg-gray-100 dark:bg-gray-700">
                        {feed.category}
                      </span>
                    ) : (
                      <span className="text-gray-400">—</span>
                    )}
                  </td>
                  <td className="py-2.5 pr-4 text-gray-600 dark:text-gray-400">
                    {formatSchedule(feed)}
                  </td>
                  <td className="py-2.5 pr-4 text-gray-500 dark:text-gray-400 text-xs">
                    {feed.lastFetchedAt
                      ? new Date(feed.lastFetchedAt).toLocaleString()
                      : 'Never'}
                  </td>
                  <td className="py-2.5 pr-4">
                    {feed.skillVersion ? (
                      <button
                        onClick={() => openSkillEditor(feed.id)}
                        className="text-xs px-1.5 py-0.5 rounded bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 hover:bg-green-200 dark:hover:bg-green-900/50"
                      >
                        v{feed.skillVersion}
                      </button>
                    ) : (
                      <span className="text-xs text-gray-400">—</span>
                    )}
                  </td>
                  <td className="py-2.5 pr-4">
                    <span className={`inline-flex items-center gap-1 text-xs ${
                      feed.enabled ? 'text-green-600' : 'text-gray-400'
                    }`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${feed.enabled ? 'bg-green-500' : 'bg-gray-400'}`} />
                      {feed.enabled ? 'Active' : 'Disabled'}
                    </span>
                  </td>
                  <td className="py-2.5">
                    <div className="flex gap-1">
                      {/* Fetch Now */}
                      <button
                        onClick={async () => {
                          const r = (await window.electronAPI.fetchFeedNow(feed.id)) as { error?: string }
                          if (r?.error) alert(r.error)
                          else loadFeeds()
                        }}
                        className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700"
                        title="Fetch Now"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182" />
                        </svg>
                      </button>
                      {/* Edit */}
                      <button
                        onClick={() => { setEditingFeed(feed); setShowForm(true) }}
                        className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700"
                        title="Edit"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
                        </svg>
                      </button>
                      {/* Toggle */}
                      <button
                        onClick={() => toggleFeed(feed.id)}
                        className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700"
                        title={feed.enabled ? 'Disable' : 'Enable'}
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5.636 5.636a9 9 0 1012.728 0M12 3v9" />
                        </svg>
                      </button>
                      {/* Delete */}
                      <button
                        onClick={() => setDeleteConfirm(feed.id)}
                        className="p-1 rounded hover:bg-red-50 dark:hover:bg-red-900/20 text-red-500"
                        title="Delete"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                        </svg>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showForm && (
        <FeedForm
          feed={editingFeed}
          existingCategories={existingCategories}
          onSave={handleSave}
          onClose={() => { setShowForm(false); setEditingFeed(null) }}
        />
      )}

      {deleteConfirm && (
        <Modal title="Delete feed?" onClose={() => setDeleteConfirm(null)}>
          <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
            This will remove the feed, its SKILL.md, articles, and reasoning log.
          </p>
          <div className="flex gap-2 justify-end">
            <Button variant="secondary" onClick={() => setDeleteConfirm(null)}>Cancel</Button>
            <Button variant="danger" onClick={() => handleDelete(deleteConfirm)}>Delete</Button>
          </div>
        </Modal>
      )}
    </div>
  )
}
