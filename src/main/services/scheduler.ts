import cron from 'node-cron'
import type { Feed, FeedSchedule } from '../types'

type FetchCallback = (feed: Feed) => Promise<void>

const activeJobs = new Map<string, cron.ScheduledTask>()
let fetchCallback: FetchCallback | null = null

export function setFetchCallback(cb: FetchCallback): void {
  fetchCallback = cb
}

export function scheduleToCron(schedule: FeedSchedule): string | null {
  switch (schedule.type) {
    case 'interval': {
      const mins = schedule.intervalMinutes ?? 30
      return `*/${mins} * * * *`
    }
    case 'daily': {
      const [hour, min] = (schedule.timeLocal ?? '08:00').split(':').map(Number)
      return `${min} ${hour} * * *`
    }
    case 'weekdays': {
      const [hour, min] = (schedule.timeLocal ?? '08:00').split(':').map(Number)
      return `${min} ${hour} * * 1-5`
    }
    case 'custom':
      return schedule.cronExpression ?? null
    default:
      return null
  }
}

export function scheduleFeed(feed: Feed): void {
  if (!feed.enabled) return
  unscheduleFeed(feed.id)

  const cronExpr = scheduleToCron(feed.schedule)
  if (!cronExpr || !cron.validate(cronExpr)) return

  const job = cron.schedule(cronExpr, async () => {
    if (fetchCallback) {
      await fetchCallback(feed).catch(() => {})
    }
  })

  activeJobs.set(feed.id, job)
}

export function unscheduleFeed(feedId: string): void {
  const job = activeJobs.get(feedId)
  if (job) {
    job.stop()
    activeJobs.delete(feedId)
  }
}

export function rescheduleFeed(feed: Feed): void {
  unscheduleFeed(feed.id)
  scheduleFeed(feed)
}

export function startAll(feeds: Feed[]): void {
  for (const feed of feeds) {
    if (feed.enabled) scheduleFeed(feed)
  }
}

export function stopAll(): void {
  for (const [, job] of activeJobs) {
    job.stop()
  }
  activeJobs.clear()
}

export function describeSchedule(schedule: FeedSchedule): string {
  switch (schedule.type) {
    case 'interval':
      return `Every ${schedule.intervalMinutes ?? 30} minutes`
    case 'daily':
      return `Daily at ${schedule.timeLocal ?? '08:00'}`
    case 'weekdays':
      return `Weekdays at ${schedule.timeLocal ?? '08:00'}`
    case 'custom':
      return `Cron: ${schedule.cronExpression ?? '—'}`
    default:
      return 'Unknown'
  }
}
