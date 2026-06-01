import { useState } from 'react'
import { useSettingsStore } from '../../stores/settings-store'
import { ReasoningPanel } from '../skills/ReasoningPanel'

interface Article {
  id: string
  feedId: string
  title: string
  link: string
  summary: string | null
  priority: 'high' | 'medium' | 'low' | null
  status: string
  publishedAt: string | null
  fetchedAt: string
  feedName: string
  metadata: Record<string, string>
}

interface Props {
  article: Article
}

const urgencyColors = {
  high: 'border-red-500 bg-red-50 dark:bg-red-900/10',
  medium: 'border-amber-500 bg-amber-50 dark:bg-amber-900/10',
  low: 'border-green-500 bg-green-50 dark:bg-green-900/10'
}

const urgencyDots = {
  high: 'bg-red-500',
  medium: 'bg-amber-500',
  low: 'bg-green-500'
}

export function DigestCard({ article }: Props): JSX.Element {
  const settings = useSettingsStore((s) => s.settings)
  const density = settings?.display.cardDensity ?? 'comfortable'
  const showUrl = settings?.display.showSourceUrlOnCard ?? false
  const [showReasoning, setShowReasoning] = useState(false)

  const priority = article.priority ?? 'low'
  const isNew = article.status === 'new'
  const isChanged = article.status === 'changed'

  const handleTitleClick = (): void => {
    if (article.link) window.open(article.link, '_blank')
  }

  if (density === 'compact') {
    return (
      <div className="flex items-center gap-3 py-2 px-3 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg">
        <span className={`w-2 h-2 rounded-full shrink-0 ${urgencyDots[priority]}`} />
        <button onClick={handleTitleClick} className="text-sm font-medium hover:text-[var(--accent-500)] truncate text-left">
          {article.title}
        </button>
        <span className="text-xs text-gray-400 shrink-0">{article.feedName}</span>
        {isNew && <span className="text-[10px] text-blue-500 font-medium shrink-0">NEW</span>}
        {isChanged && <span className="text-[10px] text-orange-500 font-medium shrink-0">CHANGED</span>}
        <button onClick={() => setShowReasoning(!showReasoning)} className="text-[10px] text-gray-400 hover:text-[var(--accent-500)] shrink-0">
          Why?
        </button>
      </div>
    )
  }

  return (
    <div className={`border-l-3 rounded-lg p-4 mb-3 ${urgencyColors[priority]}`}>
      <div className="flex items-start justify-between gap-2 mb-1">
        <button
          onClick={handleTitleClick}
          className="text-sm font-semibold hover:text-[var(--accent-500)] text-left leading-snug"
        >
          {article.title}
        </button>
        <div className="flex gap-1 shrink-0">
          {isNew && (
            <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
              NEW
            </span>
          )}
          {isChanged && (
            <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400">
              CHANGED
            </span>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 mb-2 flex-wrap">
        <span>{article.feedName}</span>
        {article.metadata?.categories && (
          <span className="inline-flex px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-700">
            {article.metadata.categories.split(',')[0]?.trim()}
          </span>
        )}
        {article.publishedAt && (
          <span>{new Date(article.publishedAt).toLocaleDateString()}</span>
        )}
        <button
          onClick={() => setShowReasoning(!showReasoning)}
          className="text-[10px] text-[var(--accent-500)] hover:underline ml-auto"
        >
          {showReasoning ? 'Hide reasoning' : 'Why?'}
        </button>
      </div>

      {article.summary ? (
        <p className={`text-sm text-gray-700 dark:text-gray-300 ${density === 'comfortable' ? 'line-clamp-2' : ''}`}>
          {article.summary}
        </p>
      ) : (
        <p className="text-sm text-gray-400 italic">
          Not yet enriched by AI
        </p>
      )}

      {showUrl && article.link && (
        <p className="text-xs text-gray-400 mt-1 truncate">{article.link}</p>
      )}

      {showReasoning && (
        <div className="mt-3 border-t border-gray-200 dark:border-gray-700 pt-3">
          <ReasoningPanel articleId={article.id} />
        </div>
      )}
    </div>
  )
}
