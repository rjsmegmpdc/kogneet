import { useEffect, useState, useCallback } from 'react'
import { DigestCard } from './DigestCard'
import { Button } from '../shared/Button'

interface Article {
  id: string
  feedId: string
  title: string
  link: string
  content: string | null
  summary: string | null
  priority: 'high' | 'medium' | 'low' | null
  status: string
  publishedAt: string | null
  fetchedAt: string
  feedName: string
  metadata: Record<string, string>
}

interface FeedOption {
  id: string
  name: string
}

export function DigestView(): JSX.Element {
  const [articles, setArticles] = useState<Article[]>([])
  const [feedOptions, setFeedOptions] = useState<FeedOption[]>([])
  const [loading, setLoading] = useState(true)

  // Filters
  const [selectedFeed, setSelectedFeed] = useState<string>('')
  const [selectedPriority, setSelectedPriority] = useState<string>('')
  const [selectedStatus, setSelectedStatus] = useState<string>('')

  const loadArticles = useCallback(async () => {
    setLoading(true)
    const data: Record<string, unknown> = { limit: 200 }
    if (selectedFeed) data.feedId = selectedFeed
    if (selectedPriority) data.priority = selectedPriority
    if (selectedStatus) data.status = selectedStatus

    const result = (await window.electronAPI.digestGetArticles(data)) as Article[]
    setArticles(result)
    setLoading(false)
  }, [selectedFeed, selectedPriority, selectedStatus])

  useEffect(() => {
    window.electronAPI.digestGetFeedOptions().then((r) => setFeedOptions(r as FeedOption[]))
  }, [])

  useEffect(() => {
    loadArticles()
  }, [loadArticles])

  const surfacedCount = articles.filter((a) => a.status !== 'filtered').length
  const highCount = articles.filter((a) => a.priority === 'high').length

  return (
    <div className="h-full flex flex-col">
      {/* Toolbar */}
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <select
          value={selectedFeed}
          onChange={(e) => setSelectedFeed(e.target.value)}
          className="px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm"
        >
          <option value="">All feeds</option>
          {feedOptions.map((f) => (
            <option key={f.id} value={f.id}>{f.name}</option>
          ))}
        </select>

        <select
          value={selectedPriority}
          onChange={(e) => setSelectedPriority(e.target.value)}
          className="px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm"
        >
          <option value="">All priorities</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>

        <select
          value={selectedStatus}
          onChange={(e) => setSelectedStatus(e.target.value)}
          className="px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm"
        >
          <option value="">All statuses</option>
          <option value="new">New</option>
          <option value="changed">Changed</option>
          <option value="unchanged">Unchanged</option>
          <option value="filtered">Filtered</option>
        </select>

        <Button size="sm" variant="secondary" onClick={loadArticles}>
          Refresh
        </Button>

        <div className="ml-auto text-xs text-gray-400 dark:text-gray-500 flex gap-3">
          <span>{articles.length} articles</span>
          <span>{surfacedCount} surfaced</span>
          {highCount > 0 && <span className="text-red-500">{highCount} high priority</span>}
        </div>
      </div>

      {/* Articles */}
      <div className="flex-1 overflow-auto">
        {loading ? (
          <div className="flex items-center justify-center h-32">
            <div className="animate-pulse text-gray-400">Loading articles...</div>
          </div>
        ) : articles.length === 0 ? (
          <div className="flex items-center justify-center h-full text-gray-400 dark:text-gray-500">
            <div className="text-center">
              <svg className="w-12 h-12 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
              </svg>
              <p className="font-medium">No articles yet</p>
              <p className="text-sm mt-1">Add feeds and fetch them to see articles here.</p>
            </div>
          </div>
        ) : (
          <div>
            {articles.map((article) => (
              <DigestCard key={article.id} article={article} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
