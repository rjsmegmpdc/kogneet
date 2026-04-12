interface Props {
  label: string
  description?: string
  value: string
  onChange: (path: string) => void
}

export function FolderPicker({ label, description, value, onChange }: Props): JSX.Element {
  const handleBrowse = async (): Promise<void> => {
    const folder = await window.electronAPI.selectFolder()
    if (folder) onChange(folder)
  }

  return (
    <div className="py-3">
      <div className="text-sm font-medium mb-1">{label}</div>
      {description && (
        <div className="text-xs text-gray-500 dark:text-gray-400 mb-2">{description}</div>
      )}
      <div className="flex gap-2">
        <input
          type="text"
          value={value}
          readOnly
          className="flex-1 px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-sm"
        />
        <button
          onClick={handleBrowse}
          className="px-3 py-1.5 bg-gray-100 dark:bg-gray-600 rounded-lg text-sm font-medium hover:bg-gray-200 dark:hover:bg-gray-500 transition-colors"
        >
          Browse
        </button>
      </div>
    </div>
  )
}
