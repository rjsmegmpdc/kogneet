import cron from 'node-cron'
import type { SmtpConfig, Settings } from '../types'
import { loadSubscribers } from '../storage/subscribers'
import { sendDigestEmail } from './email-sender'
import { log } from '../utils/logger'

let digestJob: cron.ScheduledTask | null = null
let lastSendDate: string | null = null

interface EmailSchedulerDeps {
  getSmtp: () => SmtpConfig | undefined
  getSettings: () => Settings | null
  getDataFolder: () => string | null
}

let deps: EmailSchedulerDeps | null = null

export function setEmailSchedulerDeps(d: EmailSchedulerDeps): void {
  deps = d
}

function timeToCron(timeLocal: string): string | null {
  const match = timeLocal.match(/^(\d{1,2}):(\d{2})$/)
  if (!match) return null
  const hour = parseInt(match[1])
  const min = parseInt(match[2])
  if (hour < 0 || hour > 23 || min < 0 || min > 59) return null
  return `${min} ${hour} * * *`
}

function todayStr(): string {
  return new Date().toISOString().split('T')[0]
}

export async function runDigestSend(): Promise<{ success: boolean; recipientCount: number; error?: string }> {
  if (!deps) return { success: false, recipientCount: 0, error: 'Email scheduler not initialised' }

  const smtp = deps.getSmtp()
  const settings = deps.getSettings()
  const dataFolder = deps.getDataFolder()

  if (!smtp) return { success: false, recipientCount: 0, error: 'SMTP not configured' }
  if (!settings) return { success: false, recipientCount: 0, error: 'Settings not loaded' }
  if (!dataFolder) return { success: false, recipientCount: 0, error: 'Data folder not configured' }

  const today = todayStr()
  if (lastSendDate === today) {
    await log('INFO', `Digest email already sent today (${today}), skipping`)
    return { success: true, recipientCount: 0, error: 'Already sent today' }
  }

  await log('INFO', `Scheduled digest email send starting for ${today}`)

  try {
    const subscribers = loadSubscribers()
    const result = await sendDigestEmail(smtp, settings, subscribers, dataFolder)

    if (result.success && result.recipientCount > 0) {
      lastSendDate = today
    }

    return result
  } catch (err) {
    const error = String(err)
    await log('ERROR', `Scheduled digest email failed: ${error}`)
    return { success: false, recipientCount: 0, error }
  }
}

export function scheduleDigestEmail(settings: Settings): void {
  stopDigestEmail()

  const sendTime = settings.email.sendTimeLocal
  if (!sendTime) return

  const cronExpr = timeToCron(sendTime)
  if (!cronExpr || !cron.validate(cronExpr)) return

  digestJob = cron.schedule(cronExpr, async () => {
    await runDigestSend()
  })

  log('INFO', `Digest email scheduled at ${sendTime} daily`)
}

export function stopDigestEmail(): void {
  if (digestJob) {
    digestJob.stop()
    digestJob = null
  }
}

export function getDigestEmailStatus(): {
  scheduled: boolean
  sendTime: string | null
  lastSendDate: string | null
} {
  return {
    scheduled: digestJob !== null,
    sendTime: deps?.getSettings()?.email.sendTimeLocal ?? null,
    lastSendDate
  }
}
