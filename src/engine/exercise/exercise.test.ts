import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import type { AcronymRecord, DefinitionRecord, ExerciseConfig } from '@shared/types'
import { createSpellChecker } from '../spell'
import { generateExercise, NotEnoughRecordsError } from './generate'
import { gradeChoice, gradeTyped, summarize } from './grade'
import { buildPool } from './pool'
import type { AnswerResult, TypedQuestion } from './types'

const config: ExerciseConfig = {
  id: 'acronym-exercise',
  name: 'Acronym Exercise',
  active: true,
  content: 'acronyms',
  certifications: ['a-plus', 'network-plus'],
  questionCount: 5,
  timeLimitMinutes: 12,
  onTimeUp: 'end',
  selection: 'random',
  questionTypes: [{ type: 'typed', prompt: 'acronym', answer: 'expanded', count: 5 }]
}

const acronym = (n: number, overrides: Partial<AcronymRecord> = {}): AcronymRecord => ({
  id: `acr-${n}`,
  acronym: `A${n}`,
  expanded: `Expanded ${n}`,
  meaning: `Meaning ${n}.`,
  acceptedAnswers: [],
  certifications: ['a-plus'],
  exams: ['220-1201'],
  objectives: [],
  ...overrides
})

const records = [
  ...Array.from({ length: 8 }, (_, i) => acronym(i)),
  acronym(100, { exams: ['220-1202'] }),
  acronym(101, { exams: ['220-1201', '220-1202'] }),
  acronym(200, { certifications: ['network-plus'], exams: ['N10-009'] })
]

describe('buildPool', () => {
  it('keeps the records of the certification and the selected exams', () => {
    expect(buildPool(records, 'a-plus', ['220-1202']).map((r) => r.id)).toEqual(['acr-100', 'acr-101'])
    expect(buildPool(records, 'a-plus', ['220-1201', '220-1202'])).toHaveLength(10)
    expect(buildPool(records, 'network-plus', ['N10-009']).map((r) => r.id)).toEqual(['acr-200'])
  })
})

describe('generateExercise', () => {
  const pool = buildPool(records, 'a-plus', ['220-1201'])

  it('makes questionCount questions with no repeats', () => {
    const questions = generateExercise(config, pool, 1)
    expect(questions).toHaveLength(5)
    expect(new Set(questions.map((q) => q.recordId)).size).toBe(5)
  })

  it('gives the same exercise for the same seed, and another for another seed', () => {
    const ids = (seed: number) => generateExercise(config, pool, seed).map((q) => q.recordId)
    expect(ids(42)).toEqual(ids(42))
    expect(ids(42)).not.toEqual(ids(43))
  })

  it('asks acronym → expanded form and accepts the other wordings', () => {
    const one = generateExercise(
      { ...config, questionCount: 1, questionTypes: [{ ...config.questionTypes[0]!, count: 1 }] },
      [acronym(7, { acceptedAnswers: ['Other wording'] })],
      1
    )[0]!
    expect(one).toMatchObject({ prompt: 'acronym', text: 'A7', answer: 'Expanded 7', meaning: 'Meaning 7.' })
    expect(one.kind === 'typed' && one.accepted).toEqual(['Expanded 7', 'Other wording'])
  })

  it('fails when the pool is too small', () => {
    expect(() => generateExercise(config, pool.slice(0, 3), 1)).toThrow(NotEnoughRecordsError)
  })
})

describe('gradeTyped', () => {
  const aff = readFileSync('node_modules/dictionary-en/index.aff', 'utf8')
  const dic = readFileSync('node_modules/dictionary-en/index.dic', 'utf8')
  const spell = createSpellChecker(aff, dic, ['Domain Name System', 'Basic Input/Output System'])
  const question: TypedQuestion = {
    kind: 'typed',
    recordId: 'dns',
    prompt: 'acronym',
    text: 'DNS',
    answer: 'Domain Name System',
    accepted: ['Domain Name System', 'Domain Name Service'],
    objectives: []
  }

  it('accepts the answer with any case, spacing, and punctuation', () => {
    expect(gradeTyped(question, '  domain-name   SYSTEM.', spell).correct).toBe(true)
  })

  it('accepts an accepted wording', () => {
    expect(gradeTyped(question, 'Domain Name Service', spell).correct).toBe(true)
  })

  it('marks a spelling error incorrect and reports the word', () => {
    const result = gradeTyped(question, 'Domain Name Sytem', spell)
    expect(result.correct).toBe(false)
    expect(result.misspelled.map((w) => w.word)).toEqual(['Sytem'])
  })

  it('accepts no close matches', () => {
    expect(gradeTyped(question, 'Domain Names System', spell).correct).toBe(false)
    expect(gradeTyped(question, 'Domain System', spell).correct).toBe(false)
  })
})

describe('summarize', () => {
  it('counts "Not sure" and unanswered as incorrect, and counts spelling errors', () => {
    const results: AnswerResult[] = [
      { status: 'answered', text: 'a', correct: true, misspelled: [] },
      { status: 'answered', text: 'b', correct: false, misspelled: [{ word: 'b', start: 0, end: 1 }] },
      { status: 'answered', text: 'c', correct: false, misspelled: [] },
      { status: 'unsure' },
      { status: 'unanswered' }
    ]
    expect(summarize(results)).toEqual({ total: 5, correct: 1, incorrect: 4, spellingErrors: 1, percent: 20 })
  })
})

describe('multiple choice', () => {
  const def = (n: number, group: string, overrides: Partial<DefinitionRecord> = {}): DefinitionRecord => ({
    id: `def-${n}`,
    term: `Term ${n}`,
    definition: `Definition ${n}.`,
    typeable: true,
    group,
    acceptedAnswers: [],
    certifications: ['a-plus'],
    exams: ['220-1201'],
    objectives: [],
    ...overrides
  })
  const mc: ExerciseConfig = {
    ...config,
    content: 'definitions',
    questionCount: 1,
    questionTypes: [{ type: 'multiple-choice', direction: 'term-to-definition', choices: 4, count: 1 }]
  }

  it('takes distractors from the same group first', () => {
    const records = [def(1, 'g'), def(2, 'g'), def(3, 'g'), def(4, 'g'), def(5, 'other'), def(6, 'other')]
    for (const seed of [1, 2, 3, 4, 5]) {
      const [q] = generateExercise(mc, [records[0]!], seed, records)
      expect(q?.kind === 'multiple-choice' && [...q.options].sort()).toEqual([
        'Definition 1.',
        'Definition 2.',
        'Definition 3.',
        'Definition 4.'
      ])
    }
  })

  it('never uses a record with the same term or definition as a distractor', () => {
    const records = [
      def(1, 'g'),
      def(2, 'g', { term: 'Term 1' }),
      def(3, 'g', { definition: 'Definition 1.' }),
      def(4, 'g'),
      def(5, 'h'),
      def(6, 'h')
    ]
    const [q] = generateExercise(mc, [records[0]!], 7, records)
    expect(q?.kind === 'multiple-choice' && q.options).not.toContain('Definition 2.')
  })

  it('grades the selected option', () => {
    const [q] = generateExercise(mc, [def(1, 'g')], 1, [def(1, 'g'), def(2, 'g'), def(3, 'g'), def(4, 'g')])
    if (q?.kind !== 'multiple-choice') throw new Error('expected multiple choice')
    expect(gradeChoice(q, q.correctIndex).correct).toBe(true)
    expect(gradeChoice(q, (q.correctIndex + 1) % 4).correct).toBe(false)
  })
})
