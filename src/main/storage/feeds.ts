import type { Feed, FeedSchedule } from '../types'
import { getDb, saveToFile } from '../database'
import { log } from '../utils/logger'

/**
 * Load all feeds from SQLite.
 */
export function loadFeeds(): Feed[] {
  const db = getDb()
  const result = db.exec(
    `SELECT id, name, url, category, source_type, schedule_type, schedule_interval_minutes,
            schedule_time_local, schedule_cron, enabled, last_fetched_at, added_at, skill_version
     FROM feeds ORDER BY added_at DESC`
  )

  if (result.length === 0) return []

  return result[0].values.map(mapRow)
}

/**
 * Get a single feed by ID.
 */
export function getFeed(feedId: string): Feed | null {
  const db = getDb()
  const result = db.exec(
    `SELECT id, name, url, category, source_type, schedule_type, schedule_interval_minutes,
            schedule_time_local, schedule_cron, enabled, last_fetched_at, added_at, skill_version
     FROM feeds WHERE id = ?`,
    [feedId]
  )

  if (result.length === 0 || result[0].values.length === 0) return null
  return mapRow(result[0].values[0])
}

/**
 * Add a new feed.
 */
export function addFeed(feed: Feed): void {
  const db = getDb()
  db.run(
    `INSERT INTO feeds (id, name, url, category, source_type, schedule_type,
      schedule_interval_minutes, schedule_time_local, schedule_cron, enabled, last_fetched_at, added_at, skill_version)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      feed.id, feed.name, feed.url, feed.category, feed.sourceType,
      feed.schedule.type,
      feed.schedule.intervalMinutes ?? null,
      feed.schedule.timeLocal ?? null,
      feed.schedule.cronExpression ?? null,
      feed.enabled ? 1 : 0,
      feed.lastFetchedAt,
      feed.addedAt,
      feed.skillVersion
    ]
  )
  saveToFile()
}

/**
 * Update an existing feed.
 */
export function updateFeed(feed: Feed): void {
  const db = getDb()
  db.run(
    `UPDATE feeds SET name = ?, url = ?, category = ?, source_type = ?,
      schedule_type = ?, schedule_interval_minutes = ?, schedule_time_local = ?,
      schedule_cron = ?, enabled = ?, skill_version = ?
     WHERE id = ?`,
    [
      feed.name, feed.url, feed.category, feed.sourceType,
      feed.schedule.type,
      feed.schedule.intervalMinutes ?? null,
      feed.schedule.timeLocal ?? null,
      feed.schedule.cronExpression ?? null,
      feed.enabled ? 1 : 0,
      feed.skillVersion,
      feed.id
    ]
  )
  saveToFile()
}

/**
 * Delete a feed and its related data.
 */
export function deleteFeed(feedId: string): void {
  const db = getDb()
  db.run('DELETE FROM reasoning_log WHERE feed_id = ?', [feedId])
  db.run('DELETE FROM articles WHERE feed_id = ?', [feedId])
  db.run('DELETE FROM skill_versions WHERE feed_id = ?', [feedId])
  db.run('DELETE FROM feeds WHERE id = ?', [feedId])
  saveToFile()
}

/**
 * Toggle a feed's enabled state. Returns the new state.
 */
export function toggleFeed(feedId: string): boolean {
  const db = getDb()
  db.run('UPDATE feeds SET enabled = NOT enabled WHERE id = ?', [feedId])
  saveToFile()

  const result = db.exec('SELECT enabled FROM feeds WHERE id = ?', [feedId])
  return result.length > 0 && result[0].values.length > 0 && result[0].values[0][0] === 1
}

/**
 * Update last fetched timestamp.
 */
export function updateLastFetched(feedId: string): void {
  const db = getDb()
  db.run(
    "UPDATE feeds SET last_fetched_at = datetime('now') WHERE id = ?",
    [feedId]
  )
  saveToFile()
}

/**
 * Validate a feed URL by attempting to parse it.
 */
export async function validateFeedUrl(url: string): Promise<{
  valid: boolean; title?: string; itemCount?: number; error?: string
}> {
  try {
    const RssParser = (await import('rss-parser')).default
    const parser = new RssParser({ timeout: 15000 })
    const parsed = await parser.parseURL(url)
    return {
      valid: true,
      title: parsed.title ?? undefined,
      itemCount: parsed.items?.length ?? 0
    }
  } catch (err) {
    return { valid: false, error: String(err) }
  }
}

// ── Internal ────────────────────────────────────────────────────

function mapRow(row: unknown[]): Feed {
  const schedule: FeedSchedule = {
    type: row[5] as FeedSchedule['type']
  }
  if (row[6] != null) schedule.intervalMinutes = row[6] as number
  if (row[7] != null) schedule.timeLocal = row[7] as string
  if (row[8] != null) schedule.cronExpression = row[8] as string

  return {
    id: row[0] as string,
    name: row[1] as string,
    url: row[2] as string,
    category: row[3] as string,
    sourceType: (row[4] as Feed['sourceType']) || 'rss',
    schedule,
    enabled: row[9] === 1,
    lastFetchedAt: row[10] as string | null,
    addedAt: row[11] as string,
    skillVersion: row[12] as number | null
  }
}
