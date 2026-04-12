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

export function Select({ label, description, value, options, onChange }: Props): JSX.Element {
  return (
    <div className="flex items-center justify-between py-3">
      <div className="flex-1 mr-4">
        <div className="text-sm font-medium">{label}</div>
        {description && (
          <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{description}</div>
        )}
      </div>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm min-w-[140px]"
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  )
}
