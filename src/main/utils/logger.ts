import fs from 'fs/promises'
import { getLogPath } from './paths'

const MAX_LOG_SIZE = 5 * 1024 * 1024 // 5MB

export type LogLevel = 'INFO' | 'WARN' | 'ERROR' | 'DEBUG'

let dataFolder: string | null = null

export function setLogDataFolder(folder: string): void {
  dataFolder = folder
}

export async function log(level: LogLevel, message: string): Promise<void> {
  if (!dataFolder) return

  const logPath = getLogPath(dataFolder)
  const timestamp = new Date().toISOString().replace('T', ' ').replace('Z', '')
  const line = `[${timestamp}] [${level}] ${message}\n`

  try {
    // Check for rotation
    try {
      const stat = await fs.stat(logPath)
      if (stat.size > MAX_LOG_SIZE) {
        await fs.rename(logPath, logPath + '.1').catch(() => {})
      }
    } catch {
      // File doesn't exist yet, that's fine
    }

    await fs.mkdir(dataFolder, { recursive: true })
    await fs.appendFile(logPath, line, 'utf-8')
  } catch {
    // Logging should never crash the app
  }
}
