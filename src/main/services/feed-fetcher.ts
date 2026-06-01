import RssParser from 'rss-parser'
import fs from 'fs/promises'
import path from 'path'
import { randomUUID } from 'crypto'
import type { Feed, Article, Settings } from '../types'
import { getRawDateDir, formatDate } from '../utils/paths'
import { getDb, saveToFile } from '../database'
import { log } from '../utils/logger'
import { notify } from '../utils/notifications'

const parser = new RssParser({ timeout: 15000 })

export interface FetchResult {
  feedId: string
  itemCount: number
  newCount: number
  filePath: string
}

// ── Text utilities ──────────────────────────────────────────────

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim()
}

function cleanseContent(text: string): string {
  return text
    .replace(/(\d{4})([A-Za-z])/g, '$1 $2')
    .replace(/([a-z])((?:GA|Preview|Target|Release|Launch|Rollout|General|Standard|Public|Private|In)\b)/g, '$1 $2')
    .replace(/([a-z]{3,})([A-Z][a-z]{2,})/g, '$1 $2')
    .replace(/([.:;])([A-Za-z])/g, '$1 $2')
    .replace(/\s{2,}/g, ' ')
    .trim()
}

function toStr(val: unknown): string {
  if (val == null) return ''
  if (typeof val === 'string') return val
  if (typeof val === 'number' || typeof val === 'boolean') return String(val)
  if (Array.isArray(val)) return val.map(toStr).filter(Boolean).join(', ')
  if (typeof val === 'object') {
    const obj = val as Record<string, unknown>
    if (typeof obj._ === 'string') return obj._
    if (typeof obj.name === 'string') return obj.name
    if (typeof obj['#text'] === 'string') return obj['#text']
    try { return String(val) } catch { return '' }
  }
  return ''
}

function sanitizeFilename(name: string): string {
  return name.replace(/[^a-zA-Z0-9_-]/g, '_').substring(0, 50)
}

const DATE_FIELD_REGEX = /(?<=^|[^a-zA-Z])((?:GA|Preview|Target|Release|Launch|Rollout|General Availability|Rollout start)\s*date)\s*:\s*([A-Za-z]+\s+CY?\d{4}|Q\d\s+\d{4})/gi

function extractDates(text: string): Record<string, string> {
  const dates: Record<string, string> = {}
  let match: RegExpExecArray | null
  const regex = new RegExp(DATE_FIELD_REGEX.source, DATE_FIELD_REGEX.flags)
  while ((match = regex.exec(text)) !== null) {
    dates[match[1].trim()] = match[2].trim()
  }
  return dates
}

// ── Main fetch function ─────────────────────────────────────────

export async function fetchFeed(
  feed: Feed,
  dataFolder: string,
  settings: Settings
): Promise<FetchResult> {
  const date = formatDate()
  const time = new Date().toTimeString().slice(0, 5).replace(':', '-')
  const dir = getRawDateDir(dataFolder, date)
  await fs.mkdir(dir, { recursive: true })

  try {
    const parsed = await parser.parseURL(feed.url)
    const items = parsed.items ?? []

    const db = getDb()
    let newCount = 0

    // Build raw Markdown and insert articles into SQLite
    const lines: string[] = [
      `# ${feed.name} — Raw Fetch`,
      `**Fetched:** ${new Date().toISOString()}`,
      `**Source:** ${feed.url}`,
      `**Items:** ${items.length}`,
      '', '---', ''
    ]

    for (const item of items) {
      const title = toStr(item.title) || 'Untitled'
      const link = toStr(item.link)
      const pubDate = toStr(item.pubDate) || toStr(item.isoDate) || null
      const rawContent = toStr(item['content:encoded']) || toStr(item.content) || toStr(item.contentSnippet) || ''
      const contentText = rawContent ? cleanseContent(stripHtml(rawContent)) : ''
      const categories = (item.categories ?? []).map(toStr).filter(Boolean)
      const dates = extractDates(contentText)

      // Build metadata JSON
      const metadata: Record<string, string> = {}
      if (categories.length > 0) metadata.categories = categories.join(', ')
      for (const [field, value] of Object.entries(dates)) {
        metadata[field] = value
      }

      // Check if article already exists (by link)
      const existing = link
        ? db.exec('SELECT id, content FROM articles WHERE link = ?', [link])
        : { length: 0 } as ReturnType<typeof db.exec>

      const articleId = randomUUID()

      if (existing.length > 0 && existing[0].values.length > 0) {
        // Existing article — check for changes
        const existingContent = existing[0].values[0][1] as string | null
        const status = existingContent !== contentText ? 'changed' : 'unchanged'
        const existingId = existing[0].values[0][0] as string

        db.run(
          `UPDATE articles SET content = ?, content_html = ?, status = ?, fetched_at = datetime('now'), metadata = ?
           WHERE id = ?`,
          [contentText, rawContent, status, JSON.stringify(metadata), existingId]
        )
      } else {
        // New article
        db.run(
          `INSERT INTO articles (id, feed_id, title, link, content, content_html, status, published_at, fetched_at, metadata)
           VALUES (?, ?, ?, ?, ?, ?, 'new', ?, datetime('now'), ?)`,
          [articleId, feed.id, title, link || null, contentText, rawContent, pubDate, JSON.stringify(metadata)]
        )
        newCount++
      }

      // Raw Markdown output
      lines.push(`## ${title}`)
      if (pubDate) lines.push(`**Published:** ${pubDate}`)
      if (link) lines.push(`**Link:** ${link}`)
      if (categories.length > 0) lines.push(`**Categories:** ${categories.join(', ')}`)
      for (const [field, value] of Object.entries(dates)) {
        lines.push(`**${field}:** ${value}`)
      }
      lines.push('')
      if (contentText) lines.push(contentText)
      lines.push('', '---', '')
    }

    saveToFile()

    // Write raw Markdown file
    const filename = `${sanitizeFilename(feed.name)}-${feed.id.slice(0, 8)}_${time}_raw.md`
    const filePath = path.join(dir, filename)
    await fs.writeFile(filePath, lines.join('\n'), 'utf-8')

    await log('INFO', `Fetched "${feed.name}" — ${items.length} items (${newCount} new)`)
    notify('Fetch Complete', `${feed.name}: ${items.length} items`, 'fetchComplete', settings.notifications)

    return { feedId: feed.id, itemCount: items.length, newCount, filePath }
  } catch (err) {
    await log('ERROR', `Failed to fetch "${feed.name}": ${err}`)
    notify('Fetch Error', `${feed.name}: ${err}`, 'fetchError', settings.notifications)
    throw err
  }
}

/**
 * Get articles for a feed.
 */
export function getArticles(feedId: string, limit = 50): Article[] {
  const db = getDb()
  const result = db.exec(
    `SELECT id, feed_id, title, link, content, content_html, summary, priority, status,
            NULL as teaser, published_at, fetched_at, metadata
     FROM articles WHERE feed_id = ? ORDER BY fetched_at DESC LIMIT ?`,
    [feedId, limit]
  )

  if (result.length === 0) return []

  return result[0].values.map((row) => ({
    id: row[0] as string,
    feedId: row[1] as string,
    title: row[2] as string,
    link: row[3] as string,
    content: row[4] as string | null,
    contentHtml: row[5] as string | null,
    summary: row[6] as string | null,
    priority: row[7] as Article['priority'],
    status: row[8] as Article['status'],
    teaser: row[9] as string | null,
    publishedAt: row[10] as string | null,
    fetchedAt: row[11] as string,
    metadata: row[12] ? JSON.parse(row[12] as string) : {}
  }))
}
