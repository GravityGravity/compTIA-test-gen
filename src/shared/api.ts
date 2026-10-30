import type { Catalog, ContentByKind, ContentKind, SpellData } from './types'

/** IPC channel names. The main process handles them; the preload exposes them. */
export const IPC = {
  getCatalog: 'catalog:get',
  getContent: 'content:get',
  getSpellData: 'spell:get'
} as const

/** The API the preload puts on `window.certPractice`. */
export interface CertPracticeApi {
  getCatalog(): Promise<Catalog>
  getContent<K extends ContentKind>(kind: K): Promise<ContentByKind[K]>
  getSpellData(): Promise<SpellData>
}
