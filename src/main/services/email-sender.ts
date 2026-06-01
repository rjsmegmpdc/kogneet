import nodemailer from 'nodemailer'
import fs from 'fs/promises'
import type { SmtpConfig, Settings, Subscriber } from '../types'
import { getEmailLogPath, formatDate } from '../utils/paths'
import { getDb } from '../database'
import { log } from '../utils/logger'

interface SendResult {
  success: boolean
  recipientCount: number
  error?: string
}

function createTransport(smtp: SmtpConfig): nodemailer.Transporter {
  return nodemailer.createTransport({
    host: smtp.host,
    port: smtp.port,
    secure: smtp.secure,
    auth: {
      user: smtp.username,
      pass: smtp.password
    }
  })
}

function markdownToHtml(md: string, unsubscribeMailto?: string): string {
  let html = md
    .replace(/^### (.+)$/gm, '<h3 style="margin:8px 0 4px;font-size:14px;color:#6b7280;">$1</h3>')
    .replace(/^## \[HIGH\] (.+)$/gm, '<h2 style="margin:16px 0 4px;font-size:16px;"><span style="color:#dc2626;font-weight:bold;">[HIGH]</span> $1</h2>')
    .replace(/^## \[MEDIUM\] (.+)$/gm, '<h2 style="margin:16px 0 4px;font-size:16px;"><span style="color:#d97706;font-weight:bold;">[MEDIUM]</span> $1</h2>')
    .replace(/^## \[LOW\] (.+)$/gm, '<h2 style="margin:16px 0 4px;font-size:16px;color:#6b7280;">[LOW] $1</h2>')
    .replace(/^## (.+)$/gm, '<h2 style="margin:16px 0 4px;font-size:16px;">$1</h2>')
    .replace(/^# (.+)$/gm, '<h1 style="margin:0 0 8px;font-size:20px;">$1</h1>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*\*Link:\*\* (https?:\/\/\S+)/g, '<strong>Link:</strong> <a href="$1" style="color:#6366f1;">$1</a>')
    .replace(/^---$/gm, '<hr style="border:0;border-top:1px solid #e5e7eb;margin:12px 0;">')
    .replace(/\n/g, '<br>\n')

  const unsubBlock = unsubscribeMailto
    ? `<p style="font-size:11px;color:#9ca3af;margin-top:8px;">
        Don't want these emails? <a href="${unsubscribeMailto}" style="color:#6366f1;text-decoration:underline;">Unsubscribe</a>
      </p>`
    : ''

  return `
    <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:700px;margin:0 auto;padding:20px;color:#1f2937;font-size:14px;line-height:1.6;">
      ${html}
      <hr style="border:0;border-top:1px solid #e5e7eb;margin:20px 0;">
      <p style="font-size:12px;color:#9ca3af;">Sent by Kogneet</p>
      ${unsubBlock}
    </div>
  `
}

async function logEmail(
  dataFolder: string,
  date: string,
  recipients: string[],
  success: boolean,
  error?: string
): Promise<void> {
  const logPath = getEmailLogPath(dataFolder)
  const timestamp = new Date().toISOString()
  const line = `${timestamp},${date},${recipients.join(';')},${success ? 'sent' : 'failed'},${error ?? ''}\n`
  await fs.appendFile(logPath, line, 'utf-8').catch(() => {})
}

export async function verifySmtp(smtp: SmtpConfig): Promise<{ success: boolean; error?: string }> {
  try {
    const transport = createTransport(smtp)
    await transport.verify()
    return { success: true }
  } catch (err) {
    return { success: false, error: String(err) }
  }
}

export async function sendTestEmail(
  smtp: SmtpConfig,
  settings: Settings,
  toEmail: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const transport = createTransport(smtp)
    const fromAddress = settings.email.senderEmail || smtp.username
    await transport.sendMail({
      from: `"${settings.email.senderDisplayName}" <${fromAddress}>`,
      to: toEmail,
      replyTo: settings.email.replyTo || undefined,
      subject: '[Test] Kogneet Digest',
      text: 'This is a test email from Kogneet. If you received this, your SMTP settings are working correctly.',
      html: `
        <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:600px;margin:0 auto;padding:20px;color:#1f2937;">
          <h1 style="font-size:20px;">Kogneet — Test Email</h1>
          <p>If you received this, your SMTP settings are working correctly.</p>
          <hr style="border:0;border-top:1px solid #e5e7eb;margin:16px 0;">
          <p style="font-size:12px;color:#9ca3af;">Sent by Kogneet</p>
        </div>
      `
    })
    await log('INFO', `Test email sent to ${toEmail}`)
    return { success: true }
  } catch (err) {
    await log('ERROR', `Test email failed: ${err}`)
    return { success: false, error: String(err) }
  }
}

export async function sendWelcomeEmail(
  smtp: SmtpConfig,
  settings: Settings,
  subscriber: Subscriber,
  feedNames: string[]
): Promise<{ success: boolean; error?: string }> {
  try {
    const transport = createTransport(smtp)
    const fromAddress = settings.email.senderEmail || smtp.username
    const feedListHtml = feedNames.length > 0
      ? feedNames.map((f) => `<li style="margin:4px 0;">${f}</li>`).join('\n')
      : '<li style="margin:4px 0;"><em>All available feeds</em></li>'

    await transport.sendMail({
      from: `"${settings.email.senderDisplayName}" <${fromAddress}>`,
      to: `"${subscriber.name}" <${subscriber.email}>`,
      replyTo: settings.email.replyTo || undefined,
      subject: 'Welcome to Kogneet Digests',
      text: `Hi ${subscriber.name},\n\nYou have been added as a subscriber to Kogneet digests.\n\nYour subscribed feeds:\n${feedNames.map((f) => `  - ${f}`).join('\n')}\n\n— Kogneet`,
      html: `
        <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:600px;margin:0 auto;padding:20px;color:#1f2937;">
          <h1 style="font-size:20px;margin:0 0 16px;">Welcome to Kogneet</h1>
          <p>Hi ${subscriber.name},</p>
          <p>You have been added as a subscriber to Kogneet digests.</p>
          <div style="background:#f0fdf4;border:1px solid #86efac;border-radius:6px;padding:12px 16px;margin:16px 0;">
            <strong style="color:#166534;">Your subscribed feeds:</strong>
            <ul style="margin:8px 0 0;padding-left:20px;color:#166534;font-size:13px;">
              ${feedListHtml}
            </ul>
          </div>
          <hr style="border:0;border-top:1px solid #e5e7eb;margin:20px 0;">
          <p style="font-size:12px;color:#9ca3af;">Sent by Kogneet</p>
        </div>
      `
    })
    await log('INFO', `Welcome email sent to ${subscriber.name} <${subscriber.email}>`)
    return { success: true }
  } catch (err) {
    await log('ERROR', `Welcome email to ${subscriber.email} failed: ${err}`)
    return { success: false, error: String(err) }
  }
}

/**
 * Build digest content from articles in SQLite for a subscriber.
 */
function buildDigestContent(subscriber: Subscriber): string {
  const db = getDb()
  const today = formatDate()

  // Get articles from the subscriber's feeds (or all feeds if no filter)
  let query: string
  let params: unknown[]

  if (subscriber.feedIds.length > 0) {
    const placeholders = subscriber.feedIds.map(() => '?').join(',')
    query = `SELECT a.title, a.summary, a.priority, a.link, a.status, f.name as feed_name
             FROM articles a JOIN feeds f ON a.feed_id = f.id
             WHERE a.feed_id IN (${placeholders}) AND a.status != 'filtered'
             AND date(a.fetched_at) = ?
             ORDER BY
               CASE a.priority WHEN 'high' THEN 1 WHEN 'medium' THEN 2 ELSE 3 END,
               a.fetched_at DESC`
    params = [...subscriber.feedIds, today]
  } else {
    query = `SELECT a.title, a.summary, a.priority, a.link, a.status, f.name as feed_name
             FROM articles a JOIN feeds f ON a.feed_id = f.id
             WHERE a.status != 'filtered' AND date(a.fetched_at) = ?
             ORDER BY
               CASE a.priority WHEN 'high' THEN 1 WHEN 'medium' THEN 2 ELSE 3 END,
               a.fetched_at DESC`
    params = [today]
  }

  const result = db.exec(query, params)
  if (result.length === 0 || result[0].values.length === 0) {
    return `# Kogneet Digest — ${today}\n\nNo items matched your subscriptions today.`
  }

  const lines: string[] = [`# Kogneet Digest — ${today}`, '']

  for (const row of result[0].values) {
    const title = row[0] as string
    const summary = row[1] as string | null
    const priority = row[2] as string | null
    const link = row[3] as string
    const status = row[4] as string
    const feedName = row[5] as string

    const tag = priority ? `[${priority.toUpperCase()}]` : ''
    const badge = status === 'new' ? ' **NEW**' : status === 'changed' ? ' **CHANGED**' : ''

    lines.push(`## ${tag} ${title}${badge}`)
    lines.push(`*${feedName}*`)
    if (summary) lines.push('', summary)
    if (link) lines.push('', `**Link:** ${link}`)
    lines.push('', '---', '')
  }

  return lines.join('\n')
}

/**
 * Send digest email to specific subscribers.
 */
export async function sendDigestEmail(
  smtp: SmtpConfig,
  settings: Settings,
  subscribers: Subscriber[],
  dataFolder: string
): Promise<SendResult> {
  const activeSubscribers = subscribers.filter((s) => s.enabled)
  if (activeSubscribers.length === 0) {
    return { success: true, recipientCount: 0, error: 'No active subscribers' }
  }

  const transport = createTransport(smtp)
  const fromAddress = settings.email.senderEmail || smtp.username
  const from = `"${settings.email.senderDisplayName}" <${fromAddress}>`
  const today = formatDate()

  let sentCount = 0
  const errors: string[] = []

  for (const sub of activeSubscribers) {
    try {
      const emailContent = buildDigestContent(sub)

      if (!emailContent.includes('##') && !settings.email.sendIfNoItems) {
        continue
      }

      const unsubAddress = settings.email.replyTo || fromAddress
      const unsubSubject = encodeURIComponent('UNSUBSCRIBE')
      const unsubBody = encodeURIComponent(`Please unsubscribe me.\n\nSubscriber: ${sub.email}`)
      const unsubMailto = settings.email.unsubscribeEnabled
        ? `mailto:${encodeURIComponent(unsubAddress)}?subject=${unsubSubject}&body=${unsubBody}`
        : undefined

      await transport.sendMail({
        from,
        to: `"${sub.name}" <${sub.email}>`,
        replyTo: settings.email.replyTo || undefined,
        subject: `Kogneet Digest — ${today}`,
        text: emailContent,
        html: markdownToHtml(emailContent, unsubMailto),
        headers: unsubMailto ? {
          'List-Unsubscribe': `<${unsubMailto}>`,
          'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click'
        } : undefined
      })
      sentCount++
    } catch (err) {
      errors.push(`${sub.email}: ${err}`)
    }
  }

  await logEmail(dataFolder, today, activeSubscribers.map((s) => s.email), errors.length === 0, errors.join('; '))
  await log('INFO', `Digest email sent to ${sentCount}/${activeSubscribers.length} subscribers`)

  if (errors.length > 0) {
    return { success: false, recipientCount: sentCount, error: errors.join('; ') }
  }
  return { success: true, recipientCount: sentCount }
}
