import { describe, expect, it } from 'vitest'
import { attemptTitle } from './labels'

describe('attemptTitle', () => {
  it('joins the certification and exam names', () => {
    expect(attemptTitle('CompTIA A+', { name: 'Core 1 Exam', id: '220-1201' })).toBe(
      'CompTIA A+ Core 1 Exam (220-1201)'
    )
  })
  it('says the words the two names share once', () => {
    expect(attemptTitle('CompTIA Network+', { name: 'Network+ Exam', id: 'N10-009' })).toBe(
      'CompTIA Network+ Exam (N10-009)'
    )
  })
  it('works without a certification name', () => {
    expect(attemptTitle('', { name: 'Network+ Exam', id: 'N10-009' })).toBe('Network+ Exam (N10-009)')
  })
})
