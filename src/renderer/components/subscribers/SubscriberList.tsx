import { useEffect, useState } from 'react'
import type { Subscriber } from '../../../main/types'
import { Button } from '../shared/Button'
import { Modal } from '../shared/Modal'
import { SubscriberForm } from './SubscriberForm'

export function SubscriberList(): JSX.Element {
  const [subscribers, setSubscribers] = useState<Subscriber[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Subscriber | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)
  const [sendingWelcome, setSendingWelcome] = useState<string | null>(null)

  const load = async (): Promise<void> => {
    const subs = (await window.electronAPI.getSubscribers()) as Subscriber[]
    setSubscribers(subs)
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const handleSave = async (data: unknown): Promise<void> => {
    const d = data as Subscriber & { id?: string }
    if (d.id) {
      await window.electronAPI.updateSubscriber(d)
    } else {
      const result = (await window.electronAPI.addSubscriber(d as { name: string; email: string; feedIds?: string[] })) as {
        error?: string
      }
      if (result?.error) {
        alert(result.error)
        return
      }
    }
    await load()
  }

  const handleDelete = async (id: string): Promise<void> => {
    await window.electronAPI.deleteSubscriber(id)
    setDeleteConfirm(null)
    await load()
  }

  const handleToggle = async (id: string): Promise<void> => {
    await window.electronAPI.toggleSubscriber(id)
    await load()
  }

  const handleSendWelcome = async (sub: Subscriber): Promise<void> => {
    setSendingWelcome(sub.id)
    try {
      const result = (await window.electronAPI.sendWelcomeEmail(sub.id)) as {
        success?: boolean; error?: string
      }
      if (result?.success) alert(`Welcome email sent to ${sub.email}`)
      else alert(`Failed: ${result?.error ?? 'Unknown error'}`)
    } catch (err) {
      alert(`Failed: ${err}`)
    } finally {
      setSendingWelcome(null)
    }
  }

  if (loading) return <div className="text-gray-500">Loading subscribers...</div>

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold">Subscribers</h2>
        <Button onClick={() => { setEditing(null); setShowForm(true) }}>Add Subscriber</Button>
      </div>

      {subscribers.length === 0 ? (
        <div className="text-center py-12 text-gray-400 dark:text-gray-500">
          <p className="font-medium">No subscribers yet</p>
          <p className="text-sm mt-1">Add subscribers to send them digest emails.</p>
        </div>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-700">
              <th className="py-2 pr-4 font-medium">Name</th>
              <th className="py-2 pr-4 font-medium">Email</th>
              <th className="py-2 pr-4 font-medium">Feeds</th>
              <th className="py-2 pr-4 font-medium">Added</th>
              <th className="py-2 pr-4 font-medium">Status</th>
              <th className="py-2 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
            {subscribers.map((sub) => (
              <tr key={sub.id}>
                <td className="py-2.5 pr-4 font-medium">{sub.name}</td>
                <td className="py-2.5 pr-4 text-gray-600 dark:text-gray-400">{sub.email}</td>
                <td className="py-2.5 pr-4">
                  {sub.feedIds.length > 0 ? (
                    <span className="text-xs text-gray-500">{sub.feedIds.length} feeds</span>
                  ) : (
                    <span className="text-xs text-gray-400">All feeds</span>
                  )}
                </td>
                <td className="py-2.5 pr-4 text-xs text-gray-500">
                  {new Date(sub.addedAt).toLocaleDateString()}
                </td>
                <td className="py-2.5 pr-4">
                  <span className={`text-xs ${sub.enabled ? 'text-green-600' : 'text-gray-400'}`}>
                    {sub.enabled ? 'Active' : 'Disabled'}
                  </span>
                </td>
                <td className="py-2.5">
                  <div className="flex gap-1">
                    <button
                      onClick={() => handleSendWelcome(sub)}
                      disabled={sendingWelcome === sub.id}
                      className="p-1 rounded hover:bg-blue-50 dark:hover:bg-blue-900/20 text-blue-600 dark:text-blue-400 text-xs disabled:opacity-50"
                    >
                      {sendingWelcome === sub.id ? '...' : 'Test'}
                    </button>
                    <button
                      onClick={() => { setEditing(sub); setShowForm(true) }}
                      className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-xs"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleToggle(sub.id)}
                      className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-xs"
                    >
                      {sub.enabled ? 'Disable' : 'Enable'}
                    </button>
                    <button
                      onClick={() => setDeleteConfirm(sub.id)}
                      className="p-1 rounded hover:bg-red-50 dark:hover:bg-red-900/20 text-red-500 text-xs"
                    >
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {showForm && (
        <SubscriberForm
          subscriber={editing}
          onSave={handleSave}
          onClose={() => { setShowForm(false); setEditing(null) }}
        />
      )}

      {deleteConfirm && (
        <Modal title="Delete subscriber?" onClose={() => setDeleteConfirm(null)}>
          <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
            This subscriber will no longer receive digest emails.
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
