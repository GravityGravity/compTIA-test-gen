import { contextBridge, ipcRenderer } from 'electron'
import { IPC, type CertPracticeApi } from '../shared/api'

const api: CertPracticeApi = {
  getCatalog: () => ipcRenderer.invoke(IPC.getCatalog),
  getContent: (kind) => ipcRenderer.invoke(IPC.getContent, kind),
  getSpellData: () => ipcRenderer.invoke(IPC.getSpellData)
}

contextBridge.exposeInMainWorld('certPractice', api)
