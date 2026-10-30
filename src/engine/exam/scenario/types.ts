import type { Grammar, Qualifier, ScenarioRecord, Structure } from '@shared/exam'
import type { Random } from '../../random'

export interface GenerateContext {
  rng: Random
  grammar: Grammar
  /** Every scenario record of the exam, by id (for `related`). */
  byId: ReadonlyMap<string, ScenarioRecord>
}

/** A generated question before the options are shuffled. The correct options come first. */
export interface Draft {
  stem: string
  options: string[]
  answer: number[]
  explanation: string
  whyWrong: (string | null)[]
  structure: Structure
}

export interface ScenarioGenerator<R extends ScenarioRecord> {
  /** False when the record cannot make a question (for example too few distractors). */
  canGenerate(record: R, ctx: GenerateContext): boolean
  generate(record: R, ctx: GenerateContext): Draft
}

/** The qualifier word in a stem, if any (the grammar writes it in capitals). */
export function qualifierOf(stem: string): Qualifier | null {
  const m = /\b(MOST LIKELY|BEST|FIRST|NEXT|LEAST)\b/.exec(stem)
  return m ? (m[1] as Qualifier) : null
}
