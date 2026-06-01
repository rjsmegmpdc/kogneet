import type { AppConfig, SkillVersion } from '../types'
import { callAI } from './ai-provider'
import { getCurrentSkill, saveSkillVersion } from './skill-manager'
import { log } from '../utils/logger'

export interface SkillEditResult {
  updatedContent: string
  changesSummary: string
  sectionsModified: string[]
}

export interface SkillPreviewResult {
  articleTitle: string
  oldPriority: string | null
  newPriority: string
  oldStatus: string
  newStatus: string
  explanation: string
}

const SYSTEM_PROMPT = `You are a SKILL.md configuration editor for an RSS intelligence platform.
A SKILL.md file controls how a feed's articles are filtered, prioritised, summarised, and presented.

The file has YAML frontmatter (feed_name, feed_domain, version) and 6 markdown sections:
- Surface Criteria: what articles to include
- Filter Criteria: what articles to exclude
- Summarisation Style: how to write summaries
- Priority Scoring: HIGH/MEDIUM/LOW rules
- Digest Presentation: grouping and sort order
- Social Post Style: per-platform post formatting

When given an instruction, you must:
1. Apply the user's natural language instruction to modify the SKILL.md
2. Return your response in EXACTLY this format:

<updated_skill>
(the complete updated SKILL.md content)
</updated_skill>

<changes_summary>
(1-2 sentence plain-English description of what changed)
</changes_summary>

<sections_modified>
(comma-separated list of section names that were changed)
</sections_modified>

Rules:
- Always return the COMPLETE SKILL.md, not just changed sections
- Preserve YAML frontmatter (bump version by 1)
- Keep sections the user didn't mention unchanged
- Be precise with filtering and priority rules — vague rules cause bad results
- If the instruction is unclear, make the most reasonable interpretation`

/**
 * Apply a natural language instruction to a feed's SKILL.md.
 * Calls the AI provider to generate the updated content.
 */
export async function applyInstruction(
  appConfig: AppConfig,
  feedId: string,
  instruction: string
): Promise<SkillEditResult> {
  const current = getCurrentSkill(feedId)
  if (!current) {
    throw new Error(`No SKILL.md found for feed ${feedId}. Create one first.`)
  }

  const prompt = `Here is the current SKILL.md for this feed:

\`\`\`markdown
${current.content}
\`\`\`

User instruction: ${instruction}

Apply this instruction and return the updated SKILL.md.`

  const response = await callAI(appConfig, 'skillEditor', prompt, {
    systemPrompt: SYSTEM_PROMPT,
    maxTokens: 4096,
    temperature: 0.3
  })

  return parseEditResponse(response.content)
}

/**
 * Preview how a SKILL.md change would affect a set of articles.
 * Compares old vs new SKILL.md against sample articles.
 */
export async function previewChanges(
  appConfig: AppConfig,
  oldSkill: string,
  newSkill: string,
  sampleArticles: { title: string; content: string }[]
): Promise<SkillPreviewResult[]> {
  if (sampleArticles.length === 0) return []

  const articlesText = sampleArticles
    .slice(0, 10) // limit to 10 for token efficiency
    .map((a, i) => `Article ${i + 1}: "${a.title}"\n${a.content.slice(0, 500)}`)
    .join('\n\n')

  const prompt = `Compare how these articles would be handled under the OLD vs NEW SKILL.md.

OLD SKILL.md:
\`\`\`markdown
${oldSkill}
\`\`\`

NEW SKILL.md:
\`\`\`markdown
${newSkill}
\`\`\`

ARTICLES:
${articlesText}

For each article, respond with one line in this exact format:
ARTICLE|title|old_priority|new_priority|old_status|new_status|explanation

Where:
- priority is HIGH, MEDIUM, or LOW
- status is "surfaced" or "filtered"
- explanation is a brief reason for any change

If nothing changed for an article, still include it with same values.`

  const response = await callAI(appConfig, 'skillEditor', prompt, {
    maxTokens: 2048,
    temperature: 0.2
  })

  return parsePreviewResponse(response.content)
}

/**
 * Apply instruction and save as new version.
 */
export async function applyAndSave(
  appConfig: AppConfig,
  dataFolder: string,
  feedId: string,
  instruction: string
): Promise<{ version: SkillVersion; changes: SkillEditResult }> {
  const result = await applyInstruction(appConfig, feedId, instruction)

  const version = await saveSkillVersion(
    dataFolder,
    feedId,
    result.updatedContent,
    instruction,
    result.changesSummary
  )

  await log('INFO', `SKILL.md updated for feed ${feedId}: ${result.changesSummary}`)

  return { version, changes: result }
}

// ── Response parsers ────────────────────────────────────────────

function parseEditResponse(raw: string): SkillEditResult {
  const skillMatch = raw.match(/<updated_skill>([\s\S]*?)<\/updated_skill>/)
  const summaryMatch = raw.match(/<changes_summary>([\s\S]*?)<\/changes_summary>/)
  const sectionsMatch = raw.match(/<sections_modified>([\s\S]*?)<\/sections_modified>/)

  if (!skillMatch) {
    throw new Error('AI response did not contain valid <updated_skill> block')
  }

  return {
    updatedContent: skillMatch[1].trim(),
    changesSummary: summaryMatch ? summaryMatch[1].trim() : 'SKILL.md updated',
    sectionsModified: sectionsMatch
      ? sectionsMatch[1].trim().split(',').map((s) => s.trim())
      : []
  }
}

function parsePreviewResponse(raw: string): SkillPreviewResult[] {
  const results: SkillPreviewResult[] = []
  const lines = raw.split('\n').filter((l) => l.startsWith('ARTICLE|'))

  for (const line of lines) {
    const parts = line.split('|')
    if (parts.length >= 7) {
      results.push({
        articleTitle: parts[1],
        oldPriority: parts[2] || null,
        newPriority: parts[3],
        oldStatus: parts[4],
        newStatus: parts[5],
        explanation: parts.slice(6).join('|') // explanation might contain pipes
      })
    }
  }

  return results
}
