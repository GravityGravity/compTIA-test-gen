import { join } from 'node:path'
import { app, BrowserWindow, dialog, ipcMain } from 'electron'
import { IPC } from '@shared/api'
import { loadCatalog } from './catalog'
import { loadContent, loadExamContent, spellData } from './content'
import { AttemptStore } from './db'
import { parseId, parseProgress, startExam } from './exams'

const APP_NAME = 'Cert Practice'

// config/ and content/ sit next to the app: the repo root in development,
// the resources folder in an installed build (see electron-builder.yml).
// In development, CERT_PRACTICE_DATA and CERT_PRACTICE_USER_DATA point to test data (Playwright).
const dev = !app.isPackaged
const dataRoot =
  (dev && process.env.CERT_PRACTICE_DATA) || (app.isPackaged ? process.resourcesPath : app.getAppPath())
if (dev && process.env.CERT_PRACTICE_USER_DATA) app.setPath('userData', process.env.CERT_PRACTICE_USER_DATA)

/** True while the renderer shows an exam attempt: closing the window then asks to save or cancel. */
let attemptOpen = false
let closeConfirmed = false

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
  // During an attempt, ask the renderer to show the leave dialog instead of closing.
  // Autosave still covers a crash or a forced exit.
  win.on('close', (event) => {
    if (attemptOpen && !closeConfirmed) {
      event.preventDefault()
      win.webContents.send(IPC.closeRequested)
    }
  })

  if (dev && process.env.ELECTRON_RENDERER_URL) {
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
    const content = loadContent(dataRoot)
    const examContent = loadExamContent(dataRoot, catalog.exams)
    const spell = spellData(content)
    const store = new AttemptStore(join(app.getPath('userData'), 'cert-practice.db'))
    app.on('will-quit', () => store.close())

    ipcMain.handle(IPC.getCatalog, () => catalog)
    ipcMain.handle(IPC.getContent, (_event, kind: unknown) => {
      if (kind !== 'acronyms' && kind !== 'definitions') throw new Error(`unknown content "${String(kind)}"`)
      return content[kind]
    })
    ipcMain.handle(IPC.getSpellData, () => spell)
    ipcMain.handle(IPC.startExam, (_e, examId: unknown) => startExam(catalog, examContent, store, examId))
    ipcMain.handle(IPC.saveAttempt, (_e, id: unknown, progress: unknown) =>
      store.save(parseId(id), parseProgress(progress))
    )
    ipcMain.handle(IPC.finishAttempt, (_e, id: unknown, progress: unknown) =>
      store.finish(parseId(id), parseProgress(progress))
    )
    ipcMain.handle(IPC.getAttempt, (_e, id: unknown) => store.get(parseId(id)))
    ipcMain.handle(IPC.discardAttempt, (_e, id: unknown) => store.discard(parseId(id)))
    ipcMain.handle(IPC.listAttempts, () => store.completed())
    ipcMain.handle(IPC.inProgressAttempts, () => store.inProgress())
    ipcMain.on(IPC.setAttemptOpen, (_e, open: unknown) => (attemptOpen = open === true))
    ipcMain.on(IPC.closeConfirmed, (event) => {
      closeConfirmed = true
      BrowserWindow.fromWebContents(event.sender)?.close()
    })
    createWindow()
  })
  .catch((error: unknown) => {
    // A broken config or content file: say which one, then stop.
    dialog.showErrorBox(`${APP_NAME} could not start`, error instanceof Error ? error.message : String(error))
    app.exit(1)
  })

app.on('window-all-closed', () => app.quit())
