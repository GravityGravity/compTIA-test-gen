import { describe, expect, it } from 'vitest'
import type { AttemptExam, ExamQuestion, QuestionState } from '@shared/exam'
import { AttemptStore } from './db'

const exam: AttemptExam = {
  id: '220-1201',
  name: 'Core 1 Exam',
  shortName: 'Core 1',
  certification: 'a-plus',
  passingScore: 675,
  maxScore: 900,
  domains: [{ id: '1', name: 'Mobile Devices' }]
}

const question = (id: string): ExamQuestion => ({
  sourceId: id,
  origin: 'pool',
  kind: null,
  type: 'single',
  structure: 'recall',
  qualifier: null,
  domain: '1',
  objectives: ['220-1201/1.2'],
  topics: ['220-1201/1.2.1'],
  stem: `Question ${id}?`,
  options: ['A', 'B', 'C', 'D'],
  answer: [0],
  selectCount: 1,
  explanation: 'Because. It is so.',
  whyWrong: [null, 'No.', 'No.', 'No.']
})

const states = (selected: (number[] | null)[]): QuestionState[] =>
  selected.map((s, i) => ({
    selected: s,
    flagged: i === 1,
    struck: [false, false, true, false],
    seconds: 10 + i
  }))

function store() {
  let t = Date.parse('2026-10-30T10:00:00Z')
  return new AttemptStore(':memory:', () => new Date((t += 60_000)))
}

describe('AttemptStore', () => {
  it('saves the full questions and the progress, and resumes them', () => {
    const db = store()
    const a = db.create({ exam, seed: 5, timeLimitS: 5400, questions: [question('q1'), question('q2')] })
    expect(a.status).toBe('in_progress')
    expect(a.questions[0]).toEqual(question('q1'))
    db.save(a.id, { timeLeftS: 4000, currentIndex: 1, states: states([[0], null]) })
    const back = db.get(a.id)!
    expect(back.timeLeftS).toBe(4000)
    expect(back.currentIndex).toBe(1)
    expect(back.states).toEqual(states([[0], null]))
    expect(db.inProgress()).toMatchObject([{ id: a.id, answered: 1, flagged: 1, questionCount: 2 }])
  })

  it('keeps one attempt in progress for each exam', () => {
    const db = store()
    const first = db.create({ exam, seed: 1, timeLimitS: 60, questions: [question('q1')] })
    const second = db.create({ exam, seed: 2, timeLimitS: 60, questions: [question('q1')] })
    expect(db.get(first.id)).toBeNull()
    expect(db.inProgress().map((s) => s.id)).toEqual([second.id])
  })

  it('grades a finished attempt and lists it with its score', () => {
    const db = store()
    const a = db.create({ exam, seed: 1, timeLimitS: 5400, questions: [question('q1'), question('q2')] })
    const done = db.finish(a.id, { timeLeftS: 5000, currentIndex: 1, states: states([[0], [1]]) })
    expect(done.status).toBe('completed')
    expect(done.result).toMatchObject({ score: 450, passed: false, correct: 1, timeUsedS: 400 })
    expect(done.result!.domains).toEqual([{ id: '1', name: 'Mobile Devices', correct: 1, total: 2 }])
    expect(db.completed()).toMatchObject([
      { id: a.id, score: 450, passed: false, correct: 1, timeUsedS: 400 }
    ])
    expect(db.inProgress()).toEqual([])
    expect(() => db.save(a.id, { timeLeftS: 1, currentIndex: 0, states: [] })).toThrow(/completed/)
  })

  it('deletes a discarded attempt with its questions', () => {
    const db = store()
    const a = db.create({ exam, seed: 1, timeLimitS: 60, questions: [question('q1')] })
    db.discard(a.id)
    expect(db.get(a.id)).toBeNull()
    expect(db.inProgress()).toEqual([])
  })

  it('counts how often each question was seen in completed attempts only', () => {
    const db = store()
    const a = db.create({ exam, seed: 1, timeLimitS: 60, questions: [question('q1'), question('q2')] })
    db.finish(a.id, { timeLeftS: 0, currentIndex: 0, states: states([null, null]) })
    const b = db.create({ exam, seed: 2, timeLimitS: 60, questions: [question('q1')] })
    db.finish(b.id, { timeLeftS: 0, currentIndex: 0, states: states([null]) })
    db.create({ exam, seed: 3, timeLimitS: 60, questions: [question('q3')] })
    expect(db.seenCounts('220-1201')).toEqual(
      new Map([
        ['q1', 2],
        ['q2', 1]
      ])
    )
  })

  it('migrates once: opening the same file again keeps the data', () => {
    const db = store()
    const a = db.create({ exam, seed: 1, timeLimitS: 60, questions: [question('q1')] })
    ;(db as unknown as { migrate(): void }).migrate()
    expect(db.get(a.id)).not.toBeNull()
  })
})
