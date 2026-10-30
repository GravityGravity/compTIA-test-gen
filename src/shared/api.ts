import type { Attempt, AttemptProgress, AttemptSummary } from './exam'
import type { Catalog, ContentByKind, ContentKind, SpellData } from './types'

/** IPC channel names. The main process handles them; the preload exposes them. */
export const IPC = {
  getCatalog: 'catalog:get',
  getContent: 'content:get',
  getSpellData: 'spell:get',
  startExam: 'exam:start',
  saveAttempt: 'attempt:save',
  finishAttempt: 'attempt:finish',
  getAttempt: 'attempt:get',
  discardAttempt: 'attempt:discard',
  listAttempts: 'attempts:list',
  inProgressAttempts: 'attempts:inProgress',
  /** Renderer → main: an attempt is open (true) or not (false), so closing the window asks first. */
  setAttemptOpen: 'exam:attempt-open',
  /** Main → renderer: the user tried to close the window during an attempt. */
  closeRequested: 'exam:close-requested',
  /** Renderer → main: the attempt was saved or cancelled, so the window may close now. */
  closeConfirmed: 'app:close-confirmed'
} as const

/** The API the preload puts on `window.certPractice`. */
export interface CertPracticeApi {
  getCatalog(): Promise<Catalog>
  getContent<K extends ContentKind>(kind: K): Promise<ContentByKind[K]>
  getSpellData(): Promise<SpellData>
  /** Builds a new attempt of an active exam and saves it. Deletes the exam's attempt in progress. */
  startExam(examId: string): Promise<Attempt>
  saveAttempt(id: string, progress: AttemptProgress): Promise<void>
  /** Saves the last progress, grades the attempt, and returns it completed. */
  finishAttempt(id: string, progress: AttemptProgress): Promise<Attempt>
  getAttempt(id: string): Promise<Attempt | null>
  discardAttempt(id: string): Promise<void>
  /** Completed attempts, newest first. */
  listAttempts(): Promise<AttemptSummary[]>
  /** Attempts saved for later or interrupted. */
  inProgressAttempts(): Promise<AttemptSummary[]>
  setAttemptOpen(open: boolean): void
  /** Calls `listener` when the user tries to close the window during an attempt. Returns an unsubscribe. */
  onCloseRequested(listener: () => void): () => void
  confirmClose(): void
}
