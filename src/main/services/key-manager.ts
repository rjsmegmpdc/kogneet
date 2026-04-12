import { safeStorage } from 'electron'
import type { AppConfig, ByokConfig, ByokProvider } from '../types'
import { saveAppConfig } from '../storage/appconfig'
import { log } from '../utils/logger'

const SUPPORTED_PROVIDERS = [
  'anthropic',
  'openai',
  'gemini',
  'mistral',
  'ollama',
  'azure-openai'
] as const

export type ProviderId = (typeof SUPPORTED_PROVIDERS)[number]

export interface ProviderInfo {
  id: ProviderId
  name: string
  description: string
  requiresKey: boolean
  defaultBaseUrl?: string
  defaultModels: string[]
}

export const PROVIDERS: ProviderInfo[] = [
  {
    id: 'anthropic',
    name: 'Anthropic',
    description: 'Claude models (Opus, Sonnet, Haiku)',
    requiresKey: true,
    defaultModels: ['claude-sonnet-4-6', 'claude-opus-4-6', 'claude-haiku-4-5-20251001']
  },
  {
    id: 'openai',
    name: 'OpenAI',
    description: 'GPT-4o, GPT-4o-mini, o1, o3',
    requiresKey: true,
    defaultModels: ['gpt-4o', 'gpt-4o-mini', 'o1', 'o3-mini']
  },
  {
    id: 'gemini',
    name: 'Google Gemini',
    description: 'Gemini 2.5 Pro, Flash',
    requiresKey: true,
    defaultModels: ['gemini-2.5-pro', 'gemini-2.5-flash']
  },
  {
    id: 'mistral',
    name: 'Mistral',
    description: 'Mistral Large, Medium, Small',
    requiresKey: true,
    defaultModels: ['mistral-large-latest', 'mistral-medium-latest', 'mistral-small-latest']
  },
  {
    id: 'ollama',
    name: 'Ollama (Local)',
    description: 'Local models via Ollama — no API key required',
    requiresKey: false,
    defaultBaseUrl: 'http://localhost:11434/v1',
    defaultModels: ['llama3', 'mistral', 'codellama']
  },
  {
    id: 'azure-openai',
    name: 'Azure OpenAI',
    description: 'OpenAI models via Azure — requires endpoint URL',
    requiresKey: true,
    defaultModels: ['gpt-4o', 'gpt-4o-mini']
  }
]

/**
 * Encrypt an API key using Electron's safeStorage.
 * Returns a base64-encoded encrypted string.
 */
export function encryptKey(plainKey: string): string {
  if (!safeStorage.isEncryptionAvailable()) {
    // Fallback: store as-is (not ideal, but functional on systems without keychain)
    return `plain:${plainKey}`
  }
  const encrypted = safeStorage.encryptString(plainKey)
  return `enc:${encrypted.toString('base64')}`
}

/**
 * Decrypt an API key.
 */
export function decryptKey(storedKey: string): string {
  if (storedKey.startsWith('plain:')) {
    return storedKey.slice(6)
  }
  if (storedKey.startsWith('enc:')) {
    const buffer = Buffer.from(storedKey.slice(4), 'base64')
    return safeStorage.decryptString(buffer)
  }
  // Legacy: assume plaintext
  return storedKey
}

/**
 * Get the BYOK config from appconfig, with defaults.
 */
export function getByokConfig(appConfig: AppConfig): ByokConfig {
  return appConfig.byok ?? {
    providers: {},
    featureRouting: {
      summarisation: '',
      priorityScoring: '',
      skillEditor: '',
      digestGeneration: '',
      socialPosts: '',
      reasoning: ''
    }
  }
}

/**
 * Save a provider's API key (encrypted) and config.
 */
export async function saveProviderKey(
  appConfig: AppConfig,
  providerId: string,
  plainKey: string,
  baseUrl?: string,
  defaultModel?: string
): Promise<AppConfig> {
  const byok = getByokConfig(appConfig)
  const providerInfo = PROVIDERS.find((p) => p.id === providerId)

  const provider: ByokProvider = {
    key: plainKey ? encryptKey(plainKey) : '',
    baseUrl: baseUrl || providerInfo?.defaultBaseUrl,
    models: providerInfo?.defaultModels ?? [],
    defaultModel: defaultModel || providerInfo?.defaultModels[0]
  }

  byok.providers[providerId] = provider
  appConfig.byok = byok

  await saveAppConfig(appConfig)
  await log('INFO', `BYOK provider saved: ${providerId}`)
  return appConfig
}

/**
 * Remove a provider.
 */
export async function removeProviderKey(
  appConfig: AppConfig,
  providerId: string
): Promise<AppConfig> {
  const byok = getByokConfig(appConfig)
  delete byok.providers[providerId]

  // Clear any feature routing that pointed to this provider
  for (const feature of Object.keys(byok.featureRouting) as (keyof typeof byok.featureRouting)[]) {
    if (byok.featureRouting[feature] === providerId) {
      byok.featureRouting[feature] = ''
    }
  }

  appConfig.byok = byok
  await saveAppConfig(appConfig)
  await log('INFO', `BYOK provider removed: ${providerId}`)
  return appConfig
}

/**
 * Update feature routing.
 */
export async function saveFeatureRouting(
  appConfig: AppConfig,
  routing: Record<string, string>
): Promise<AppConfig> {
  const byok = getByokConfig(appConfig)
  byok.featureRouting = routing as ByokConfig['featureRouting']
  appConfig.byok = byok
  await saveAppConfig(appConfig)
  return appConfig
}

/**
 * Get the decrypted key for a provider.
 */
export function getProviderKey(appConfig: AppConfig, providerId: string): string | null {
  const byok = getByokConfig(appConfig)
  const provider = byok.providers[providerId]
  if (!provider?.key) return null
  return decryptKey(provider.key)
}

/**
 * Get configured providers (without exposing raw keys).
 */
export function getConfiguredProviders(appConfig: AppConfig): {
  id: string
  name: string
  hasKey: boolean
  baseUrl?: string
  models: string[]
  defaultModel?: string
}[] {
  const byok = getByokConfig(appConfig)
  return Object.entries(byok.providers).map(([id, provider]) => {
    const info = PROVIDERS.find((p) => p.id === id)
    return {
      id,
      name: info?.name ?? id,
      hasKey: !!provider.key,
      baseUrl: provider.baseUrl,
      models: provider.models,
      defaultModel: provider.defaultModel
    }
  })
}
