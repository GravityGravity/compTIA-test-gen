import { describe, expect, it } from 'vitest'
import type { AttemptExam, ExamQuestion, QuestionState } from '@shared/exam'
import { credit, gradeAttempt, verdict } from './grade'

const q = (answer: number[], domain = '1'): ExamQuestion => ({
  sourceId: `q${answer.join()}`,
  origin: 'pool',
  kind: null,
  type: answer.length > 1 ? 'multiple' : 'single',
  structure: 'recall',
  qualifier: null,
  domain,
  objectives: [],
  topics: [],
  stem: 'Stem',
  options: ['A', 'B', 'C', 'D'],
  answer,
  selectCount: answer.length,
  explanation: 'Why.',
  whyWrong: ['x', 'x', 'x', 'x']
})
const state = (selected: number[] | null): QuestionState => ({
  selected,
  flagged: false,
  struck: [],
  seconds: 0
})
const exam: AttemptExam = {
  id: 'T',
  name: 'Test Exam',
  shortName: 'Test',
  certification: 'c',
  passingScore: 675,
  maxScore: 900,
  domains: [
    { id: '1', name: 'One' },
    { id: '2', name: 'Two' }
  ]
}

describe('credit', () => {
  it('gives a single question full credit or none', () => {
    expect(credit(q([1]), [1])).toBe(1)
    expect(credit(q([1]), [2])).toBe(0)
    expect(credit(q([1]), null)).toBe(0)
  })

  it('gives part credit on a multiple question only when no wrong option is selected', () => {
    expect(credit(q([0, 2]), [0, 2])).toBe(1)
    expect(credit(q([0, 2]), [0])).toBe(0.5)
    expect(credit(q([0, 2]), [0, 1])).toBe(0)
    expect(credit(q([0, 2]), [])).toBe(0)
  })

  it('names the verdict', () => {
    expect(verdict(q([0, 2]), [0])).toBe('partial')
    expect(verdict(q([1]), null)).toBe('unanswered')
    expect(verdict(q([1]), [3])).toBe('incorrect')
    expect(verdict(q([1]), [1])).toBe('correct')
  })
})

describe('gradeAttempt', () => {
  it('scores round(900 × points / questions) with a per-domain breakdown', () => {
    const questions = [q([0]), q([1]), q([0, 2], '2'), q([3], '2')]
    const result = gradeAttempt(exam, questions, [state([0]), state(null), state([2]), state([3])], 600)
    expect(result.points).toBe(2.5)
    expect(result.score).toBe(563)
    expect(result.passed).toBe(false)
    expect(result.correct).toBe(2)
    expect(result.partial).toBe(1)
    expect(result.timeUsedS).toBe(600)
    expect(result.domains).toEqual([
      { id: '1', name: 'One', correct: 1, total: 2 },
      { id: '2', name: 'Two', correct: 1, total: 2 }
    ])
  })

  it('passes at exactly the passing score', () => {
    // 3 of 4 correct = 675.
    const questions = [q([0]), q([0]), q([0]), q([0])]
    const result = gradeAttempt(exam, questions, [state([0]), state([0]), state([0]), state([1])], 0)
    expect(result.score).toBe(675)
    expect(result.passed).toBe(true)
  })
})
