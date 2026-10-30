import type { ProcedureRecord } from '@shared/exam'
import { say } from './common'
import { lowerFirst } from './grammar'
import type { Draft, ScenarioGenerator } from './types'

/**
 * Ordered steps: the FIRST step, or the NEXT step after one that is done. The distractors are other
 * steps of the same procedure; each one's explanation says whether it comes earlier or later.
 */
export const procedure: ScenarioGenerator<ProcedureRecord> = {
  canGenerate: (record) => record.steps.length >= 4,

  generate(record, ctx): Draft {
    const { rng } = ctx
    const steps = record.steps
    const next = steps.length >= 5 && rng.next() < 0.7
    // For NEXT: the step that was just done; the answer is the one after it.
    const done = next ? rng.int(0, steps.length - 2) : -1
    const target = done + 1
    const others = rng.sample(
      steps.map((_, j) => j).filter((j) => j !== target && j !== done),
      3
    )
    const opening = say(ctx, 'procedureOpening', record, { task: [record.task] })
    const ask = next
      ? `${say(ctx, 'stepDone', record, { done: [steps[done]!.done] })} ${say(ctx, 'askNext', record)}`
      : say(ctx, 'askFirst', record)
    const order = steps.map((s, j) => `(${j + 1}) ${lowerFirst(s.do)}`).join(', ')
    return {
      stem: `${opening} ${ask}`,
      options: [target, ...others].map((j) => steps[j]!.do),
      answer: [0],
      explanation: `${record.explanation} ${say(ctx, 'stepOrder', record, { order: [order] })}`,
      whyWrong: [
        null,
        ...others.map((j) => say(ctx, j < target ? 'wrongStepEarlier' : 'wrongStepLater', record))
      ],
      structure: 'procedure'
    }
  }
}
