import { describe, expect, it } from 'vitest'
import type { ExamConfig } from '@shared/types'
import { objectiveLabel, objectiveTags } from './objectives'

const exams: ExamConfig[] = [
  {
    id: '220-1201',
    certification: 'a-plus',
    name: 'Core 1 Exam',
    shortName: 'Core 1',
    active: false,
    domains: [
      { id: '1', name: 'Mobile Devices', weight: 13 },
      { id: '2', name: 'Networking', weight: 87 }
    ]
  }
]

describe('objectiveLabel', () => {
  it('names the exam, the objective, and the domain', () => {
    expect(objectiveLabel('220-1201/2.1', exams)).toBe('Core 1 · 2.1 Networking')
  })

  it('falls back to the raw id for an unknown exam', () => {
    expect(objectiveLabel('N10-009/1.1', exams)).toBe('N10-009/1.1')
  })
})

describe('objectiveTags', () => {
  it('shows at most 3 and keeps the rest', () => {
    const tags = objectiveTags(['220-1201/1.1', '220-1201/1.2', '220-1201/2.1', '220-1201/2.2'], exams)
    expect(tags.shown).toHaveLength(3)
    expect(tags.hidden).toEqual(['Core 1 · 2.2 Networking'])
  })

  it('shows nothing for a record with no objectives', () => {
    expect(objectiveTags([], exams)).toEqual({ shown: [], hidden: [] })
  })
})
