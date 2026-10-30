import type { FaultRecord } from '@shared/exam'
import { distractorRecords, say } from './common'
import { joinList } from './grammar'
import type { Draft, GenerateContext, ScenarioGenerator } from './types'

type Ask = 'cause' | 'action' | 'first'

function asks(record: FaultRecord, ctx: GenerateContext): Ask[] {
  const out: Ask[] = []
  if (distractorRecords(record, ctx, (r) => r.answer.cause, 3).length === 3) out.push('cause')
  if (distractorRecords(record, ctx, (r) => r.answer.action, 3).length === 3) out.push('action')
  if (record.firstStep && distractorRecords(record, ctx, (r) => r.answer.action, 2).length === 2)
    out.push('first')
  return out
}

/** Troubleshooting: MOST LIKELY cause, BEST action, or FIRST step, from 2–3 of the record's clues. */
export const fault: ScenarioGenerator<FaultRecord> = {
  canGenerate: (record, ctx) => asks(record, ctx).length > 0,

  generate(record, ctx): Draft {
    const { rng } = ctx
    const ask = rng.pick(asks(record, ctx))
    const clues = rng.sample(record.clues, Math.min(record.clues.length, rng.int(2, 3)))
    const opening = say(ctx, 'faultOpening', record)
    const link = say(ctx, 'linkClues', record, { clues: [joinList(clues)] })
    const explanation = `${record.explanation} ${link}`

    if (ask === 'first') {
      const others = distractorRecords(record, ctx, (r) => r.answer.action, 2)
      return {
        stem: `${opening} ${joinList(clues)}. ${say(ctx, 'askFirst', record)}`,
        options: [record.firstStep!, record.answer.action, ...others.map((r) => r.answer.action)],
        answer: [0],
        explanation: `${explanation} ${say(ctx, 'firstReason', record)}`,
        whyWrong: [
          null,
          say(ctx, 'wrongFirstFix', record),
          ...others.map((r) => say(ctx, 'wrongAction', r, { fits: [r.appliesWhen] }))
        ],
        structure: 'scenario'
      }
    }
    const text = ask === 'cause' ? (r: FaultRecord) => r.answer.cause : (r: FaultRecord) => r.answer.action
    const others = distractorRecords(record, ctx, text, 3)
    const capital = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)
    return {
      stem: `${opening} ${joinList(clues)}. ${say(ctx, ask === 'cause' ? 'askCause' : 'askAction', record)}`,
      options: [record, ...others].map((r) => capital(text(r))),
      answer: [0],
      explanation,
      whyWrong: [
        null,
        ...others.map((r) =>
          say(ctx, ask === 'cause' ? 'wrongCause' : 'wrongAction', r, { fits: [r.appliesWhen] })
        )
      ],
      structure: 'scenario'
    }
  }
}
