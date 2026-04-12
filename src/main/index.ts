import { app, BrowserWindow, Tray, Menu, nativeImage, ipcMain } from 'electron'
import path from 'path'
import { initDatabase, closeDatabase } from './database'
import { loadAppConfig, saveAppConfig } from './storage/appconfig'
import { loadSettings } from './storage/settings'
import { registerIpcHandlers } from './ipc-handlers'
import { log } from './utils/logger'
import type { AppConfig, Settings } from './types'

let mainWindow: BrowserWindow | null = null
let tray: Tray | null = null
let appConfig: AppConfig | null = null
let settings: Settings | null = null

function createWindow(): void {
  const bounds = appConfig?.windowBounds ?? { x: 100, y: 80, width: 1200, height: 800 }

  mainWindow = new BrowserWindow({
    ...bounds,
    minWidth: 900,
    minHeight: 600,
    title: 'Kogneet',
    show: false,
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow?.show()
  })

  // Save window bounds on move/resize (debounced)
  let boundsTimer: ReturnType<typeof setTimeout> | null = null
  const saveBounds = (): void => {
    if (boundsTimer) clearTimeout(boundsTimer)
    boundsTimer = setTimeout(() => {
      if (mainWindow && appConfig) {
        const b = mainWindow.getBounds()
        appConfig.windowBounds = { x: b.x, y: b.y, width: b.width, height: b.height }
        saveAppConfig(appConfig)
      }
    }, 500)
  }
  mainWindow.on('resize', saveBounds)
  mainWindow.on('move', saveBounds)

  // Minimise to tray on close
  mainWindow.on('close', (e) => {
    if (tray) {
      e.preventDefault()
      mainWindow?.hide()
    }
  })

  // Load the renderer
  if (process.env.ELECTRON_RENDERER_URL) {
    mainWindow.loadURL(process.env.ELECTRON_RENDERER_URL)
  } else {
    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'))
  }
}

function createTray(): void {
  const iconPath = path.join(__dirname, '../../resources/icon.png')
  let icon: Electron.NativeImage
  try {
    icon = nativeImage.createFromPath(iconPath)
  } catch {
    icon = nativeImage.createEmpty()
  }

  tray = new Tray(icon)
  tray.setToolTip('Kogneet')

  const contextMenu = Menu.buildFromTemplate([
    { label: 'Show', click: () => mainWindow?.show() },
    { type: 'separator' },
    { label: 'Quit', click: () => { tray = null; app.quit() } }
  ])

  tray.setContextMenu(contextMenu)
  tray.on('double-click', () => mainWindow?.show())
}

async function bootstrap(): Promise<void> {
  // Load machine-specific config
  appConfig = await loadAppConfig()
  const isFirstLaunch = !appConfig

  if (!isFirstLaunch && appConfig) {
    // Initialise SQLite database
    await initDatabase(appConfig.dataFolder)

    // Load portable settings
    settings = await loadSettings(appConfig.dataFolder)

    await log('INFO', 'Kogneet started')
  }

  // Register IPC handlers
  registerIpcHandlers({
    getAppConfig: () => appConfig,
    setAppConfig: (c) => { appConfig = c },
    getSettings: () => settings,
    setSettings: (s) => { settings = s },
    isFirstLaunch: () => isFirstLaunch
  })

  createWindow()
  createTray()

  if (!isFirstLaunch && settings) {
    // Start services for returning users
    await startServices()
  }
}

async function startServices(): Promise<void> {
  // Services will be added as phases are implemented:
  // - Feed scheduler (Phase 12)
  // - Email scheduler (Phase 16)
  // - IMAP polling (Phase 20)
  // - Cowork file watcher (Phase 15)
  await log('INFO', 'Services started')
}

app.whenReady().then(bootstrap)

app.on('before-quit', () => {
  closeDatabase()
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
