import type { AcronymRecord, DefinitionRecord, ExerciseConfig, QuestionTypeConfig } from '@shared/types'
import { createRandom } from '../random'
import { canAskMultipleChoice, multipleChoiceQuestion } from './multipleChoice'
import { canAskTyped, typedQuestion } from './typed'
import type { ExerciseQuestion } from './types'

type ContentRecord = AcronymRecord | DefinitionRecord

export class NotEnoughRecordsError extends Error {}

function canAsk(qt: QuestionTypeConfig, record: ContentRecord): boolean {
  return qt.type === 'typed' ? canAskTyped(qt, record) : canAskMultipleChoice(record)
}

/**
 * Builds one exercise from its config: for each question type, `count` records picked at random
 * from the pool, with no record used twice; then the questions in random order.
 * Question types with a requirement (for example typeable records) pick first, so the open
 * types cannot use up the records they need.
 * `distractorSource`: the records multiple-choice distractors come from (default: the pool).
 * The same seed and records give the same exercise.
 */
export function generateExercise(
  config: ExerciseConfig,
  pool: readonly ContentRecord[],
  seed: number,
  distractorSource: readonly ContentRecord[] = pool
): ExerciseQuestion[] {
  const rng = createRandom(seed)
  const used = new Set<string>()
  const questions: ExerciseQuestion[] = []
  const definitions = distractorSource.filter(canAskMultipleChoice)
  const order = [...config.questionTypes].sort(
    (a, b) => Number('requires' in b && !!b.requires) - Number('requires' in a && !!a.requires)
  )

  for (const qt of order) {
    const candidates = pool.filter((r) => !used.has(r.id) && canAsk(qt, r))
    if (candidates.length < qt.count)
      throw new NotEnoughRecordsError(
        `${config.name}: ${qt.count} ${qt.type} questions need ${qt.count} records, but the pool has ${candidates.length}`
      )
    for (const record of rng.sample(candidates, qt.count)) {
      used.add(record.id)
      if (qt.type === 'typed') questions.push(typedQuestion(qt, record))
      else if (canAskMultipleChoice(record))
        questions.push(multipleChoiceQuestion(qt, record, definitions, rng))
    }
  }
  return rng.shuffle(questions)
}
