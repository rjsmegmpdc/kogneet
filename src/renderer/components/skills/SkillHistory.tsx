import { useState, useEffect } from 'react'
import type { SkillVersion } from '../../../main/types'
import { Button } from '../shared/Button'

interface Props {
  feedId: string
  onRollback: (version: number) => void
}

export function SkillHistory({ feedId, onRollback }: Props): JSX.Element {
  const [history, setHistory] = useState<SkillVersion[]>([])
  const [expandedVersion, setExpandedVersion] = useState<number | null>(null)

  useEffect(() => {
    window.electronAPI.skillGetHistory(feedId).then((result) => {
      setHistory(result as SkillVersion[])
    })
  }, [feedId])

  const formatDate = (iso: string): string => {
    const d = new Date(iso)
    return d.toLocaleDateString(undefined, {
      month: 'short', day: 'numeric', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    })
  }

  if (history.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-gray-400 dark:text-gray-500 text-sm">
        No version history yet.
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-auto">
      <div className="space-y-2">
        {history.map((v, i) => {
          const isLatest = i === 0
          const isExpanded = expandedVersion === v.version

          return (
            <div
              key={v.version}
              className={`border rounded-lg transition-colors ${
                isLatest
                  ? 'border-[var(--accent-500)]/30 bg-[var(--accent-500)]/5'
                  : 'border-gray-200 dark:border-gray-700'
              }`}
            >
              {/* Header */}
              <div
                className="flex items-center gap-3 px-4 py-3 cursor-pointer"
                onClick={() => setExpandedVersion(isExpanded ? null : v.version)}
              >
                {/* Version badge */}
                <span className={`px-2 py-0.5 rounded text-xs font-mono font-bold ${
                  isLatest
                    ? 'bg-[var(--accent-500)] text-white'
                    : 'bg-gray-200 dark:bg-gray-600 text-gray-600 dark:text-gray-300'
                }`}>
                  v{v.version}
                </span>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-gray-700 dark:text-gray-200 truncate">
                    {v.diffSummary || v.instruction || 'No description'}
                  </div>
                  {v.instruction && v.diffSummary && (
                    <div className="text-xs text-gray-400 dark:text-gray-500 truncate mt-0.5">
                      Instruction: {v.instruction}
                    </div>
                  )}
                </div>

                {/* Date */}
                <span className="text-xs text-gray-400 dark:text-gray-500 shrink-0">
                  {formatDate(v.createdAt)}
                </span>

                {/* Actions */}
                {!isLatest && (
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={(e) => {
                      e.stopPropagation()
                      onRollback(v.version)
                    }}
                  >
                    Rollback
                  </Button>
                )}

                {/* Expand chevron */}
                <svg
                  className={`w-4 h-4 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                  fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </div>

              {/* Expanded content */}
              {isExpanded && (
                <div className="px-4 pb-3 border-t border-gray-100 dark:border-gray-700">
                  <pre className="mt-2 text-xs font-mono bg-gray-50 dark:bg-gray-800 rounded-lg p-3 overflow-auto max-h-80 whitespace-pre-wrap">
                    {v.content}
                  </pre>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
