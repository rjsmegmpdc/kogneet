import type { ReasoningEntry } from '../types'
import { getDb, saveToFile } from '../database'
import { log } from '../utils/logger'

/**
 * Log a reasoning decision for an article.
 */
export function logReasoning(
  articleId: string,
  feedId: string,
  skillVersion: number,
  decision: ReasoningEntry['decision'],
  priority: string | null,
  explanation: string,
  signals: string[]
): void {
  try {
    const db = getDb()
    db.run(
      `INSERT INTO reasoning_log (article_id, feed_id, skill_version, decision, priority, explanation, signals, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))`,
      [articleId, feedId, skillVersion, decision, priority, explanation, JSON.stringify(signals)]
    )
    saveToFile()
  } catch (err) {
    log('ERROR', `Failed to log reasoning for article ${articleId}: ${err}`)
  }
}

/**
 * Get reasoning entries for a specific article.
 */
export function getReasoningForArticle(articleId: string): ReasoningEntry[] {
  const db = getDb()
  const result = db.exec(
    `SELECT id, article_id, feed_id, skill_version, decision, priority, explanation, signals, created_at
     FROM reasoning_log WHERE article_id = ? ORDER BY created_at DESC`,
    [articleId]
  )

  if (result.length === 0) return []

  return result[0].values.map(mapRow)
}

/**
 * Get reasoning entries for a feed (optionally filtered by skill version).
 */
export function getReasoningForFeed(
  feedId: string,
  skillVersion?: number,
  limit = 100
): ReasoningEntry[] {
  const db = getDb()
  const query = skillVersion
    ? `SELECT id, article_id, feed_id, skill_version, decision, priority, explanation, signals, created_at
       FROM reasoning_log WHERE feed_id = ? AND skill_version = ? ORDER BY created_at DESC LIMIT ?`
    : `SELECT id, article_id, feed_id, skill_version, decision, priority, explanation, signals, created_at
       FROM reasoning_log WHERE feed_id = ? ORDER BY created_at DESC LIMIT ?`

  const params = skillVersion ? [feedId, skillVersion, limit] : [feedId, limit]
  const result = db.exec(query, params)

  if (result.length === 0) return []

  return result[0].values.map(mapRow)
}

/**
 * Get reasoning stats for a feed — how many surfaced vs filtered.
 */
export function getReasoningStats(feedId: string): {
  surfaced: number
  filtered: number
  priorityChanged: number
  total: number
} {
  const db = getDb()
  const result = db.exec(
    `SELECT decision, COUNT(*) as cnt
     FROM reasoning_log WHERE feed_id = ?
     GROUP BY decision`,
    [feedId]
  )

  const stats = { surfaced: 0, filtered: 0, priorityChanged: 0, total: 0 }
  if (result.length === 0) return stats

  for (const row of result[0].values) {
    const decision = row[0] as string
    const count = row[1] as number
    stats.total += count
    if (decision === 'surfaced') stats.surfaced = count
    else if (decision === 'filtered') stats.filtered = count
    else if (decision === 'priority_changed') stats.priorityChanged = count
  }

  return stats
}

function mapRow(row: unknown[]): ReasoningEntry {
  let signals: string[] = []
  try {
    signals = JSON.parse(row[7] as string)
  } catch {
    signals = []
  }

  return {
    id: row[0] as number,
    articleId: row[1] as string,
    feedId: row[2] as string,
    skillVersion: row[3] as number,
    decision: row[4] as ReasoningEntry['decision'],
    priority: row[5] as string | null,
    explanation: row[6] as string,
    signals,
    createdAt: row[8] as string
  }
}
