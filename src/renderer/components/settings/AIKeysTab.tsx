import { useState, useEffect } from 'react'
import { Button } from '../shared/Button'
import { TextInput } from '../shared/TextInput'
import { Select } from '../shared/Select'

interface ProviderInfo {
  id: string
  name: string
  description: string
  requiresKey: boolean
  defaultBaseUrl?: string
  defaultModels: string[]
}

interface ConfiguredProvider {
  id: string
  name: string
  hasKey: boolean
  baseUrl?: string
  models: string[]
  defaultModel?: string
}

interface UsageEntry {
  provider: string
  feature: string
  totalInput: number
  totalOutput: number
  callCount: number
}

const FEATURE_LABELS: Record<string, string> = {
  summarisation: 'Summarisation',
  priorityScoring: 'Priority Scoring',
  skillEditor: 'SKILL.md Editor',
  digestGeneration: 'Digest Generation',
  socialPosts: 'Social Posts',
  reasoning: 'Reasoning Log'
}

export function AIKeysTab(): JSX.Element {
  const [providers, setProviders] = useState<ProviderInfo[]>([])
  const [configured, setConfigured] = useState<ConfiguredProvider[]>([])
  const [routing, setRouting] = useState<Record<string, string>>({})
  const [usage, setUsage] = useState<UsageEntry[]>([])

  // Add provider form
  const [selectedProvider, setSelectedProvider] = useState('')
  const [apiKey, setApiKey] = useState('')
  const [baseUrl, setBaseUrl] = useState('')
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState<{ success: boolean; error?: string; model?: string } | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    loadAll()
  }, [])

  const loadAll = async (): Promise<void> => {
    const [p, c, r, u] = await Promise.all([
      window.electronAPI.byokGetProviders() as Promise<ProviderInfo[]>,
      window.electronAPI.byokGetConfigured() as Promise<ConfiguredProvider[]>,
      window.electronAPI.byokGetRouting() as Promise<Record<string, string>>,
      window.electronAPI.byokGetUsage() as Promise<UsageEntry[]>
    ])
    setProviders(p)
    setConfigured(c)
    setRouting(r)
    setUsage(u)
  }

  const handleTest = async (): Promise<void> => {
    if (!selectedProvider) return
    setTesting(true)
    setTestResult(null)
    const info = providers.find((p) => p.id === selectedProvider)
    const result = await window.electronAPI.byokTestProvider({
      providerId: selectedProvider,
      key: apiKey,
      baseUrl: baseUrl || info?.defaultBaseUrl
    }) as { success: boolean; error?: string; model?: string }
    setTestResult(result)
    setTesting(false)
  }

  const handleSave = async (): Promise<void> => {
    if (!selectedProvider) return
    setSaving(true)
    await window.electronAPI.byokSaveProvider({
      providerId: selectedProvider,
      key: apiKey,
      baseUrl: baseUrl || undefined
    })
    setApiKey('')
    setBaseUrl('')
    setSelectedProvider('')
    setTestResult(null)
    setSaving(false)
    await loadAll()
  }

  const handleRemove = async (providerId: string): Promise<void> => {
    await window.electronAPI.byokRemoveProvider(providerId)
    await loadAll()
  }

  const handleRoutingChange = async (feature: string, providerId: string): Promise<void> => {
    const updated = { ...routing, [feature]: providerId }
    setRouting(updated)
    await window.electronAPI.byokSaveRouting(updated)
  }

  const selectedInfo = providers.find((p) => p.id === selectedProvider)
  const unconfiguredProviders = providers.filter(
    (p) => !configured.some((c) => c.id === p.id)
  )

  return (
    <div className="space-y-8">
      {/* Configured providers */}
      <section>
        <h3 className="text-sm font-semibold mb-3">Connected Providers</h3>
        {configured.length === 0 ? (
          <p className="text-sm text-gray-500 dark:text-gray-400">
            No AI providers connected. Add one below to enable AI features.
          </p>
        ) : (
          <div className="space-y-2">
            {configured.map((c) => (
              <div
                key={c.id}
                className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg"
              >
                <div>
                  <span className="text-sm font-medium">{c.name}</span>
                  <span className="ml-2 text-xs px-2 py-0.5 bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 rounded-full">
                    Connected
                  </span>
                  {c.defaultModel && (
                    <span className="ml-2 text-xs text-gray-500 dark:text-gray-400">
                      {c.defaultModel}
                    </span>
                  )}
                </div>
                <Button
                  variant="danger"
                  size="sm"
                  onClick={() => handleRemove(c.id)}
                >
                  Remove
                </Button>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Add provider */}
      {unconfiguredProviders.length > 0 && (
        <section>
          <h3 className="text-sm font-semibold mb-3">Add Provider</h3>
          <div className="space-y-4 p-4 border border-gray-200 dark:border-gray-600 rounded-lg">
            <Select
              label="Provider"
              value={selectedProvider}
              onChange={setSelectedProvider}
              options={[
                { value: '', label: 'Select a provider...' },
                ...unconfiguredProviders.map((p) => ({
                  value: p.id,
                  label: `${p.name} — ${p.description}`
                }))
              ]}
            />

            {selectedInfo && selectedInfo.requiresKey && (
              <TextInput
                label="API Key"
                value={apiKey}
                onChange={setApiKey}
                type="text"
                placeholder={`Enter your ${selectedInfo.name} API key`}
              />
            )}

            {selectedInfo && (selectedInfo.id === 'ollama' || selectedInfo.id === 'azure-openai') && (
              <TextInput
                label="Base URL"
                value={baseUrl || selectedInfo.defaultBaseUrl || ''}
                onChange={setBaseUrl}
                placeholder={selectedInfo.defaultBaseUrl || 'https://your-endpoint.openai.azure.com/'}
                description={selectedInfo.id === 'ollama'
                  ? 'Default: http://localhost:11434/v1'
                  : 'Your Azure OpenAI endpoint URL'}
              />
            )}

            {selectedInfo && (
              <div className="flex gap-2">
                <Button
                  variant="secondary"
                  onClick={handleTest}
                  disabled={testing || (!apiKey && selectedInfo.requiresKey)}
                >
                  {testing ? 'Testing...' : 'Test Connection'}
                </Button>
                <Button
                  variant="primary"
                  onClick={handleSave}
                  disabled={saving || (!apiKey && selectedInfo.requiresKey)}
                >
                  {saving ? 'Saving...' : 'Save'}
                </Button>
              </div>
            )}

            {testResult && (
              <div className={`p-3 rounded-lg text-sm ${
                testResult.success
                  ? 'bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300'
                  : 'bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300'
              }`}>
                {testResult.success
                  ? `Connected successfully. Model: ${testResult.model}`
                  : `Connection failed: ${testResult.error}`}
              </div>
            )}
          </div>
        </section>
      )}

      {/* Feature routing */}
      {configured.length > 0 && (
        <section>
          <h3 className="text-sm font-semibold mb-1">Feature Routing</h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
            Choose which provider handles each AI feature.
          </p>
          <div className="space-y-3">
            {Object.entries(FEATURE_LABELS).map(([feature, label]) => (
              <Select
                key={feature}
                label={label}
                value={routing[feature] || ''}
                onChange={(val) => handleRoutingChange(feature, val)}
                options={[
                  { value: '', label: 'Not configured' },
                  ...configured.map((c) => ({ value: c.id, label: c.name }))
                ]}
              />
            ))}
          </div>
        </section>
      )}

      {/* Token usage */}
      {usage.length > 0 && (
        <section>
          <h3 className="text-sm font-semibold mb-3">Token Usage (Last 30 Days)</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-600">
                  <th className="pb-2">Provider</th>
                  <th className="pb-2">Feature</th>
                  <th className="pb-2 text-right">Calls</th>
                  <th className="pb-2 text-right">Input Tokens</th>
                  <th className="pb-2 text-right">Output Tokens</th>
                </tr>
              </thead>
              <tbody>
                {usage.map((u, i) => (
                  <tr key={i} className="border-b border-gray-100 dark:border-gray-700">
                    <td className="py-2">{u.provider}</td>
                    <td className="py-2">{FEATURE_LABELS[u.feature] || u.feature}</td>
                    <td className="py-2 text-right">{u.callCount.toLocaleString()}</td>
                    <td className="py-2 text-right">{u.totalInput.toLocaleString()}</td>
                    <td className="py-2 text-right">{u.totalOutput.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Security note */}
      <section className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
        <p className="text-xs text-blue-700 dark:text-blue-300">
          API keys are encrypted at rest using your operating system's secure storage.
          Keys are never logged, never included in analytics, and never leave your machine
          except when making API calls to the provider you configured.
        </p>
      </section>
    </div>
  )
}
