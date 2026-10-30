import { contextBridge, ipcRenderer } from 'electron'
import { IPC, type CertPracticeApi } from '../shared/api'

const api: CertPracticeApi = {
  getCatalog: () => ipcRenderer.invoke(IPC.getCatalog),
  getContent: (kind) => ipcRenderer.invoke(IPC.getContent, kind),
  getSpellData: () => ipcRenderer.invoke(IPC.getSpellData),
  startExam: (examId) => ipcRenderer.invoke(IPC.startExam, examId),
  saveAttempt: (id, progress) => ipcRenderer.invoke(IPC.saveAttempt, id, progress),
  finishAttempt: (id, progress) => ipcRenderer.invoke(IPC.finishAttempt, id, progress),
  getAttempt: (id) => ipcRenderer.invoke(IPC.getAttempt, id),
  discardAttempt: (id) => ipcRenderer.invoke(IPC.discardAttempt, id),
  listAttempts: () => ipcRenderer.invoke(IPC.listAttempts),
  inProgressAttempts: () => ipcRenderer.invoke(IPC.inProgressAttempts),
  setAttemptOpen: (open) => ipcRenderer.send(IPC.setAttemptOpen, open),
  onCloseRequested: (listener) => {
    // Pass no event object to the page.
    const handler = () => listener()
    ipcRenderer.on(IPC.closeRequested, handler)
    return () => ipcRenderer.removeListener(IPC.closeRequested, handler)
  },
  confirmClose: () => ipcRenderer.send(IPC.closeConfirmed)
}

contextBridge.exposeInMainWorld('certPractice', api)
