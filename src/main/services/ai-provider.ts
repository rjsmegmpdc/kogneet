import Anthropic from '@anthropic-ai/sdk'
import type { AppConfig, AIFeature } from '../types'
import { getByokConfig, getProviderKey, type ProviderId } from './key-manager'
import { getDb, saveToFile } from '../database'
import { log } from '../utils/logger'

export interface AIResponse {
  content: string
  inputTokens: number
  outputTokens: number
  model: string
  provider: string
}

export interface AICallOptions {
  model?: string
  maxTokens?: number
  temperature?: number
  systemPrompt?: string
}

/**
 * Central AI call function. All AI usage in the app goes through here.
 *
 * Routes to the configured provider for the given feature,
 * decrypts the key, makes the call, tracks token usage.
 */
export async function callAI(
  appConfig: AppConfig,
  feature: AIFeature,
  prompt: string,
  options: AICallOptions = {}
): Promise<AIResponse> {
  const byok = getByokConfig(appConfig)
  const providerId = byok.featureRouting[feature]

  if (!providerId) {
    throw new Error(`No AI provider configured for feature "${feature}". Go to Settings → AI Keys.`)
  }

  const provider = byok.providers[providerId]
  if (!provider) {
    throw new Error(`Provider "${providerId}" not found in BYOK config.`)
  }

  const key = getProviderKey(appConfig, providerId)
  const model = options.model || provider.defaultModel || provider.models[0]
  const maxTokens = options.maxTokens ?? 4096

  let response: AIResponse

  switch (providerId as ProviderId) {
    case 'anthropic':
      response = await callAnthropic(key!, model, prompt, maxTokens, options)
      break
    case 'openai':
    case 'azure-openai':
    case 'ollama':
    case 'mistral':
      response = await callOpenAICompatible(key, model, prompt, maxTokens, options, provider.baseUrl, providerId)
      break
    case 'gemini':
      response = await callGemini(key!, model, prompt, maxTokens, options)
      break
    default:
      throw new Error(`Unsupported provider: ${providerId}`)
  }

  response.provider = providerId

  // Track token usage
  trackUsage(providerId, feature, model, response.inputTokens, response.outputTokens)

  return response
}

/**
 * Test a provider connection by making a minimal API call.
 */
export async function testProvider(
  providerId: string,
  key: string,
  baseUrl?: string
): Promise<{ success: boolean; error?: string; model?: string }> {
  try {
    const testPrompt = 'Reply with exactly: OK'
    const opts: AICallOptions = { maxTokens: 10 }

    switch (providerId as ProviderId) {
      case 'anthropic': {
        const result = await callAnthropic(key, 'claude-haiku-4-5-20251001', testPrompt, 10, opts)
        return { success: true, model: result.model }
      }
      case 'openai':
      case 'azure-openai':
      case 'ollama':
      case 'mistral': {
        const defaultModel = providerId === 'ollama' ? 'llama3' :
          providerId === 'mistral' ? 'mistral-small-latest' : 'gpt-4o-mini'
        const result = await callOpenAICompatible(
          key, defaultModel, testPrompt, 10, opts, baseUrl, providerId
        )
        return { success: true, model: result.model }
      }
      case 'gemini': {
        const result = await callGemini(key, 'gemini-2.5-flash', testPrompt, 10, opts)
        return { success: true, model: result.model }
      }
      default:
        return { success: false, error: `Unknown provider: ${providerId}` }
    }
  } catch (err) {
    return { success: false, error: String(err) }
  }
}

// ── Provider implementations ─────────────────────────────────────

async function callAnthropic(
  key: string,
  model: string,
  prompt: string,
  maxTokens: number,
  options: AICallOptions
): Promise<AIResponse> {
  const client = new Anthropic({ apiKey: key })

  const msg = await client.messages.create({
    model,
    max_tokens: maxTokens,
    ...(options.systemPrompt ? { system: options.systemPrompt } : {}),
    messages: [{ role: 'user', content: prompt }]
  })

  const textBlock = msg.content.find((b) => b.type === 'text')
  return {
    content: textBlock?.text ?? '',
    inputTokens: msg.usage.input_tokens,
    outputTokens: msg.usage.output_tokens,
    model: msg.model,
    provider: 'anthropic'
  }
}

async function callOpenAICompatible(
  key: string | null,
  model: string,
  prompt: string,
  maxTokens: number,
  options: AICallOptions,
  baseUrl?: string,
  providerId?: string
): Promise<AIResponse> {
  const url = baseUrl ??
    (providerId === 'mistral' ? 'https://api.mistral.ai/v1' :
     providerId === 'ollama' ? 'http://localhost:11434/v1' :
     'https://api.openai.com/v1')

  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (key) headers['Authorization'] = `Bearer ${key}`

  const body: Record<string, unknown> = {
    model,
    max_tokens: maxTokens,
    messages: [
      ...(options.systemPrompt ? [{ role: 'system', content: options.systemPrompt }] : []),
      { role: 'user', content: prompt }
    ]
  }

  if (options.temperature !== undefined) body.temperature = options.temperature

  const resp = await fetch(`${url}/chat/completions`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body)
  })

  if (!resp.ok) {
    const errText = await resp.text()
    throw new Error(`${providerId} API error (${resp.status}): ${errText}`)
  }

  const data = await resp.json()
  return {
    content: data.choices?.[0]?.message?.content ?? '',
    inputTokens: data.usage?.prompt_tokens ?? 0,
    outputTokens: data.usage?.completion_tokens ?? 0,
    model: data.model ?? model,
    provider: providerId ?? 'openai'
  }
}

async function callGemini(
  key: string,
  model: string,
  prompt: string,
  maxTokens: number,
  options: AICallOptions
): Promise<AIResponse> {
  // Gemini uses the OpenAI-compatible endpoint
  const baseUrl = 'https://generativelanguage.googleapis.com/v1beta/openai'
  return callOpenAICompatible(key, model, prompt, maxTokens, options, baseUrl, 'gemini')
}

// ── Token usage tracking ─────────────────────────────────────────

function trackUsage(
  provider: string,
  feature: string,
  model: string,
  inputTokens: number,
  outputTokens: number
): void {
  try {
    const db = getDb()
    db.run(
      `INSERT INTO token_usage (provider, feature, model, input_tokens, output_tokens, created_at)
       VALUES (?, ?, ?, ?, ?, datetime('now'))`,
      [provider, feature, model, inputTokens, outputTokens]
    )
    saveToFile()
  } catch (err) {
    log('ERROR', `Failed to track token usage: ${err}`)
  }
}

/**
 * Get token usage summary for display in settings.
 */
export function getTokenUsageSummary(days: number = 30): {
  provider: string
  feature: string
  totalInput: number
  totalOutput: number
  callCount: number
}[] {
  try {
    const db = getDb()
    const results = db.exec(
      `SELECT provider, feature,
              SUM(input_tokens) as total_input,
              SUM(output_tokens) as total_output,
              COUNT(*) as call_count
       FROM token_usage
       WHERE created_at > datetime('now', '-${days} days')
       GROUP BY provider, feature
       ORDER BY total_input + total_output DESC`
    )

    if (results.length === 0) return []

    return results[0].values.map((row) => ({
      provider: row[0] as string,
      feature: row[1] as string,
      totalInput: row[2] as number,
      totalOutput: row[3] as number,
      callCount: row[4] as number
    }))
  } catch {
    return []
  }
}
