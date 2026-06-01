import { useState } from 'react'
import { Button } from '../shared/Button'

interface Props {
  feedId: string
  currentContent: string
  editedContent: string
}

interface PreviewResult {
  articleTitle: string
  oldPriority: string | null
  newPriority: string
  oldStatus: string
  newStatus: string
  explanation: string
}

export function SkillPreview({ currentContent, editedContent }: Props): JSX.Element {
  const [results, setResults] = useState<PreviewResult[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const hasChanges = currentContent !== editedContent

  const runPreview = async (): Promise<void> => {
    setIsLoading(true)
    setError(null)

    try {
      // For now, use placeholder articles — in Phase 8+ these come from the articles table
      const sampleArticles = [
        { title: 'Sample: Security patch released', content: 'Critical security vulnerability fixed in latest release.' },
        { title: 'Sample: New feature announcement', content: 'Introducing dark mode support and improved search.' },
        { title: 'Sample: Quarterly update', content: 'Routine maintenance and minor bug fixes for Q1.' }
      ]

      const response = await window.electronAPI.skillPreview({
        oldSkill: currentContent,
        newSkill: editedContent,
        articles: sampleArticles
      }) as { success: boolean; results?: PreviewResult[]; error?: string }

      if (response.success && response.results) {
        setResults(response.results)
      } else {
        setError(response.error ?? 'Preview failed')
      }
    } catch (err) {
      setError(String(err))
    } finally {
      setIsLoading(false)
    }
  }

  const priorityColor = (p: string | null): string => {
    if (!p) return 'text-gray-400'
    switch (p.toUpperCase()) {
      case 'HIGH': return 'text-red-500'
      case 'MEDIUM': return 'text-amber-500'
      case 'LOW': return 'text-green-500'
      default: return 'text-gray-400'
    }
  }

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <div className="flex items-center gap-3 mb-4">
        <Button onClick={runPreview} disabled={isLoading || !hasChanges} size="sm">
          {isLoading ? 'Running preview...' : 'Run Impact Preview'}
        </Button>
        {!hasChanges && (
          <span className="text-sm text-gray-400 dark:text-gray-500">
            Edit the SKILL.md first to see how changes affect article handling.
          </span>
        )}
      </div>

      {error && (
        <div className="mb-3 p-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-700 dark:text-red-300">
          {error}
        </div>
      )}

      {results.length > 0 ? (
        <div className="flex-1 overflow-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-gray-50 dark:bg-gray-800">
              <tr className="border-b border-gray-200 dark:border-gray-700">
                <th className="text-left py-2 px-3 font-medium text-gray-500">Article</th>
                <th className="text-center py-2 px-3 font-medium text-gray-500">Old Priority</th>
                <th className="text-center py-2 px-3 font-medium text-gray-500">New Priority</th>
                <th className="text-center py-2 px-3 font-medium text-gray-500">Old Status</th>
                <th className="text-center py-2 px-3 font-medium text-gray-500">New Status</th>
                <th className="text-left py-2 px-3 font-medium text-gray-500">Explanation</th>
              </tr>
            </thead>
            <tbody>
              {results.map((r, i) => {
                const changed = r.oldPriority !== r.newPriority || r.oldStatus !== r.newStatus
                return (
                  <tr
                    key={i}
                    className={`border-b border-gray-100 dark:border-gray-700 ${
                      changed ? 'bg-amber-50/50 dark:bg-amber-900/10' : ''
                    }`}
                  >
                    <td className="py-2 px-3 font-medium">{r.articleTitle}</td>
                    <td className={`py-2 px-3 text-center font-mono text-xs ${priorityColor(r.oldPriority)}`}>
                      {r.oldPriority ?? '—'}
                    </td>
                    <td className={`py-2 px-3 text-center font-mono text-xs ${priorityColor(r.newPriority)}`}>
                      {r.newPriority}
                    </td>
                    <td className="py-2 px-3 text-center text-xs">{r.oldStatus}</td>
                    <td className={`py-2 px-3 text-center text-xs ${
                      r.newStatus === 'filtered' ? 'text-red-400' : ''
                    }`}>
                      {r.newStatus}
                    </td>
                    <td className="py-2 px-3 text-xs text-gray-500 dark:text-gray-400">
                      {r.explanation}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      ) : !isLoading ? (
        <div className="flex-1 flex items-center justify-center text-gray-400 dark:text-gray-500">
          <div className="text-center">
            <p className="text-sm">No preview results yet.</p>
            <p className="text-xs mt-1">
              Make changes to the SKILL.md and click "Run Impact Preview" to see how articles would be affected.
            </p>
          </div>
        </div>
      ) : null}
    </div>
  )
}
