interface Props {
  label: string
  description?: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
  type?: 'text' | 'email'
}

export function TextInput({ label, description, value, onChange, placeholder, type = 'text' }: Props): JSX.Element {
  return (
    <div className="py-3">
      <div className="text-sm font-medium mb-1">{label}</div>
      {description && (
        <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">{description}</div>
      )}
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm"
      />
    </div>
  )
}
