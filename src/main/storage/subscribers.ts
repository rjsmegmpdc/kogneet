import type { Subscriber } from '../types'
import { getDb, saveToFile } from '../database'

export function loadSubscribers(): Subscriber[] {
  const db = getDb()
  const result = db.exec(
    `SELECT id, name, email, added_at, enabled, feed_ids FROM subscribers ORDER BY added_at DESC`
  )
  if (result.length === 0) return []
  return result[0].values.map(mapRow)
}

export function getSubscriber(id: string): Subscriber | null {
  const db = getDb()
  const result = db.exec(
    `SELECT id, name, email, added_at, enabled, feed_ids FROM subscribers WHERE id = ?`,
    [id]
  )
  if (result.length === 0 || result[0].values.length === 0) return null
  return mapRow(result[0].values[0])
}

export function addSubscriber(sub: Subscriber): void {
  const db = getDb()
  db.run(
    `INSERT INTO subscribers (id, name, email, added_at, enabled, feed_ids)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [sub.id, sub.name, sub.email, sub.addedAt, sub.enabled ? 1 : 0, JSON.stringify(sub.feedIds)]
  )
  saveToFile()
}

export function updateSubscriber(sub: Subscriber): void {
  const db = getDb()
  db.run(
    `UPDATE subscribers SET name = ?, email = ?, enabled = ?, feed_ids = ? WHERE id = ?`,
    [sub.name, sub.email, sub.enabled ? 1 : 0, JSON.stringify(sub.feedIds), sub.id]
  )
  saveToFile()
}

export function deleteSubscriber(id: string): void {
  const db = getDb()
  db.run('DELETE FROM subscribers WHERE id = ?', [id])
  saveToFile()
}

export function toggleSubscriber(id: string): boolean {
  const db = getDb()
  db.run('UPDATE subscribers SET enabled = NOT enabled WHERE id = ?', [id])
  saveToFile()
  const result = db.exec('SELECT enabled FROM subscribers WHERE id = ?', [id])
  return result.length > 0 && result[0].values.length > 0 && result[0].values[0][0] === 1
}

function mapRow(row: unknown[]): Subscriber {
  let feedIds: string[] = []
  try {
    feedIds = JSON.parse(row[5] as string) ?? []
  } catch {
    feedIds = []
  }

  return {
    id: row[0] as string,
    name: row[1] as string,
    email: row[2] as string,
    addedAt: row[3] as string,
    enabled: row[4] === 1,
    feedIds
  }
}
