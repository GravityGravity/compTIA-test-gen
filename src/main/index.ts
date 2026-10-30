import { join } from 'node:path'
import { app, BrowserWindow, dialog, ipcMain } from 'electron'
import { IPC } from '@shared/api'
import { loadCatalog } from './catalog'

const APP_NAME = 'Cert Practice'

// config/ and content/ sit next to the app: the repo root in development,
// the resources folder in an installed build (see electron-builder.yml).
const dataRoot = app.isPackaged ? process.resourcesPath : app.getAppPath()

function createWindow(): BrowserWindow {
  const win = new BrowserWindow({
    title: APP_NAME,
    width: 1280,
    height: 860,
    minWidth: 1024,
    minHeight: 720,
    show: false,
    autoHideMenuBar: true,
    webPreferences: {
      preload: join(import.meta.dirname, '../preload/index.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  })

  win.once('ready-to-show', () => win.show())
  // No popups and no navigation away from the app.
  win.webContents.setWindowOpenHandler(() => ({ action: 'deny' }))
  win.webContents.on('will-navigate', (event) => event.preventDefault())

  if (!app.isPackaged && process.env.ELECTRON_RENDERER_URL) {
    void win.loadURL(process.env.ELECTRON_RENDERER_URL)
  } else {
    void win.loadFile(join(import.meta.dirname, '../renderer/index.html'))
  }
  return win
}

app.setName(APP_NAME)

app
  .whenReady()
  .then(() => {
    const catalog = loadCatalog(dataRoot)
    ipcMain.handle(IPC.getCatalog, () => catalog)
    createWindow()
  })
  .catch((error: unknown) => {
    // A broken config or content file: say which one, then stop.
    dialog.showErrorBox(`${APP_NAME} could not start`, error instanceof Error ? error.message : String(error))
    app.exit(1)
  })

app.on('window-all-closed', () => app.quit())
