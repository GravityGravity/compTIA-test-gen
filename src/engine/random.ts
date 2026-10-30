// Seeded random generator (mulberry32). Every random choice in question and exam
// generation goes through one of these, so the same seed gives the same result.

export interface Random {
  /** A number in [0, 1). */
  next(): number
  /** A whole number in [min, max], both included. */
  int(min: number, max: number): number
  /** One item of a non-empty list. */
  pick<T>(items: readonly T[]): T
  /** A shuffled copy (Fisher–Yates). */
  shuffle<T>(items: readonly T[]): T[]
  /** `count` different items, in random order. */
  sample<T>(items: readonly T[], count: number): T[]
}

export function createRandom(seed: number): Random {
  let state = seed >>> 0

  const next = (): number => {
    state = (state + 0x6d2b79f5) >>> 0
    let t = state
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }

  const int = (min: number, max: number): number => {
    if (!Number.isInteger(min) || !Number.isInteger(max) || max < min)
      throw new RangeError(`bad range ${min}..${max}`)
    return min + Math.floor(next() * (max - min + 1))
  }

  const shuffle = <T>(items: readonly T[]): T[] => {
    const copy = [...items]
    for (let i = copy.length - 1; i > 0; i--) {
      const j = int(0, i)
      ;[copy[i], copy[j]] = [copy[j] as T, copy[i] as T]
    }
    return copy
  }

  return {
    next,
    int,
    pick: (items) => {
      if (items.length === 0) throw new RangeError('cannot pick from an empty list')
      return items[int(0, items.length - 1)] as (typeof items)[number]
    },
    shuffle,
    sample: (items, count) => {
      if (count > items.length) throw new RangeError(`cannot take ${count} from ${items.length} items`)
      return shuffle(items).slice(0, count)
    }
  }
}

/** A new seed for an attempt. Saved with the attempt so it can be rebuilt. */
export function newSeed(): number {
  return Math.floor(Math.random() * 4294967296)
}
