import { contextBridge, ipcRenderer } from 'electron'
import { IPC, type CertPracticeApi } from '../shared/api'

const api: CertPracticeApi = {
  getCatalog: () => ipcRenderer.invoke(IPC.getCatalog)
}

contextBridge.exposeInMainWorld('certPractice', api)
