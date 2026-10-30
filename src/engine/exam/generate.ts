import type { ExamContent, ExamQuestion, PoolQuestion, ScenarioRecord } from '@shared/exam'
import type { ExamConfig } from '@shared/types'
import { createRandom, type Random } from '../random'
import { planAttempt } from './allocate'
import { canGenerate, generateScenario, qualifierOf, type GenerateContext } from './scenario'

export class NotEnoughQuestionsError extends Error {}

/** How often the user has seen each pool question or scenario record in completed attempts. */
export type SeenCounts = ReadonlyMap<string, number>

type Slot = 'generated' | 'poolScenario' | 'knowledge'

/** What each slot type uses when it runs short. */
const FALLBACK: Record<Slot, Slot[]> = {
  generated: ['generated', 'poolScenario', 'knowledge'],
  poolScenario: ['poolScenario', 'generated', 'knowledge'],
  knowledge: ['knowledge', 'poolScenario', 'generated']
}

/** Shuffles the options (and the answer and whyWrong with them) unless the order is fixed. */
function shuffleOptions<T extends { options: string[]; answer: number[]; whyWrong: (string | null)[] }>(
  q: T,
  rng: Random,
  fixed: boolean
): Pick<T, 'options' | 'answer' | 'whyWrong'> {
  const order = fixed ? q.options.map((_, i) => i) : rng.shuffle(q.options.map((_, i) => i))
  return {
    options: order.map((i) => q.options[i]!),
    answer: q.answer.map((a) => order.indexOf(a)).sort((a, b) => a - b),
    whyWrong: order.map((i) => q.whyWrong[i] ?? null)
  }
}

function fromPool(q: PoolQuestion, rng: Random): ExamQuestion {
  return {
    sourceId: q.id,
    origin: 'pool',
    kind: null,
    type: q.type,
    structure: q.structure,
    qualifier: q.qualifier,
    domain: q.domain,
    objectives: q.objectives,
    topics: q.topics,
    stem: q.stem,
    ...shuffleOptions(q, rng, q.fixedOrder),
    selectCount: q.selectCount,
    explanation: q.explanation
  }
}

function fromScenario(record: ScenarioRecord, ctx: GenerateContext): ExamQuestion {
  const draft = generateScenario(record, ctx)
  return {
    sourceId: record.id,
    origin: 'generated',
    kind: record.kind,
    type: 'single',
    structure: draft.structure,
    qualifier: qualifierOf(draft.stem),
    domain: record.domain,
    objectives: record.objectives,
    topics: record.topics,
    stem: draft.stem,
    ...shuffleOptions(draft, ctx.rng, false),
    selectCount: 1,
    explanation: draft.explanation
  }
}

/**
 * Builds one attempt (steps in docs/exam-modules.md):
 * the question count, the domain split by weight, the scenario/knowledge split, and the
 * generated/pool split; then, in each domain, questions spread evenly across the objectives and
 * topics, the least-seen questions first, with no question or record used twice. Options and
 * questions are shuffled. The same config, content, seed, and seen counts give the same attempt.
 */
export function generateExam(
  config: ExamConfig,
  content: ExamContent,
  seed: number,
  seen: SeenCounts = new Map()
): ExamQuestion[] {
  const rng = createRandom(seed)
  const scenarios = content.scenarios.filter((r) => r.exam === config.id)
  const ctx: GenerateContext = {
    rng,
    grammar: content.grammar,
    byId: new Map(scenarios.map((r) => [r.id, r]))
  }
  const total = rng.int(config.questionCount.min, config.questionCount.max)
  const used = new Set<string>()
  const topicUse = new Map<string, number>()
  const questions: ExamQuestion[] = []

  /** The least-seen candidates, then the ones whose topic this attempt has used least; one at random. */
  function best<T extends { id: string; topics: string[] }>(candidates: T[]): T | undefined {
    if (candidates.length === 0) return undefined
    const cost = (c: T) =>
      (seen.get(c.id) ?? 0) * 1000 + Math.min(...c.topics.map((t) => topicUse.get(t) ?? 0))
    const low = Math.min(...candidates.map(cost))
    return rng.pick(candidates.filter((c) => cost(c) === low))
  }

  function take(q: { id: string; topics: string[] }) {
    used.add(q.id)
    for (const t of q.topics) topicUse.set(t, (topicUse.get(t) ?? 0) + 1)
  }

  for (const plan of planAttempt(config, total)) {
    const { domain } = plan
    const objective = (id: string) => `${config.id}/${id}`
    const scenarioObjectives = domain.objectives
      .filter((o) => o.kind === 'scenario')
      .map((o) => objective(o.id))
    const knowledgeObjectives = domain.objectives
      .filter((o) => o.kind === 'knowledge')
      .map((o) => objective(o.id))
    const allObjectives = domain.objectives.map((o) => objective(o.id))
    const pool = content.pool.filter((q) => q.exam === config.id && q.domain === domain.id)
    const records = scenarios.filter((r) => r.domain === domain.id && canGenerate(r, ctx))

    // Round-robin over the objectives of each slot type, in a random order, so they get about the same number.
    const rotation: Record<Slot, string[]> = {
      generated: rng.shuffle(scenarioObjectives.length ? scenarioObjectives : allObjectives),
      poolScenario: rng.shuffle(scenarioObjectives.length ? scenarioObjectives : allObjectives),
      knowledge: rng.shuffle(knowledgeObjectives.length ? knowledgeObjectives : allObjectives)
    }
    const turn: Record<Slot, number> = { generated: 0, poolScenario: 0, knowledge: 0 }

    const candidates = (slot: Slot, wanted?: string): Array<PoolQuestion | ScenarioRecord> => {
      const inObjective = (r: { objectives: string[] }) => !wanted || r.objectives.includes(wanted)
      if (slot === 'generated') return records.filter((r) => !used.has(r.id) && inObjective(r))
      const scenario = slot === 'poolScenario'
      return pool.filter(
        (q) => !used.has(q.id) && (q.structure === 'scenario') === scenario && inObjective(q)
      )
    }

    const fill = (slot: Slot) => {
      const wanted = rotation[slot][turn[slot]++ % rotation[slot].length]
      for (const type of FALLBACK[slot]) {
        const pick = best(candidates(type, wanted)) ?? best(candidates(type))
        if (!pick) continue
        take(pick)
        questions.push('kind' in pick ? fromScenario(pick, ctx) : fromPool(pick, rng))
        return true
      }
      return false
    }

    const slots: Slot[] = [
      ...Array<Slot>(plan.generated).fill('generated'),
      ...Array<Slot>(plan.poolScenario).fill('poolScenario'),
      ...Array<Slot>(plan.knowledge).fill('knowledge')
    ]
    const filled = slots.filter(fill).length
    if (filled < plan.total)
      throw new NotEnoughQuestionsError(
        `${config.name}: domain ${domain.id} (${domain.name}) needs ${plan.total} questions, but its content has ${filled}`
      )
  }
  return rng.shuffle(questions)
}
