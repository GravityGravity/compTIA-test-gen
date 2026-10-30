import type { RequirementRecord } from '@shared/exam'
import { distractorRecords, say } from './common'
import { joinList } from './grammar'
import type { Draft, ScenarioGenerator } from './types'

/** A need with conditions: which tool, setting, command, device, or method BEST meets it. */
export const requirement: ScenarioGenerator<RequirementRecord> = {
  canGenerate: (record, ctx) => distractorRecords(record, ctx, (r) => r.answer.item, 3).length === 3,

  generate(record, ctx): Draft {
    const { rng } = ctx
    const clues = rng.sample(record.clues, Math.min(record.clues.length, rng.int(1, 2)))
    const others = distractorRecords(record, ctx, (r) => r.answer.item, 3)
    const need = say(ctx, 'requirementOpening', record, { need: [record.need] })
    const conditions = say(ctx, 'conditionLead', record, { conditions: [joinList(clues)] })
    const ask = say(ctx, 'askItem', record, { itemType: [record.itemType] })
    return {
      stem: `${need} ${conditions} ${ask}`,
      options: [record, ...others].map((r) => r.answer.item),
      answer: [0],
      explanation: `${record.explanation} ${say(ctx, 'linkConditions', record, { conditions: [joinList(clues)] })}`,
      whyWrong: [null, ...others.map((r) => say(ctx, 'wrongItem', r, { fits: [r.appliesWhen] }))],
      structure: 'scenario'
    }
  }
}
