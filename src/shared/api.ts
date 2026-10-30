import type { Catalog } from './types'

/** IPC channel names. The main process handles them; the preload exposes them. */
export const IPC = {
  getCatalog: 'catalog:get'
} as const

/** The API the preload puts on `window.certPractice`. */
export interface CertPracticeApi {
  getCatalog(): Promise<Catalog>
}
