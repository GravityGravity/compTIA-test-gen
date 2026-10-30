import type { DomainConfig, ExamConfig } from '@shared/types'
import type { Random } from '../random'

/** How many questions of each source one domain gets in an attempt. */
export interface DomainPlan {
  domain: DomainConfig
  total: number
  /** Scenario questions that the generator writes. */
  generated: number
  /** Scenario questions from the pool (structure "scenario"). */
  poolScenario: number
  /** Knowledge questions from the pool. */
  knowledge: number
}

/**
 * Whole numbers that add up to `total`, as close as possible to `total × weight / sum of weights`
 * (largest remainder). `caps` limits each count; a capped count passes its share to the others.
 */
export function largestRemainder(
  weights: readonly number[],
  total: number,
  caps?: readonly number[]
): number[] {
  const limit = (i: number) => caps?.[i] ?? Infinity
  const sum = weights.reduce((s, w) => s + w, 0)
  const counts = weights.map(() => 0)
  if (sum <= 0 || total <= 0) return counts
  const exact = weights.map((w, i) => Math.min(limit(i), (total * w) / sum))
  exact.forEach((e, i) => (counts[i] = Math.floor(e)))
  const room = weights.reduce((s, w, i) => s + (w > 0 ? limit(i) : 0), 0)
  let left = Math.min(total, room) - counts.reduce((s, c) => s + c, 0)
  // Give the rest one by one: largest remainder first, then the largest weight, then the first.
  const order = weights
    .map((w, i) => ({ i, rest: exact[i]! - counts[i]!, w }))
    .sort((a, b) => b.rest - a.rest || b.w - a.w || a.i - b.i)
  while (left > 0) {
    let gave = false
    for (const { i } of order) {
      if (left === 0) break
      if (counts[i]! < limit(i) && weights[i]! > 0) {
        counts[i]!++
        left--
        gave = true
      }
    }
    if (!gave) break
  }
  return counts
}

/** The part of a domain's objectives that are scenario objectives. */
export function scenarioFraction(domain: DomainConfig): number {
  return domain.objectives.filter((o) => o.kind === 'scenario').length / domain.objectives.length
}

/** The question count of one attempt, at random in the config's range. */
export function questionCount(config: ExamConfig, rng: Random): number {
  return rng.int(config.questionCount.min, config.questionCount.max)
}

/** Questions for each domain, by weight. */
export function domainCounts(config: ExamConfig, total: number): number[] {
  return largestRemainder(
    config.domains.map((d) => d.weight),
    total
  )
}

/**
 * Divides `total` questions among the domains (by weight), then each domain into scenario and
 * knowledge questions. A domain's scenario part follows its share of scenario objectives, scaled so
 * the exam total matches `scenarioShare`. The scenario questions are then divided between the
 * generator and the pool by `generatedScenarioShare`.
 */
export function planAttempt(config: ExamConfig, total: number): DomainPlan[] {
  const counts = domainCounts(config, total)
  const raw = config.domains.map((d, i) => counts[i]! * scenarioFraction(d))
  const target = Math.round((total * config.scenarioShare) / 100)
  const scenario = largestRemainder(raw, target, counts)
  const generatedTarget = Math.round((target * config.generatedScenarioShare) / 100)
  const generated = largestRemainder(scenario, generatedTarget, scenario)
  return config.domains.map((domain, i) => ({
    domain,
    total: counts[i]!,
    generated: generated[i]!,
    poolScenario: scenario[i]! - generated[i]!,
    knowledge: counts[i]! - scenario[i]!
  }))
}
