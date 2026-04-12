interface Option {
  value: string
  label: string
}

interface Props {
  label: string
  description?: string
  value: string
  options: Option[]
  onChange: (value: string) => void
}

export function ButtonGroup({ label, description, value, options, onChange }: Props): JSX.Element {
  return (
    <div className="py-3">
      <div className="text-sm font-medium mb-1">{label}</div>
      {description && (
        <div className="text-xs text-gray-500 dark:text-gray-400 mb-2">{description}</div>
      )}
      <div className="flex gap-1">
        {options.map((opt) => (
          <button
            key={opt.value}
            onClick={() => onChange(opt.value)}
            className={`flex-1 py-1.5 px-3 rounded-lg text-sm font-medium transition-colors ${
              value === opt.value
                ? 'bg-[var(--accent-500)] text-white'
                : 'bg-gray-100 dark:bg-gray-600 hover:bg-gray-200 dark:hover:bg-gray-500'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  )
}
