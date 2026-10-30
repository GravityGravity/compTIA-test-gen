import { describe, expect, it } from 'vitest'
import { planAttempt } from '@engine/exam/allocate'
import { generateExam, NotEnoughQuestionsError } from '@engine/exam/generate'
import type { ExamQuestion } from '@shared/exam'
import { loadCatalog } from '../../src/main/catalog'
import { loadExamContent } from '../../src/main/content'

const FIXTURE = 'tests/fixtures/app-data'
const sentences = (text: string) => text.split(/(?<=[.!?])\s+(?=[A-Z(])/).filter(Boolean).length

/** The rules every asked question must keep (docs/exam-modules.md). */
function checkQuestion(q: ExamQuestion) {
  expect(q.stem).not.toMatch(/#[A-Za-z0-9_-]+(\.[a-z]+)*#/)
  expect(new Set(q.options).size).toBe(q.options.length)
  expect(q.answer.length).toBe(q.selectCount)
  q.answer.forEach((a) => expect(a).toBeLessThan(q.options.length))
  q.whyWrong.forEach((w, i) => {
    if (q.answer.includes(i)) expect(w).toBeNull()
    else expect(w && sentences(w)).toBe(1)
  })
  expect(sentences(q.explanation)).toBeGreaterThanOrEqual(1)
  expect(sentences(q.explanation)).toBeLessThanOrEqual(5)
  if (q.origin === 'generated') {
    expect(q.options).toHaveLength(4)
    expect(sentences(q.explanation)).toBeGreaterThanOrEqual(2)
  }
}

describe('generateExam on the fixture content', () => {
  const catalog = loadCatalog(FIXTURE)
  const config = catalog.exams.find((e) => e.id === '220-1201')!
  const content = loadExamContent(FIXTURE, catalog.exams)['220-1201']!

  it('gives the same attempt for the same seed', () => {
    expect(generateExam(config, content, 42)).toEqual(generateExam(config, content, 42))
    expect(generateExam(config, content, 42)).not.toEqual(generateExam(config, content, 43))
  })

  it('builds 300 attempts that follow the config and the question rules', () => {
    const kinds = new Set<string>()
    for (let seed = 0; seed < 300; seed++) {
      const questions = generateExam(config, content, seed)
      expect(questions.length).toBeGreaterThanOrEqual(config.questionCount.min)
      expect(questions.length).toBeLessThanOrEqual(config.questionCount.max)
      expect(new Set(questions.map((q) => q.sourceId)).size).toBe(questions.length)
      const plan = planAttempt(config, questions.length)
      for (const d of plan) expect(questions.filter((q) => q.domain === d.domain.id)).toHaveLength(d.total)
      questions.forEach((q) => {
        checkQuestion(q)
        if (q.kind) kinds.add(q.kind)
      })
    }
    expect([...kinds].sort()).toEqual(['calculation', 'fault', 'procedure', 'requirement'])
  })

  it('prefers questions the user has seen least', () => {
    const first = generateExam(config, content, 7)
    const seen = new Map(first.map((q) => [q.sourceId, 1]))
    const second = generateExam(config, content, 7, seen)
    const repeats = second.filter((q) => seen.has(q.sourceId)).length
    expect(repeats).toBeLessThan(first.length)
  })

  it('stops with a clear error when a domain has too little content', () => {
    const tiny = { ...content, pool: content.pool.filter((q) => q.domain !== '4') }
    expect(() => generateExam(config, tiny, 1)).toThrow(NotEnoughQuestionsError)
    expect(() => generateExam(config, tiny, 1)).toThrow(/domain 4/)
  })
})

// The real content in content/: every exam that has content must build attempts without errors.
describe('generateExam on the real content', () => {
  const catalog = loadCatalog(process.cwd())
  const all = loadExamContent(process.cwd(), catalog.exams)
  for (const config of catalog.exams) {
    const content = all[config.id]!
    const hasContent = content.pool.length + content.scenarios.length > 0
    it.runIf(hasContent)(`${config.id}: 200 attempts build and keep the question rules`, () => {
      for (let seed = 0; seed < 200; seed++) generateExam(config, content, seed).forEach(checkQuestion)
    })
    it.runIf(config.active)(`${config.id} is active, so it has content`, () => {
      expect(hasContent).toBe(true)
    })
  }
})
