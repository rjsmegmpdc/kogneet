import fs from 'fs/promises'
import path from 'path'
import type { AppConfig } from '../types'
import { getAppConfigPath, getConfigDir } from '../utils/paths'
import { atomicWrite } from '../utils/atomic-write'
import { app } from 'electron'

export function getDefaultAppConfig(): AppConfig {
  return {
    dataFolder: path.join(app.getPath('documents'), 'Kogneet'),
    windowBounds: { x: 100, y: 80, width: 1200, height: 800 }
  }
}

export async function loadAppConfig(): Promise<AppConfig | null> {
  try {
    const data = await fs.readFile(getAppConfigPath(), 'utf-8')
    return JSON.parse(data) as AppConfig
  } catch {
    return null
  }
}

export async function saveAppConfig(config: AppConfig): Promise<void> {
  const dir = getConfigDir()
  await fs.mkdir(dir, { recursive: true })
  await atomicWrite(getAppConfigPath(), JSON.stringify(config, null, 2))
}
