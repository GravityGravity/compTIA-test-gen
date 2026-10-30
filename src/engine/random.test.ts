import { describe, expect, it } from 'vitest'
import { createRandom } from './random'

describe('createRandom', () => {
  it('gives the same sequence for the same seed', () => {
    const a = createRandom(42)
    const b = createRandom(42)
    expect(Array.from({ length: 5 }, () => a.next())).toEqual(Array.from({ length: 5 }, () => b.next()))
  })

  it('gives a different sequence for a different seed', () => {
    expect(createRandom(1).next()).not.toEqual(createRandom(2).next())
  })

  it('keeps int() inside the range, both ends included', () => {
    const rng = createRandom(7)
    const seen = new Set<number>()
    for (let i = 0; i < 2000; i++) {
      const n = rng.int(75, 90)
      expect(n).toBeGreaterThanOrEqual(75)
      expect(n).toBeLessThanOrEqual(90)
      seen.add(n)
    }
    expect(seen.size).toBe(16)
  })

  it('shuffles without losing or repeating items', () => {
    const items = Array.from({ length: 50 }, (_, i) => i)
    const shuffled = createRandom(3).shuffle(items)
    expect(shuffled).not.toEqual(items)
    expect([...shuffled].sort((x, y) => x - y)).toEqual(items)
  })

  it('samples without repeats', () => {
    const picked = createRandom(9).sample(['a', 'b', 'c', 'd', 'e'], 5)
    expect(new Set(picked).size).toBe(5)
    expect(() => createRandom(9).sample(['a'], 2)).toThrow(RangeError)
  })
})
