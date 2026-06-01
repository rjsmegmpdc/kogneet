import { useEffect, useState } from 'react'
import type { Feed, Subscriber } from '../../../main/types'
import { Modal } from '../shared/Modal'
import { Button } from '../shared/Button'

interface Props {
  subscriber?: Subscriber | null
  onSave: (data: { name: string; email: string; feedIds: string[] } | Subscriber) => Promise<void>
  onClose: () => void
}

export function SubscriberForm({ subscriber, onSave, onClose }: Props): JSX.Element {
  const [name, setName] = useState(subscriber?.name ?? '')
  const [email, setEmail] = useState(subscriber?.email ?? '')
  const [feedIds, setFeedIds] = useState<string[]>(subscriber?.feedIds ?? [])
  const [feeds, setFeeds] = useState<Feed[]>([])
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    window.electronAPI.getFeeds().then((f) => {
      setFeeds((f as Feed[]).filter((fd) => fd.enabled))
    })
  }, [])

  const validateEmail = (e: string): boolean => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)

  const toggleFeed = (feedId: string): void => {
    setFeedIds((prev) =>
      prev.includes(feedId) ? prev.filter((f) => f !== feedId) : [...prev, feedId]
    )
  }

  const handleSave = async (): Promise<void> => {
    if (!name.trim()) { setError('Name is required'); return }
    if (!validateEmail(email)) { setError('Invalid email address'); return }

    setSaving(true)
    if (subscriber) {
      await onSave({ ...subscriber, name, email, feedIds })
    } else {
      await onSave({ name, email, feedIds })
    }
    setSaving(false)
    onClose()
  }

  return (
    <Modal title={subscriber ? 'Edit Subscriber' : 'Add Subscriber'} onClose={onClose}>
      <div className="space-y-4">
        <div>
          <label className="text-sm font-medium mb-1 block">Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => { setName(e.target.value); setError('') }}
            className="w-full px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm"
            placeholder="Full name"
          />
        </div>
        <div>
          <label className="text-sm font-medium mb-1 block">Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => { setEmail(e.target.value); setError('') }}
            className="w-full px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm"
            placeholder="you@example.com"
          />
        </div>

        <div>
          <label className="text-sm font-medium mb-2 block">Feed Subscriptions</label>
          {feeds.length === 0 ? (
            <p className="text-xs text-gray-400">No active feeds available.</p>
          ) : (
            <div className="space-y-1.5 max-h-48 overflow-y-auto">
              {feeds.map((feed) => (
                <label
                  key={feed.id}
                  className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={feedIds.includes(feed.id)}
                    onChange={() => toggleFeed(feed.id)}
                    className="rounded"
                  />
                  <span className="text-sm">{feed.name}</span>
                  {feed.category && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-700 text-gray-500">
                      {feed.category}
                    </span>
                  )}
                </label>
              ))}
            </div>
          )}
          <p className="text-xs text-gray-400 mt-1">
            Leave empty to receive all feeds.
          </p>
        </div>

        {error && <p className="text-sm text-red-500">{error}</p>}
        <div className="flex gap-2 justify-end pt-2">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : subscriber ? 'Update' : 'Add'}
          </Button>
        </div>
      </div>
    </Modal>
  )
}
