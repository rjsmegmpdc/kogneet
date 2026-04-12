import { Notification } from 'electron'
import type { NotificationSettings } from '../types'

type NotificationEvent = keyof NotificationSettings

export function notify(
  title: string,
  body: string,
  event: NotificationEvent,
  notificationSettings: NotificationSettings
): void {
  if (!notificationSettings[event]) return
  if (!Notification.isSupported()) return

  new Notification({ title, body }).show()
}
