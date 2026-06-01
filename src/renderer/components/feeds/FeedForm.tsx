import { useState } from 'react'
import type { Feed, FeedSchedule } from '../../../main/types'
import { Modal } from '../shared/Modal'
import { Button } from '../shared/Button'
import { SchedulePicker } from './SchedulePicker'

interface Props {
  feed?: Feed | null
  existingCategories: string[]
  onSave: (feed: Omit<Feed, 'id' | 'addedAt' | 'lastFetchedAt' | 'skillVersion'> | Feed) => Promise<void>
  onClose: () => void
}

export function FeedForm({ feed, existingCategories, onSave, onClose }: Props): JSX.Element {
  const [url, setUrl] = useState(feed?.url ?? '')
  const [name, setName] = useState(feed?.name ?? '')
  const [category, setCategory] = useState(feed?.category ?? '')
  const [schedule, setSchedule] = useState<FeedSchedule>(
    feed?.schedule ?? { type: 'daily', timeLocal: '08:00' }
  )
  const [enabled, setEnabled] = useState(feed?.enabled ?? true)
  const [validating, setValidating] = useState(false)
  const [validation, setValidation] = useState<{ valid: boolean; error?: string } | null>(null)
  const [saving, setSaving] = useState(false)

  const handleValidate = async (): Promise<void> => {
    setValidating(true)
    setValidation(null)
    const result = (await window.electronAPI.validateFeedUrl(url)) as {
      valid: boolean; title?: string; itemCount?: number; error?: string
    }
    setValidation(result)
    if (result.valid && result.title && !name) {
      setName(result.title)
    }
    setValidating(false)
  }

  const handleSave = async (): Promise<void> => {
    if (!url.trim() || !name.trim()) return
    setSaving(true)

    if (feed) {
      await onSave({ ...feed, url, name, category, schedule, enabled })
    } else {
      await onSave({ url, name, category, sourceType: 'rss', schedule, enabled } as Omit<Feed, 'id' | 'addedAt' | 'lastFetchedAt' | 'skillVersion'>)
    }
    setSaving(false)
    onClose()
  }

  return (
    <Modal title={feed ? 'Edit Feed' : 'Add Feed'} onClose={onClose}>
      <div className="space-y-4">
        <div>
          <label className="text-sm font-medium mb-1 block">Feed URL</label>
          <div className="flex gap-2">
            <input
              type="url"
              value={url}
              onChange={(e) => { setUrl(e.target.value); setValidation(null) }}
              onBlur={() => { if (url && !validation) handleValidate() }}
              placeholder="https://example.com/feed.xml"
              className="flex-1 px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm"
            />
            <Button variant="secondary" size="sm" onClick={handleValidate} disabled={!url || validating}>
              {validating ? '...' : 'Validate'}
            </Button>
          </div>
          {validation && (
            <p className={`text-xs mt-1 ${validation.valid ? 'text-green-500' : 'text-red-500'}`}>
              {validation.valid ? 'Valid RSS feed' : validation.error ?? 'Invalid feed'}
            </p>
          )}
        </div>

        <div>
          <label className="text-sm font-medium mb-1 block">Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Feed name"
            className="w-full px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm"
          />
        </div>

        <div>
          <label className="text-sm font-medium mb-1 block">Category</label>
          <input
            type="text"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            placeholder="e.g. Technology, Business"
            list="feed-categories"
            className="w-full px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm"
          />
          <datalist id="feed-categories">
            {existingCategories.map((c) => (
              <option key={c} value={c} />
            ))}
          </datalist>
        </div>

        <SchedulePicker value={schedule} onChange={setSchedule} />

        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={enabled}
            onChange={(e) => setEnabled(e.target.checked)}
            className="rounded"
          />
          <span className="text-sm">Enabled</span>
        </label>

        <div className="flex gap-2 justify-end pt-2">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave} disabled={!url.trim() || !name.trim() || saving}>
            {saving ? 'Saving...' : feed ? 'Update' : 'Add Feed'}
          </Button>
        </div>
      </div>
    </Modal>
  )
}
