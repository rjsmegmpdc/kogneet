import { useState } from 'react'

interface Props {
  onComplete: () => void
}

type Step = 'folder' | 'ai' | 'preferences'

export function FirstLaunchWizard({ onComplete }: Props): JSX.Element {
  const [step, setStep] = useState<Step>('folder')
  const [dataFolder, setDataFolder] = useState('')
  const [folderError, setFolderError] = useState('')
  const [theme, setTheme] = useState<string>('system')
  const [fontSize, setFontSize] = useState<string>('medium')
  const [saving, setSaving] = useState(false)

  // Load default folder on mount
  useState(() => {
    window.electronAPI.getAppConfig().then((config: unknown) => {
      const c = config as { dataFolder?: string } | null
      if (c?.dataFolder) setDataFolder(c.dataFolder)
    })
  })

  const handleBrowse = async (): Promise<void> => {
    const folder = await window.electronAPI.selectFolder()
    if (folder) {
      setDataFolder(folder)
      setFolderError('')
    }
  }

  const handleFolderNext = async (): Promise<void> => {
    if (!dataFolder.trim()) {
      setFolderError('Please select a folder')
      return
    }
    const result = await window.electronAPI.validateFolder(dataFolder)
    if (!result.valid) {
      setFolderError(result.error ?? 'Folder is not writable')
      return
    }
    setStep('ai')
  }

  const handleFinish = async (): Promise<void> => {
    setSaving(true)
    const result = (await window.electronAPI.completeWizard({
      dataFolder,
      theme,
      fontSize
    })) as { error?: string }

    if (result?.error) {
      setSaving(false)
      alert('Setup failed: ' + result.error)
      return
    }

    onComplete()
  }

  return (
    <div className="h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      <div className="w-full max-w-lg bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8">
        {/* Progress indicator */}
        <div className="flex items-center gap-2 mb-8">
          {(['folder', 'ai', 'preferences'] as Step[]).map((s, i) => (
            <div key={s} className="flex items-center gap-2 flex-1">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                  step === s
                    ? 'bg-[var(--accent-500)] text-white'
                    : i < ['folder', 'ai', 'preferences'].indexOf(step)
                      ? 'bg-green-500 text-white'
                      : 'bg-gray-200 dark:bg-gray-600 text-gray-500 dark:text-gray-400'
                }`}
              >
                {i + 1}
              </div>
              {i < 2 && (
                <div className="flex-1 h-0.5 bg-gray-200 dark:bg-gray-600" />
              )}
            </div>
          ))}
        </div>

        {/* Step 1: Folder */}
        {step === 'folder' && (
          <div>
            <h2 className="text-xl font-semibold mb-2">Choose your data folder</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
              This is where your feeds, SKILL.md files, articles, and processed data will be stored. You can move it later.
            </p>
            <div className="flex gap-2 mb-2">
              <input
                type="text"
                value={dataFolder}
                onChange={(e) => { setDataFolder(e.target.value); setFolderError('') }}
                className="flex-1 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm"
                placeholder="Select a folder..."
              />
              <button
                onClick={handleBrowse}
                className="px-4 py-2 bg-gray-100 dark:bg-gray-600 rounded-lg text-sm font-medium hover:bg-gray-200 dark:hover:bg-gray-500 transition-colors"
              >
                Browse
              </button>
            </div>
            {folderError && (
              <p className="text-sm text-red-500 mb-4">{folderError}</p>
            )}
            <button
              onClick={handleFolderNext}
              className="mt-6 w-full py-2.5 bg-[var(--accent-500)] hover:bg-[var(--accent-600)] text-white rounded-lg font-medium transition-colors"
            >
              Next
            </button>
          </div>
        )}

        {/* Step 2: AI Provider */}
        {step === 'ai' && (
          <div>
            <h2 className="text-xl font-semibold mb-2">Connect an AI provider</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
              Kogneet uses AI to triage your feeds, generate summaries, and write social posts.
              Bring your own API key from any provider. You can set this up later in Settings.
            </p>
            <div className="p-6 border-2 border-dashed border-gray-200 dark:border-gray-600 rounded-xl text-center mb-6">
              <svg className="w-10 h-10 mx-auto mb-3 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456z" />
              </svg>
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Supported providers
              </p>
              <div className="flex flex-wrap justify-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded">Anthropic</span>
                <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded">OpenAI</span>
                <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded">Google Gemini</span>
                <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded">Mistral</span>
                <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded">Ollama</span>
                <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded">Azure OpenAI</span>
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setStep('folder')}
                className="flex-1 py-2.5 bg-gray-100 dark:bg-gray-600 rounded-lg font-medium hover:bg-gray-200 dark:hover:bg-gray-500 transition-colors"
              >
                Back
              </button>
              <button
                onClick={() => setStep('preferences')}
                className="flex-1 py-2.5 bg-[var(--accent-500)] hover:bg-[var(--accent-600)] text-white rounded-lg font-medium transition-colors"
              >
                Set up later
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Preferences */}
        {step === 'preferences' && (
          <div>
            <h2 className="text-xl font-semibold mb-2">Quick preferences</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
              You can change all of these later in Settings.
            </p>

            {/* Theme */}
            <div className="mb-6">
              <label className="text-sm font-medium mb-2 block">Colour mode</label>
              <div className="grid grid-cols-3 gap-2">
                {(['light', 'dark', 'system'] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => setTheme(t)}
                    className={`py-2 rounded-lg text-sm font-medium capitalize transition-colors ${
                      theme === t
                        ? 'bg-[var(--accent-500)] text-white'
                        : 'bg-gray-100 dark:bg-gray-600 hover:bg-gray-200 dark:hover:bg-gray-500'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            {/* Font size */}
            <div className="mb-6">
              <label className="text-sm font-medium mb-2 block">Font size</label>
              <div className="grid grid-cols-3 gap-2">
                {(['small', 'medium', 'large'] as const).map((s) => (
                  <button
                    key={s}
                    onClick={() => setFontSize(s)}
                    className={`py-2 rounded-lg text-sm font-medium capitalize transition-colors ${
                      fontSize === s
                        ? 'bg-[var(--accent-500)] text-white'
                        : 'bg-gray-100 dark:bg-gray-600 hover:bg-gray-200 dark:hover:bg-gray-500'
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setStep('ai')}
                className="flex-1 py-2.5 bg-gray-100 dark:bg-gray-600 rounded-lg font-medium hover:bg-gray-200 dark:hover:bg-gray-500 transition-colors"
              >
                Back
              </button>
              <button
                onClick={handleFinish}
                disabled={saving}
                className="flex-1 py-2.5 bg-[var(--accent-500)] hover:bg-[var(--accent-600)] text-white rounded-lg font-medium transition-colors disabled:opacity-50"
              >
                {saving ? 'Setting up...' : 'Get started'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
