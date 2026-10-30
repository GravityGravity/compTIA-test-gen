import type { DefinitionRecord, QuestionTypeConfig } from '@shared/types'
import { normalizeAnswer } from '../normalize'
import type { Random } from '../random'
import type { Direction, MultipleChoiceQuestion } from './types'

type ChoiceConfig = Extract<QuestionTypeConfig, { type: 'multiple-choice' }>

export class NotEnoughDistractorsError extends Error {}

export function canAskMultipleChoice(record: object): record is DefinitionRecord {
  return 'term' in record && 'definition' in record
}

function pickDirection(config: ChoiceConfig, rng: Random): Direction {
  if (config.direction !== 'random') return config.direction
  return rng.pick(config.directions ?? ['term-to-definition', 'definition-to-term'])
}

/**
 * Distractors come from the same group first, then from the rest of the certification's records.
 * A record that shares the term or the definition with the target is never a distractor,
 * and no two options have the same text.
 */
// Normalized term and definition of each record, computed once.
const keys = new WeakMap<DefinitionRecord, { term: string; definition: string }>()
function keyOf(r: DefinitionRecord) {
  let k = keys.get(r)
  if (!k) keys.set(r, (k = { term: normalizeAnswer(r.term), definition: normalizeAnswer(r.definition) }))
  return k
}

function distractors(
  target: DefinitionRecord,
  candidates: readonly DefinitionRecord[],
  field: 'term' | 'definition',
  count: number,
  rng: Random
): string[] {
  const t = keyOf(target)
  const isTwin = (r: DefinitionRecord) =>
    r.id === target.id || keyOf(r).term === t.term || keyOf(r).definition === t.definition

  const seen = new Set([t[field]])
  const picked: string[] = []
  const take = (records: readonly DefinitionRecord[]) => {
    for (const r of rng.shuffle(records)) {
      if (picked.length === count) return
      if (isTwin(r) || seen.has(keyOf(r)[field])) continue
      seen.add(keyOf(r)[field])
      picked.push(r[field])
    }
  }
  take(candidates.filter((r) => r.group === target.group))
  // Other groups only when the target's group runs short.
  if (picked.length < count) take(candidates.filter((r) => r.group !== target.group))
  if (picked.length < count)
    throw new NotEnoughDistractorsError(`${target.id}: only ${picked.length} of ${count} distractors`)
  return picked
}

/** `candidates`: the records distractors may come from (the same module and certification). */
export function multipleChoiceQuestion(
  config: ChoiceConfig,
  record: DefinitionRecord,
  candidates: readonly DefinitionRecord[],
  rng: Random
): MultipleChoiceQuestion {
  const direction = pickDirection(config, rng)
  const field = direction === 'term-to-definition' ? 'definition' : 'term'
  const answer = record[field]
  const options = rng.shuffle([answer, ...distractors(record, candidates, field, config.choices - 1, rng)])
  return {
    kind: 'multiple-choice',
    recordId: record.id,
    direction,
    text: direction === 'term-to-definition' ? record.term : record.definition,
    options,
    correctIndex: options.indexOf(answer),
    answer,
    term: record.term,
    definition: record.definition,
    objectives: record.objectives
  }
}
