import type { ScenarioKind, ScenarioRecord } from '@shared/exam'
import { calculation } from './calculation'
import { fault } from './fault'
import { procedure } from './procedure'
import { requirement } from './requirement'
import type { Draft, GenerateContext, ScenarioGenerator } from './types'

/** One generator for each scenario kind. A new kind adds its file and a line here. */
const generators: { [K in ScenarioKind]: ScenarioGenerator<Extract<ScenarioRecord, { kind: K }>> } = {
  fault,
  requirement,
  procedure,
  calculation
}

function generatorFor(record: ScenarioRecord): ScenarioGenerator<ScenarioRecord> {
  return generators[record.kind] as ScenarioGenerator<ScenarioRecord>
}

export function canGenerate(record: ScenarioRecord, ctx: GenerateContext): boolean {
  return generatorFor(record).canGenerate(record, ctx)
}

export function generateScenario(record: ScenarioRecord, ctx: GenerateContext): Draft {
  return generatorFor(record).generate(record, ctx)
}

export type { Draft, GenerateContext } from './types'
export { qualifierOf } from './types'
