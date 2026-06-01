import type { FeedSchedule } from '../../../main/types'

interface Props {
  value: FeedSchedule
  onChange: (schedule: FeedSchedule) => void
}

const scheduleTypes = [
  { value: 'interval', label: 'Every N minutes' },
  { value: 'daily', label: 'Daily at time' },
  { value: 'weekdays', label: 'Weekdays at time' },
  { value: 'custom', label: 'Custom cron' }
] as const

export function SchedulePicker({ value, onChange }: Props): JSX.Element {
  const handleTypeChange = (type: FeedSchedule['type']): void => {
    const base: FeedSchedule = { type }
    if (type === 'interval') base.intervalMinutes = 30
    if (type === 'daily' || type === 'weekdays') base.timeLocal = '08:00'
    if (type === 'custom') base.cronExpression = '0 8 * * *'
    onChange(base)
  }

  return (
    <div>
      <label className="text-sm font-medium mb-1 block">Schedule</label>

      <div className="grid grid-cols-2 gap-1 mb-3">
        {scheduleTypes.map((st) => (
          <button
            key={st.value}
            type="button"
            onClick={() => handleTypeChange(st.value)}
            className={`py-1.5 px-2 rounded text-xs font-medium transition-colors ${
              value.type === st.value
                ? 'bg-[var(--accent-500)] text-white'
                : 'bg-gray-100 dark:bg-gray-600 hover:bg-gray-200 dark:hover:bg-gray-500'
            }`}
          >
            {st.label}
          </button>
        ))}
      </div>

      {value.type === 'interval' && (
        <div className="flex items-center gap-2">
          <span className="text-sm">Every</span>
          <input
            type="number"
            min={1}
            max={1440}
            value={value.intervalMinutes ?? 30}
            onChange={(e) =>
              onChange({ ...value, intervalMinutes: Math.max(1, Number(e.target.value)) })
            }
            className="w-20 px-2 py-1 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm"
          />
          <span className="text-sm">minutes</span>
        </div>
      )}

      {(value.type === 'daily' || value.type === 'weekdays') && (
        <div className="flex items-center gap-2">
          <span className="text-sm">At</span>
          <input
            type="time"
            value={value.timeLocal ?? '08:00'}
            onChange={(e) => onChange({ ...value, timeLocal: e.target.value })}
            className="px-2 py-1 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm"
          />
        </div>
      )}

      {value.type === 'custom' && (
        <div>
          <input
            type="text"
            value={value.cronExpression ?? ''}
            onChange={(e) => onChange({ ...value, cronExpression: e.target.value })}
            placeholder="e.g. 0 8 * * 1-5"
            className="w-full px-2 py-1 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm font-mono"
          />
          <p className="text-xs text-gray-400 mt-1">Format: minute hour day-of-month month day-of-week</p>
        </div>
      )}

      <p className="text-xs text-[var(--accent-500)] mt-2">{describeSchedule(value)}</p>
    </div>
  )
}

function describeSchedule(schedule: FeedSchedule): string {
  switch (schedule.type) {
    case 'interval':
      return `Runs every ${schedule.intervalMinutes ?? 30} minutes`
    case 'daily':
      return `Runs daily at ${schedule.timeLocal ?? '08:00'}`
    case 'weekdays':
      return `Runs weekdays at ${schedule.timeLocal ?? '08:00'}`
    case 'custom':
      return `Cron: ${schedule.cronExpression ?? '—'}`
    default:
      return ''
  }
}
