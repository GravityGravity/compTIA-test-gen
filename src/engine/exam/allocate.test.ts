import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import type { ExamConfig } from '@shared/types'
import { parseExam } from '../config'
import { domainCounts, largestRemainder, planAttempt, scenarioFraction } from './allocate'

const real = (code: string): ExamConfig =>
  parseExam(JSON.parse(readFileSync(`config/exams/${code}.json`, 'utf8')), code)

describe('largestRemainder', () => {
  it('adds up to the total', () => {
    expect(largestRemainder([13, 23, 25, 11, 28], 84)).toEqual([11, 19, 21, 9, 24])
  })

  it('keeps each count under its cap and gives the rest to the others', () => {
    expect(largestRemainder([1, 1], 10, [2, 20])).toEqual([2, 8])
  })

  it('gives nothing when every weight is zero', () => {
    expect(largestRemainder([0, 0], 5)).toEqual([0, 0])
  })
})

describe('planAttempt', () => {
  for (const code of ['220-1201', '220-1202', 'N10-009']) {
    const config = real(code)
    it(`${code}: every count from 75 to 90 follows the weights and the scenario share`, () => {
      for (let total = config.questionCount.min; total <= config.questionCount.max; total++) {
        const plan = planAttempt(config, total)
        expect(plan.reduce((s, d) => s + d.total, 0)).toBe(total)
        plan.forEach((d) => {
          expect(Math.abs(d.total - (total * d.domain.weight) / 100)).toBeLessThanOrEqual(1)
          expect(d.generated + d.poolScenario + d.knowledge).toBe(d.total)
          if (scenarioFraction(d.domain) === 0) expect(d.generated + d.poolScenario).toBe(0)
        })
        const scenario = plan.reduce((s, d) => s + d.generated + d.poolScenario, 0)
        expect(Math.abs((100 * scenario) / total - config.scenarioShare)).toBeLessThanOrEqual(2)
        const generated = plan.reduce((s, d) => s + d.generated, 0)
        expect(Math.abs(generated - (scenario * config.generatedScenarioShare) / 100)).toBeLessThanOrEqual(1)
      }
    })
  }

  it('matches the exam intro draft for an 84-question Core 1 exam', () => {
    expect(domainCounts(real('220-1201'), 84)).toEqual([11, 19, 21, 9, 24])
  })
})
