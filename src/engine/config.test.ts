import { describe, expect, it } from 'vitest'
import { ConfigError, checkCatalogLinks, parseCertification, parseExam, parseExercise } from './config'

const exercise = {
  id: 'definition-exercise',
  name: 'Definition Exercise',
  active: true,
  content: 'definitions',
  certifications: ['a-plus'],
  questionCount: 20,
  timeLimitMinutes: 15,
  onTimeUp: 'end',
  selection: 'random',
  questionTypes: [
    {
      type: 'multiple-choice',
      direction: 'random',
      directions: ['term-to-definition', 'definition-to-term'],
      choices: 4,
      count: 14
    },
    { type: 'typed', prompt: 'definition', answer: 'term', requires: 'typeable', count: 6 }
  ]
}

describe('parseExercise', () => {
  it('accepts a valid config', () => {
    const parsed = parseExercise(exercise, 'test')
    expect(parsed.questionTypes).toHaveLength(2)
    expect(parsed.timeLimitMinutes).toBe(15)
  })

  it('rejects counts that do not add up to questionCount', () => {
    expect(() => parseExercise({ ...exercise, questionCount: 21 }, 'test')).toThrow(/add up to 20/)
  })

  it('rejects an unknown question type', () => {
    const bad = { ...exercise, questionTypes: [{ type: 'essay', count: 20 }] }
    expect(() => parseExercise(bad, 'test')).toThrow(ConfigError)
  })

  it('names the file and field in the error', () => {
    expect(() => parseExercise({ ...exercise, active: 'yes' }, 'config/exercises/x.json')).toThrow(
      'config/exercises/x.json: "active" must be true or false'
    )
  })
})

describe('parseCertification', () => {
  it('needs at least one exam', () => {
    expect(() =>
      parseCertification({ id: 'a', name: 'A', shortName: 'A', active: true, exams: [] }, 'test')
    ).toThrow(/exams/)
  })
})

const exam = {
  id: '220-1201',
  certification: 'a-plus',
  name: 'Core 1 Exam',
  shortName: 'Core 1',
  active: false,
  domains: [
    { id: '1', name: 'Mobile Devices', weight: 40 },
    { id: '2', name: 'Networking', weight: 60 }
  ]
}

describe('parseExam', () => {
  it('accepts a valid config', () => {
    expect(parseExam(exam, 'test').domains[1]).toEqual({ id: '2', name: 'Networking', weight: 60 })
  })

  it('rejects weights that do not add up to 100', () => {
    const bad = { ...exam, domains: [{ id: '1', name: 'Mobile Devices', weight: 40 }] }
    expect(() => parseExam(bad, 'test')).toThrow(/add up to 40/)
  })
})

describe('checkCatalogLinks', () => {
  const cert = parseCertification(
    { id: 'a-plus', name: 'A+', shortName: 'A+', active: true, exams: ['220-1201'] },
    't'
  )

  it('rejects an exercise for an unknown certification', () => {
    const ex = parseExercise({ ...exercise, certifications: ['security-plus'] }, 't')
    expect(() => checkCatalogLinks([cert], [parseExam(exam, 't')], [ex])).toThrow(/security-plus/)
  })

  it('rejects a certification exam with no exam config', () => {
    expect(() => checkCatalogLinks([cert], [], [])).toThrow(/220-1201/)
  })
})
