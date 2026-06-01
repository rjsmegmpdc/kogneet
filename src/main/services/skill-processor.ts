import type { AppConfig, Article } from '../types'
import { callAI } from './ai-provider'
import { getCurrentSkill } from './skill-manager'
import { logReasoning } from './reasoning-logger'
import { getDb, saveToFile } from '../database'
import { log } from '../utils/logger'

interface ProcessResult {
  processed: number
  surfaced: number
  filtered: number
}

/**
 * Apply a feed's SKILL.md to its unprocessed articles.
 * Scores priority, decides surface/filter, generates summaries, logs reasoning.
 */
export async function processArticles(
  appConfig: AppConfig,
  feedId: string,
  limit = 20
): Promise<ProcessResult> {
  const skill = getCurrentSkill(feedId)
  if (!skill) {
    await log('WARN', `No SKILL.md for feed ${feedId} — skipping processing`)
    return { processed: 0, surfaced: 0, filtered: 0 }
  }

  const db = getDb()

  // Get unprocessed articles (new or changed, no summary yet)
  const result = db.exec(
    `SELECT id, title, content, link, metadata
     FROM articles
     WHERE feed_id = ? AND (status = 'new' OR status = 'changed') AND summary IS NULL
     ORDER BY fetched_at DESC LIMIT ?`,
    [feedId, limit]
  )

  if (result.length === 0 || result[0].values.length === 0) {
    return { processed: 0, surfaced: 0, filtered: 0 }
  }

  const articles = result[0].values.map((row) => ({
    id: row[0] as string,
    title: row[1] as string,
    content: (row[2] as string) || '',
    link: row[3] as string,
    metadata: row[4] ? JSON.parse(row[4] as string) : {}
  }))

  // Build a batch prompt for efficiency
  const articlesText = articles
    .map((a, i) => `ARTICLE_${i + 1}:\nTitle: ${a.title}\nContent: ${a.content.slice(0, 1000)}\nMetadata: ${JSON.stringify(a.metadata)}`)
    .join('\n\n')

  const prompt = `You are applying a SKILL.md configuration to score and process articles.

SKILL.md:
\`\`\`markdown
${skill.content}
\`\`\`

ARTICLES:
${articlesText}

For each article, respond with one line in this EXACT format:
RESULT|article_number|decision|priority|summary|explanation|signals

Where:
- article_number: 1, 2, 3, etc.
- decision: "surfaced" or "filtered"
- priority: "high", "medium", or "low"
- summary: 2-3 sentence summary following the Summarisation Style section
- explanation: brief reasoning for the decision
- signals: comma-separated list of matching keywords/rules

Process ALL articles. Do not skip any.`

  try {
    const response = await callAI(appConfig, 'priorityScoring', prompt, {
      maxTokens: 4096,
      temperature: 0.2
    })

    let surfaced = 0
    let filtered = 0

    const lines = response.content.split('\n').filter((l) => l.startsWith('RESULT|'))

    for (const line of lines) {
      const parts = line.split('|')
      if (parts.length < 7) continue

      const articleIdx = parseInt(parts[1]) - 1
      if (articleIdx < 0 || articleIdx >= articles.length) continue

      const article = articles[articleIdx]
      const decision = parts[2] as 'surfaced' | 'filtered'
      const priority = parts[3] as 'high' | 'medium' | 'low'
      const summary = parts[4]
      const explanation = parts[5]
      const signals = parts[6].split(',').map((s) => s.trim()).filter(Boolean)

      // Update article in DB
      db.run(
        `UPDATE articles SET summary = ?, priority = ?, status = ? WHERE id = ?`,
        [summary, priority, decision === 'filtered' ? 'filtered' : article.id ? 'new' : 'unchanged', article.id]
      )

      // Log reasoning
      logReasoning(
        article.id,
        feedId,
        skill.version,
        decision,
        priority,
        explanation,
        signals
      )

      if (decision === 'surfaced') surfaced++
      else filtered++
    }

    saveToFile()
    await log('INFO', `Processed ${articles.length} articles for feed ${feedId}: ${surfaced} surfaced, ${filtered} filtered`)

    return { processed: articles.length, surfaced, filtered }
  } catch (err) {
    await log('ERROR', `SKILL.md processing failed for feed ${feedId}: ${err}`)
    return { processed: 0, surfaced: 0, filtered: 0 }
  }
}
