import { useState, useEffect, useCallback } from 'react'
import type { SkillVersion } from '../../../main/types'
import { Button } from '../shared/Button'
import { SkillPreview } from './SkillPreview'
import { SkillHistory } from './SkillHistory'

interface FeedWithSkill {
  feedId: string
  feedName: string
  version: number
  updatedAt: string
}

export function SkillEditor(): JSX.Element {
  const [feeds, setFeeds] = useState<FeedWithSkill[]>([])
  const [selectedFeedId, setSelectedFeedId] = useState<string | null>(null)
  const [currentSkill, setCurrentSkill] = useState<SkillVersion | null>(null)
  const [editContent, setEditContent] = useState('')
  const [instruction, setInstruction] = useState('')
  const [isApplying, setIsApplying] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [activeTab, setActiveTab] = useState<'editor' | 'preview' | 'history'>('editor')
  const [error, setError] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)
  const [diskDiff, setDiskDiff] = useState<string | null>(null)

  // Load feeds with skills
  useEffect(() => {
    window.electronAPI.skillListFeeds().then((result) => {
      setFeeds(result as FeedWithSkill[])
    })
  }, [])

  // Load current skill when feed selected
  const loadSkill = useCallback(async (feedId: string) => {
    const skill = await window.electronAPI.skillGetCurrent(feedId) as SkillVersion | null
    setCurrentSkill(skill)
    setEditContent(skill?.content ?? '')
    setError(null)
    setSuccessMsg(null)

    // Check disk sync
    const diskContent = await window.electronAPI.skillCheckDiskSync(feedId) as string | null
    setDiskDiff(diskContent)
  }, [])

  useEffect(() => {
    if (selectedFeedId) loadSkill(selectedFeedId)
  }, [selectedFeedId, loadSkill])

  // Apply NL instruction via AI
  const handleApplyInstruction = async (): Promise<void> => {
    if (!selectedFeedId || !instruction.trim()) return
    setIsApplying(true)
    setError(null)
    setSuccessMsg(null)

    try {
      const result = await window.electronAPI.skillApplyInstruction({
        feedId: selectedFeedId,
        instruction: instruction.trim()
      }) as { success: boolean; version?: SkillVersion; changes?: { changesSummary: string }; error?: string }

      if (result.success && result.version) {
        setCurrentSkill(result.version)
        setEditContent(result.version.content)
        setInstruction('')
        setSuccessMsg(result.changes?.changesSummary ?? 'SKILL.md updated')
        // Refresh feed list
        const updated = await window.electronAPI.skillListFeeds() as FeedWithSkill[]
        setFeeds(updated)
      } else {
        setError(result.error ?? 'Failed to apply instruction')
      }
    } catch (err) {
      setError(String(err))
    } finally {
      setIsApplying(false)
    }
  }

  // Manual save of edited content
  const handleManualSave = async (): Promise<void> => {
    if (!selectedFeedId || editContent === currentSkill?.content) return
    setIsSaving(true)
    setError(null)

    try {
      const result = await window.electronAPI.skillSave({
        feedId: selectedFeedId,
        content: editContent,
        instruction: null,
        diffSummary: 'Manual edit'
      }) as { success: boolean; version?: SkillVersion; error?: string }

      if (result.success && result.version) {
        setCurrentSkill(result.version)
        setSuccessMsg('Saved as v' + result.version.version)
        const updated = await window.electronAPI.skillListFeeds() as FeedWithSkill[]
        setFeeds(updated)
      } else {
        setError(result.error ?? 'Save failed')
      }
    } catch (err) {
      setError(String(err))
    } finally {
      setIsSaving(false)
    }
  }

  // Import disk changes
  const handleImportDisk = async (): Promise<void> => {
    if (!selectedFeedId || !diskDiff) return
    setEditContent(diskDiff)
    setDiskDiff(null)
  }

  // Handle rollback from history
  const handleRollback = async (version: number): Promise<void> => {
    if (!selectedFeedId) return
    const result = await window.electronAPI.skillRollback(selectedFeedId, version) as {
      success: boolean; version?: SkillVersion; error?: string
    }
    if (result.success && result.version) {
      setCurrentSkill(result.version)
      setEditContent(result.version.content)
      setSuccessMsg(`Rolled back to v${version}`)
      setActiveTab('editor')
      const updated = await window.electronAPI.skillListFeeds() as FeedWithSkill[]
      setFeeds(updated)
    }
  }

  return (
    <div className="h-full flex gap-4">
      {/* Feed selector sidebar */}
      <div className="w-56 shrink-0 border-r border-gray-200 dark:border-gray-700 pr-4 overflow-auto">
        <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">
          Feeds with Skills
        </h3>
        {feeds.length === 0 ? (
          <p className="text-sm text-gray-400 dark:text-gray-500">
            No feeds have SKILL.md files yet. Add a feed first.
          </p>
        ) : (
          <div className="space-y-1">
            {feeds.map((f) => (
              <button
                key={f.feedId}
                onClick={() => setSelectedFeedId(f.feedId)}
                className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                  selectedFeedId === f.feedId
                    ? 'bg-[var(--accent-500)]/10 text-[var(--accent-600)] dark:text-[var(--accent-400)]'
                    : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300'
                }`}
              >
                <div className="font-medium truncate">{f.feedName}</div>
                <div className="text-xs text-gray-400 dark:text-gray-500">v{f.version}</div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Main editor area */}
      <div className="flex-1 flex flex-col min-w-0">
        {!selectedFeedId ? (
          <div className="flex items-center justify-center h-full text-gray-400 dark:text-gray-500">
            Select a feed to edit its SKILL.md
          </div>
        ) : (
          <>
            {/* Tabs */}
            <div className="flex gap-1 mb-4 border-b border-gray-200 dark:border-gray-700">
              {(['editor', 'preview', 'history'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === tab
                      ? 'border-[var(--accent-500)] text-[var(--accent-600)] dark:text-[var(--accent-400)]'
                      : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                  }`}
                >
                  {tab === 'editor' ? 'Editor' : tab === 'preview' ? 'Preview' : 'History'}
                </button>
              ))}
              {currentSkill && (
                <span className="ml-auto text-xs text-gray-400 dark:text-gray-500 self-center pr-2">
                  v{currentSkill.version}
                </span>
              )}
            </div>

            {/* Disk sync warning */}
            {diskDiff && (
              <div className="mb-3 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg flex items-center gap-3">
                <span className="text-sm text-amber-700 dark:text-amber-300 flex-1">
                  The SKILL.md file on disk differs from the database version.
                </span>
                <Button size="sm" variant="secondary" onClick={handleImportDisk}>
                  Import disk version
                </Button>
              </div>
            )}

            {/* Messages */}
            {error && (
              <div className="mb-3 p-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-700 dark:text-red-300">
                {error}
              </div>
            )}
            {successMsg && (
              <div className="mb-3 p-2 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg text-sm text-green-700 dark:text-green-300">
                {successMsg}
              </div>
            )}

            {activeTab === 'editor' && (
              <div className="flex-1 flex flex-col gap-4 min-h-0">
                {/* NL instruction bar */}
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={instruction}
                    onChange={(e) => setInstruction(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault()
                        handleApplyInstruction()
                      }
                    }}
                    placeholder="Tell the AI how to change this SKILL.md... (e.g. 'Only show high priority security updates')"
                    className="flex-1 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm"
                    disabled={isApplying}
                  />
                  <Button onClick={handleApplyInstruction} disabled={isApplying || !instruction.trim()}>
                    {isApplying ? 'Applying...' : 'Apply'}
                  </Button>
                </div>

                {/* Markdown editor */}
                <textarea
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  className="flex-1 px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm font-mono resize-none min-h-0"
                  spellCheck={false}
                />

                {/* Action bar */}
                <div className="flex gap-2 justify-end">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setEditContent(currentSkill?.content ?? '')}
                    disabled={editContent === currentSkill?.content}
                  >
                    Revert
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleManualSave}
                    disabled={isSaving || editContent === currentSkill?.content}
                  >
                    {isSaving ? 'Saving...' : 'Save'}
                  </Button>
                </div>
              </div>
            )}

            {activeTab === 'preview' && (
              <SkillPreview
                feedId={selectedFeedId}
                currentContent={currentSkill?.content ?? ''}
                editedContent={editContent}
              />
            )}

            {activeTab === 'history' && (
              <SkillHistory feedId={selectedFeedId} onRollback={handleRollback} />
            )}
          </>
        )}
      </div>
    </div>
  )
}
