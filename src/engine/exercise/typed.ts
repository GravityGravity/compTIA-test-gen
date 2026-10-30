import type { AcronymRecord, DefinitionRecord, QuestionTypeConfig } from '@shared/types'
import type { TypedQuestion } from './types'

type TypedConfig = Extract<QuestionTypeConfig, { type: 'typed' }>

export function canAskTyped(config: TypedConfig, record: AcronymRecord | DefinitionRecord): boolean {
  if (config.prompt === 'acronym') return 'acronym' in record
  return 'term' in record && (config.requires !== 'typeable' || record.typeable)
}

export function typedQuestion(config: TypedConfig, record: AcronymRecord | DefinitionRecord): TypedQuestion {
  if ('acronym' in record) {
    return {
      kind: 'typed',
      recordId: record.id,
      prompt: 'acronym',
      text: record.acronym,
      answer: record.expanded,
      accepted: [record.expanded, ...record.acceptedAnswers],
      meaning: record.meaning,
      objectives: record.objectives
    }
  }
  if (config.prompt !== 'definition') throw new Error(`a ${config.prompt} question needs an acronym record`)
  return {
    kind: 'typed',
    recordId: record.id,
    prompt: 'definition',
    text: record.definition,
    answer: record.term,
    accepted: [record.term, ...record.acceptedAnswers],
    objectives: record.objectives
  }
}
