import { describe, expect, it } from 'vitest'
import type { CalculationName, CalculationRecord } from '@shared/exam'
import { createRandom } from '../../random'
import { calculation } from './calculation'
import type { GenerateContext } from './types'

const record = (calc: CalculationName): CalculationRecord => ({
  id: `t-${calc}`,
  kind: 'calculation',
  exam: 'N10-009',
  domain: '1',
  objectives: ['N10-009/1.7'],
  topics: ['N10-009/1.7.1'],
  settings: [],
  devices: [],
  explanation: '',
  origin: 'written',
  source: 'test',
  calculation: calc,
  prefixMin: 20,
  prefixMax: 30
})

const ctx = (seed: number): GenerateContext => ({
  rng: createRandom(seed),
  grammar: { calculationOpening: ['A technician plans a subnet.'] },
  byId: new Map()
})

const ipToNumber = (ip: string) => ip.split('.').reduce((n, o) => n * 256 + Number(o), 0)

describe('calculation generator', () => {
  for (const calc of ['subnet-hosts', 'subnet-mask', 'network-address', 'broadcast-address'] as const) {
    it(`${calc}: 4 different options, one right answer, and a reason for each wrong one`, () => {
      for (let seed = 0; seed < 200; seed++) {
        const d = calculation.generate(record(calc), ctx(seed))
        expect(new Set(d.options).size).toBe(4)
        expect(d.answer).toEqual([0])
        expect(d.whyWrong.slice(1).every((w) => typeof w === 'string' && w.length > 0)).toBe(true)
      }
    })
  }

  it('works out the right values', () => {
    for (let seed = 0; seed < 200; seed++) {
      const hosts = calculation.generate(record('subnet-hosts'), ctx(seed))
      const prefix = Number(/\/(\d+)\./.exec(hosts.stem)![1])
      expect(Number(hosts.options[0])).toBe(2 ** (32 - prefix) - 2)

      const net = calculation.generate(record('network-address'), ctx(seed))
      const [, host, p] = /address (\d+\.\d+\.\d+\.\d+)\/(\d+)/.exec(net.stem)!
      const size = 2 ** (32 - Number(p))
      expect(ipToNumber(net.options[0]!)).toBe(Math.floor(ipToNumber(host!) / size) * size)
    }
  })
})
