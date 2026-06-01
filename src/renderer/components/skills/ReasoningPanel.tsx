import { useState, useEffect } from 'react'
import type { ReasoningEntry } from '../../../main/types'

interface Props {
  articleId: string
}

export function ReasoningPanel({ articleId }: Props): JSX.Element {
  const [entries, setEntries] = useState<ReasoningEntry[]>([])

  useEffect(() => {
    window.electronAPI.reasoningGetForArticle(articleId).then((result) => {
      setEntries(result as ReasoningEntry[])
    })
  }, [articleId])

  if (entries.length === 0) {
    return (
      <div className="text-sm text-gray-400 dark:text-gray-500 py-2">
        No reasoning log for this article yet.
      </div>
    )
  }

  const decisionLabel = (d: string): { text: string; color: string } => {
    switch (d) {
      case 'surfaced': return { text: 'Surfaced', color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' }
      case 'filtered': return { text: 'Filtered', color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' }
      case 'priority_changed': return { text: 'Priority Changed', color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' }
      default: return { text: d, color: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300' }
    }
  }

  return (
    <div className="space-y-3">
      {entries.map((entry) => {
        const badge = decisionLabel(entry.decision)
        return (
          <div
            key={entry.id}
            className="border border-gray-200 dark:border-gray-700 rounded-lg p-3"
          >
            <div className="flex items-center gap-2 mb-2">
              <span className={`px-2 py-0.5 rounded text-xs font-medium ${badge.color}`}>
                {badge.text}
              </span>
              {entry.priority && (
                <span className={`text-xs font-mono ${
                  entry.priority === 'high' ? 'text-red-500' :
                  entry.priority === 'medium' ? 'text-amber-500' :
                  'text-green-500'
                }`}>
                  {entry.priority.toUpperCase()}
                </span>
              )}
              <span className="text-xs text-gray-400 dark:text-gray-500 ml-auto">
                SKILL v{entry.skillVersion}
              </span>
            </div>

            <p className="text-sm text-gray-700 dark:text-gray-300">
              {entry.explanation}
            </p>

            {entry.signals.length > 0 && (
              <div className="flex gap-1 flex-wrap mt-2">
                {entry.signals.map((signal, i) => (
                  <span
                    key={i}
                    className="px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-700 text-xs text-gray-500 dark:text-gray-400"
                  >
                    {signal}
                  </span>
                ))}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
