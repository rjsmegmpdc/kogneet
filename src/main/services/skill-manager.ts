import fs from 'fs/promises'
import fsSync from 'fs'
import path from 'path'
import type { SkillVersion } from '../types'
import { getDb, saveToFile } from '../database'
import { getSkillsDir, getSkillPath } from '../utils/paths'
import { log } from '../utils/logger'

/**
 * Default SKILL.md template for a new feed.
 */
export function getDefaultSkillContent(feedName: string, feedUrl: string): string {
  const domain = new URL(feedUrl).hostname.replace(/^www\./, '')
  return `---
feed_name: ${feedName}
feed_domain: ${domain}
version: 1
---

## Surface Criteria
Include all articles from this source.
No specific filtering rules configured yet.

## Filter Criteria
No exclusion rules configured.

## Summarisation Style
Format: 2-3 sentence summary.
Include: what changed, who is affected, why it matters.
Language register: professional, factual.

## Priority Scoring
HIGH: breaking changes, security updates, critical deadlines.
MEDIUM: new features, general updates, policy changes.
LOW: minor updates, informational content, routine announcements.

## Digest Presentation
Group by: category.
Sort: priority descending, then recency.
Citation format: "${feedName} — [title]" with link.

## Social Post Style
LinkedIn: professional analysis, 200 chars, no emoji.
X/Twitter: news angle, 280 chars, 1-2 hashtags.
Slack: brief summary with link.
`
}

/**
 * Create the initial SKILL.md for a feed.
 * Saves version 1 to SQLite and writes the .skill.md file to disk.
 */
export async function createSkill(
  dataFolder: string,
  feedId: string,
  feedName: string,
  feedUrl: string,
  content?: string
): Promise<SkillVersion> {
  const db = getDb()
  const skillContent = content || getDefaultSkillContent(feedName, feedUrl)

  db.run(
    `INSERT INTO skill_versions (feed_id, version, content, instruction, diff_summary, created_at)
     VALUES (?, 1, ?, 'Initial auto-generated configuration', 'Created default SKILL.md from feed metadata', datetime('now'))`,
    [feedId, skillContent]
  )

  // Update feed's skill_version reference
  db.run('UPDATE feeds SET skill_version = 1 WHERE id = ?', [feedId])
  saveToFile()

  // Write to disk
  const skillsDir = getSkillsDir(dataFolder)
  await fs.mkdir(skillsDir, { recursive: true })
  await fs.writeFile(getSkillPath(dataFolder, feedId), skillContent, 'utf-8')

  await log('INFO', `SKILL.md created for feed ${feedName} (${feedId})`)

  return {
    id: 0,
    feedId,
    version: 1,
    content: skillContent,
    instruction: 'Initial auto-generated configuration',
    diffSummary: 'Created default SKILL.md from feed metadata',
    createdAt: new Date().toISOString()
  }
}

/**
 * Save a new version of a SKILL.md.
 * Appends to version history — never overwrites.
 */
export async function saveSkillVersion(
  dataFolder: string,
  feedId: string,
  content: string,
  instruction: string | null,
  diffSummary: string | null
): Promise<SkillVersion> {
  const db = getDb()

  // Get next version number
  const result = db.exec(
    'SELECT COALESCE(MAX(version), 0) as max_ver FROM skill_versions WHERE feed_id = ?',
    [feedId]
  )
  const maxVersion = result.length > 0 ? (result[0].values[0][0] as number) : 0
  const newVersion = maxVersion + 1

  db.run(
    `INSERT INTO skill_versions (feed_id, version, content, instruction, diff_summary, created_at)
     VALUES (?, ?, ?, ?, ?, datetime('now'))`,
    [feedId, newVersion, content, instruction, diffSummary]
  )

  db.run('UPDATE feeds SET skill_version = ? WHERE id = ?', [newVersion, feedId])
  saveToFile()

  // Write to disk (always latest)
  await fs.writeFile(getSkillPath(dataFolder, feedId), content, 'utf-8')

  await log('INFO', `SKILL.md v${newVersion} saved for feed ${feedId}`)

  return {
    id: 0,
    feedId,
    version: newVersion,
    content,
    instruction,
    diffSummary,
    createdAt: new Date().toISOString()
  }
}

