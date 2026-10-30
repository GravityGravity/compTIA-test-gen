import { generateExam } from '@engine/exam/generate'
import { newSeed } from '@engine/random'
import type { Attempt, AttemptExam, AttemptProgress, ExamContent, QuestionState } from '@shared/exam'
import type { Catalog, ExamConfig } from '@shared/types'
import type { AttemptStore } from './db'

/** The exam values saved with an attempt. */
export function examSnapshot(config: ExamConfig): AttemptExam {
  return {
    id: config.id,
    name: config.name,
    shortName: config.shortName,
    certification: config.certification,
    passingScore: config.passingScore,
    maxScore: config.maxScore,
    domains: config.domains.map((d) => ({ id: d.id, name: d.name }))
  }
}

/** Builds a new attempt of an active exam from its content and the user's seen counts, and saves it. */
export function startExam(
  catalog: Catalog,
  content: Readonly<Record<string, ExamContent>>,
  store: AttemptStore,
  examId: unknown,
  seed: number = newSeed()
): Attempt {
  const config = catalog.exams.find((e) => e.id === examId)
  if (!config) throw new Error(`unknown exam "${String(examId)}"`)
  const certification = catalog.certifications.find((c) => c.id === config.certification)
  if (!config.active || !certification?.active) throw new Error(`${config.name} is not available yet`)
  const questions = generateExam(config, content[config.id]!, seed, store.seenCounts(config.id))
  return store.create({
    exam: examSnapshot(config),
    seed,
    timeLimitS: config.timeLimitMinutes * 60,
    questions
  })
}

/** Checks the progress the renderer sends, so a bad message cannot write junk to the database. */
export function parseProgress(raw: unknown): AttemptProgress {
  const p = raw as Partial<AttemptProgress> | null
  const num = (n: unknown) => typeof n === 'number' && Number.isFinite(n)
  if (!p || !num(p.timeLeftS) || !num(p.currentIndex) || !Array.isArray(p.states))
    throw new Error('bad attempt progress')
  const states = p.states.map((s: Partial<QuestionState>): QuestionState => {
    const selected = s?.selected
    if (
      selected !== null &&
      !(Array.isArray(selected) && selected.every((k) => Number.isInteger(k) && k >= 0))
    )
      throw new Error('bad selected answer')
    if (!Array.isArray(s.struck) || !s.struck.every((x) => typeof x === 'boolean'))
      throw new Error('bad struck options')
    return {
      selected: selected ?? null,
      flagged: s.flagged === true,
      struck: s.struck,
      seconds: num(s.seconds) ? s.seconds! : 0
    }
  })
  return { timeLeftS: p.timeLeftS!, currentIndex: p.currentIndex!, states }
}

export function parseId(raw: unknown): string {
  if (typeof raw !== 'string' || !/^[0-9a-f-]{36}$/.test(raw)) throw new Error('bad attempt id')
  return raw
}
