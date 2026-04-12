import path from 'path'
import { app } from 'electron'

/** App config directory: %APPDATA%/Kogneet */
export function getConfigDir(): string {
  return path.join(app.getPath('appData'), 'Kogneet')
}

/** Machine-specific config file path */
export function getAppConfigPath(): string {
  return path.join(getConfigDir(), 'appconfig.json')
}

/** Portable settings file */
export function getSettingsPath(dataFolder: string): string {
  return path.join(dataFolder, 'settings.json')
}

/** SQLite database file */
export function getDatabasePath(dataFolder: string): string {
  return path.join(dataFolder, 'kogneet.db')
}

/** Per-feed SKILL.md directory */
export function getSkillsDir(dataFolder: string): string {
  return path.join(dataFolder, 'skills')
}

/** SKILL.md file for a specific feed */
export function getSkillPath(dataFolder: string, feedId: string): string {
  return path.join(getSkillsDir(dataFolder), `${feedId}.skill.md`)
}

/** Raw feed data by date */
export function getRawDir(dataFolder: string): string {
  return path.join(dataFolder, 'raw')
}

export function getRawDateDir(dataFolder: string, date: string): string {
  return path.join(getRawDir(dataFolder), date)
}

/** Processed (AI-enriched) data by date */
export function getProcessedDir(dataFolder: string): string {
  return path.join(dataFolder, 'processed')
}

export function getProcessedDateDir(dataFolder: string, date: string): string {
  return path.join(getProcessedDir(dataFolder), date)
}

/** Audio output directory (v2) */
export function getAudioDir(dataFolder: string): string {
  return path.join(dataFolder, 'audio')
}

/** Cowork integration directory */
export function getCoworkDir(dataFolder: string): string {
  return path.join(dataFolder, 'cowork')
}

/** App log file */
export function getLogPath(dataFolder: string): string {
  return path.join(dataFolder, 'app.log')
}

/** Email log file */
export function getEmailLogPath(dataFolder: string): string {
  return path.join(dataFolder, 'email_log.csv')
}

/** Format a date as YYYY-MM-DD */
export function formatDate(d: Date = new Date()): string {
  return d.toISOString().split('T')[0]
}