/**
 * Get the current (latest) SKILL.md for a feed.
 */
export function getCurrentSkill(feedId: string): SkillVersion | null {
  const db = getDb()
  const result = db.exec(
    `SELECT id, feed_id, version, content, instruction, diff_summary, created_at
     FROM skill_versions WHERE feed_id = ? ORDER BY version DESC LIMIT 1`,
    [feedId]
  )

  if (result.length === 0 || result[0].values.length === 0) return null

  const row = result[0].values[0]
  return {
    id: row[0] as number,
    feedId: row[1] as string,
    version: row[2] as number,
    content: row[3] as string,
    instruction: row[4] as string | null,
    diffSummary: row[5] as string | null,
    createdAt: row[6] as string
  }
}

/**
 * Get a specific version of a SKILL.md.
 */
export function getSkillVersion(feedId: string, version: number): SkillVersion | null {
  const db = getDb()
  const result = db.exec(
    `SELECT id, feed_id, version, content, instruction, diff_summary, created_at
     FROM skill_versions WHERE feed_id = ? AND version = ?`,
    [feedId, version]
  )

  if (result.length === 0 || result[0].values.length === 0) return null

  const row = result[0].values[0]
  return {
    id: row[0] as number,
    feedId: row[1] as string,
    version: row[2] as number,
    content: row[3] as string,
    instruction: row[4] as string | null,
    diffSummary: row[5] as string | null,
    createdAt: row[6] as string
  }
}

/**
 * Get full version history for a feed's SKILL.md.
 */
export function getSkillHistory(feedId: string): SkillVersion[] {
  const db = getDb()
  const result = db.exec(
    `SELECT id, feed_id, version, content, instruction, diff_summary, created_at
     FROM skill_versions WHERE feed_id = ? ORDER BY version DESC`,
    [feedId]
  )

  if (result.length === 0) return []

  return result[0].values.map((row) => ({
    id: row[0] as number,
    feedId: row[1] as string,
    version: row[2] as number,
    content: row[3] as string,
    instruction: row[4] as string | null,
    diffSummary: row[5] as string | null,
    createdAt: row[6] as string
  }))
}

/**
 * Rollback to a previous version.
 * Creates a NEW version with the old content — never destructive.
 */
export async function rollbackSkill(
  dataFolder: string,
  feedId: string,
  targetVersion: number
): Promise<SkillVersion | null> {
  const old = getSkillVersion(feedId, targetVersion)
  if (!old) return null

  return saveSkillVersion(
    dataFolder,
    feedId,
    old.content,
    null,
    `Rolled back to version ${targetVersion}`
  )
}

/**
 * Check if the on-disk SKILL.md has been externally modified.
 * Returns the disk content if different from the SQLite version, null otherwise.
 */
export async function checkDiskSync(dataFolder: string, feedId: string): Promise<string | null> {
  const diskPath = getSkillPath(dataFolder, feedId)
  if (!fsSync.existsSync(diskPath)) return null

  const diskContent = await fs.readFile(diskPath, 'utf-8')
  const dbVersion = getCurrentSkill(feedId)
  if (!dbVersion) return diskContent

  if (diskContent.trim() !== dbVersion.content.trim()) {
    return diskContent
  }

  return null
}

/**
 * Get all feeds that have SKILL.md files.
 */
export function getFeedsWithSkills(): { feedId: string; feedName: string; version: number; updatedAt: string }[] {
  const db = getDb()
  const result = db.exec(
    `SELECT f.id, f.name, sv.version, sv.created_at
     FROM feeds f
     JOIN skill_versions sv ON f.id = sv.feed_id AND f.skill_version = sv.version
     ORDER BY sv.created_at DESC`
  )

  if (result.length === 0) return []

  return result[0].values.map((row) => ({
    feedId: row[0] as string,
    feedName: row[1] as string,
    version: row[2] as number,
    updatedAt: row[3] as string
  }))
}
