import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { loadCatalog } from './catalog'
import { loadExamContent } from './content'
import { AttemptStore } from './db'
import { parseId, parseProgress, startExam } from './exams'

const FIXTURE = 'tests/fixtures/app-data'

describe('startExam', () => {
  const catalog = loadCatalog(FIXTURE)
  const content = loadExamContent(FIXTURE, catalog.exams)

  it('builds and saves an attempt of an active exam', () => {
    const store = new AttemptStore(':memory:')
    const attempt = startExam(catalog, content, store, '220-1201', 9)
    expect(attempt.status).toBe('in_progress')
    expect(attempt.timeLimitS).toBe(90 * 60)
    expect(attempt.exam).toMatchObject({ name: 'Core 1 Exam', passingScore: 675, maxScore: 900 })
    expect(store.get(attempt.id)!.questions).toEqual(attempt.questions)
  })

  it('refuses an inactive or unknown exam', () => {
    const store = new AttemptStore(':memory:')
    expect(() => startExam(catalog, content, store, '220-1202')).toThrow(/not available/)
    expect(() => startExam(catalog, content, store, 'nope')).toThrow(/unknown exam/)
  })
})

describe('parseProgress and parseId', () => {
  it('accepts good progress and rejects junk', () => {
    const good = {
      timeLeftS: 10,
      currentIndex: 0,
      states: [{ selected: [1], flagged: true, struck: [false], seconds: 3 }]
    }
    expect(parseProgress(good)).toEqual(good)
    expect(() => parseProgress({ ...good, states: [{ selected: ['x'], struck: [] }] })).toThrow()
    expect(() => parseProgress(null)).toThrow()
    expect(() => parseId('1; DROP TABLE attempts')).toThrow()
  })
})

describe('loadExamContent', () => {
  it('gives empty content to an exam with no folder', () => {
    const catalog = loadCatalog(process.cwd())
    const all = loadExamContent(process.cwd(), catalog.exams)
    expect(Object.keys(all).sort()).toEqual(['220-1201', '220-1202', 'N10-009', 'SY0-801'])
    expect(all['N10-009']!.grammar.askCause).toBeDefined()
    expect(all['SY0-801']!.grammar.faultOpening).toBeDefined()
  })

  it('rejects a record whose domain does not match its file', () => {
    const root = mkdtempSync(join(tmpdir(), 'cp-'))
    mkdirSync(join(root, 'content/core1/pool'), { recursive: true })
    const catalog = loadCatalog(FIXTURE)
    const bad = loadExamContent(FIXTURE, catalog.exams)['220-1201']!.pool.find((q) => q.domain === '1')
    writeFileSync(join(root, 'content/core1/pool/d2.json'), JSON.stringify([bad]))
    expect(() => loadExamContent(root, catalog.exams)).toThrow(/"domain" must be 2/)
  })
})
