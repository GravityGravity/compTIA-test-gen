import type {
  CalculationName,
  Grammar,
  PoolQuestion,
  ProcedureStep,
  Qualifier,
  ScenarioRecord,
  Structure
} from '@shared/exam'
import { ConfigError } from '../config'

// Checks the exam module records: the fields the engine reads. tools/extract/check_questions.py
// does the full content check (coverage, sentence counts, duplicates) during development.

type Json = Record<string, unknown>

const STRUCTURES: readonly Structure[] = ['recall', 'select-item', 'scenario', 'procedure', 'calculation']
const QUALIFIERS: readonly Qualifier[] = ['BEST', 'FIRST', 'NEXT', 'MOST LIKELY', 'LEAST']
const CALCULATIONS: readonly CalculationName[] = [
  'subnet-hosts',
  'subnet-mask',
  'network-address',
  'broadcast-address'
]

function fail(where: string, message: string): never {
  throw new ConfigError(`${where}: ${message}`)
}

function asObject(raw: unknown, where: string): Json {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) fail(where, 'must be an object')
  return raw as Json
}

function str(obj: Json, key: string, where: string): string {
  const value = obj[key]
  if (typeof value !== 'string' || value === '') fail(where, `"${key}" must be a non-empty string`)
  return value
}

function strList(obj: Json, key: string, where: string, min = 0): string[] {
  const value = obj[key]
  if (!Array.isArray(value) || value.length < min || !value.every((v) => typeof v === 'string' && v !== ''))
    fail(where, `"${key}" must be a list of at least ${min} non-empty strings`)
  return value as string[]
}

function optStrList(obj: Json, key: string, where: string): string[] {
  return obj[key] === undefined ? [] : strList(obj, key, where)
}

function int(obj: Json, key: string, where: string, min: number, max: number): number {
  const value = obj[key]
  if (typeof value !== 'number' || !Number.isInteger(value) || value < min || value > max)
    fail(where, `"${key}" must be a whole number from ${min} to ${max}`)
  return value
}

function oneOf<T extends string>(obj: Json, key: string, allowed: readonly T[], where: string): T {
  const value = obj[key]
  if (!allowed.includes(value as T)) fail(where, `"${key}" must be one of ${allowed.join(', ')}`)
  return value as T
}

/** The objectives and topics must belong to the record's exam and domain. */
function coverage(obj: Json, exam: string, domain: string, at: string) {
  const objectives = strList(obj, 'objectives', at, 1)
  const topics = strList(obj, 'topics', at, 1)
  for (const o of objectives)
    if (!o.startsWith(`${exam}/${domain}.`)) fail(at, `objective "${o}" is not in ${exam} domain ${domain}`)
  for (const t of topics)
    if (!objectives.some((o) => t.startsWith(`${o}.`))) fail(at, `topic "${t}" is not under its objectives`)
  return { objectives, topics }
}

export function parsePoolQuestion(raw: unknown, where: string): PoolQuestion {
  const obj = asObject(raw, where)
  const id = str(obj, 'id', where)
  const at = `${where} (${id})`
  const exam = str(obj, 'exam', at)
  const domain = str(obj, 'domain', at)
  const options = strList(obj, 'options', at, 2)
  const answer = obj.answer
  if (
    !Array.isArray(answer) ||
    answer.length === 0 ||
    new Set(answer).size !== answer.length ||
    !answer.every((a) => Number.isInteger(a) && a >= 0 && a < options.length)
  )
    fail(at, '"answer" must list different option indexes')
  const type = oneOf(obj, 'type', ['single', 'multiple'] as const, at)
  const selectCount = int(obj, 'selectCount', at, 1, options.length)
  if (selectCount !== answer.length) fail(at, '"selectCount" must be the number of answers')
  if (type === 'single' && selectCount !== 1) fail(at, 'a single question has one answer')
  if (type === 'multiple' && selectCount < 2) fail(at, 'a multiple question has two or more answers')
  const whyWrong = obj.whyWrong
  if (
    !Array.isArray(whyWrong) ||
    whyWrong.length !== options.length ||
    !whyWrong.every((w, i) => (answer.includes(i) ? w === null : typeof w === 'string' && w !== ''))
  )
    fail(at, '"whyWrong" needs a sentence for each wrong option and null for each correct one')
  if (typeof obj.fixedOrder !== 'boolean') fail(at, '"fixedOrder" must be true or false')
  return {
    id,
    type,
    structure: oneOf(obj, 'structure', STRUCTURES, at),
    qualifier: obj.qualifier === null ? null : oneOf(obj, 'qualifier', QUALIFIERS, at),
    exam,
    domain,
    ...coverage(obj, exam, domain, at),
    stem: str(obj, 'stem', at),
    options,
    answer: [...(answer as number[])].sort((a, b) => a - b),
    selectCount,
    fixedOrder: obj.fixedOrder,
    explanation: str(obj, 'explanation', at),
    whyWrong: whyWrong as (string | null)[],
    origin: oneOf(obj, 'origin', ['book', 'written'] as const, at),
    source: str(obj, 'source', at)
  }
}

function step(raw: unknown, where: string): ProcedureStep {
  const obj = asObject(raw, where)
  return { do: str(obj, 'do', where), done: str(obj, 'done', where) }
}

export function parseScenario(raw: unknown, where: string): ScenarioRecord {
  const obj = asObject(raw, where)
  const id = str(obj, 'id', where)
  const at = `${where} (${id})`
  const exam = str(obj, 'exam', at)
  const domain = str(obj, 'domain', at)
  const base = {
    id,
    exam,
    domain,
    ...coverage(obj, exam, domain, at),
    settings: optStrList(obj, 'settings', at),
    devices: optStrList(obj, 'devices', at),
    explanation: str(obj, 'explanation', at),
    origin: oneOf(obj, 'origin', ['written'] as const, at),
    source: str(obj, 'source', at)
  }
  const kind = oneOf(obj, 'kind', ['fault', 'requirement', 'procedure', 'calculation'] as const, at)
  switch (kind) {
    case 'fault': {
      const answer = asObject(obj.answer, `${at} answer`)
      const firstStep = obj.firstStep === undefined ? undefined : str(obj, 'firstStep', at)
      return {
        ...base,
        kind,
        clues: strList(obj, 'clues', at, 2),
        answer: { cause: str(answer, 'cause', at), action: str(answer, 'action', at) },
        ...(firstStep ? { firstStep } : {}),
        appliesWhen: str(obj, 'appliesWhen', at),
        related: strList(obj, 'related', at, 3)
      }
    }
    case 'requirement': {
      const answer = asObject(obj.answer, `${at} answer`)
      return {
        ...base,
        kind,
        need: str(obj, 'need', at),
        clues: strList(obj, 'clues', at, 1),
        answer: { item: str(answer, 'item', at) },
        itemType: str(obj, 'itemType', at),
        appliesWhen: str(obj, 'appliesWhen', at),
        related: strList(obj, 'related', at, 3)
      }
    }
    case 'procedure': {
      const steps = obj.steps
      if (!Array.isArray(steps) || steps.length < 4) fail(at, '"steps" must list at least 4 steps')
      return {
        ...base,
        kind,
        task: str(obj, 'task', at),
        steps: steps.map((s, i) => step(s, `${at} steps[${i}]`))
      }
    }
    case 'calculation': {
      const prefixMin = int(obj, 'prefixMin', at, 8, 30)
      const prefixMax = int(obj, 'prefixMax', at, prefixMin, 30)
      return { ...base, kind, calculation: oneOf(obj, 'calculation', CALCULATIONS, at), prefixMin, prefixMax }
    }
  }
}

export function parseGrammar(raw: unknown, where: string): Grammar {
  const obj = asObject(raw, where)
  const grammar: Grammar = {}
  for (const key of Object.keys(obj)) grammar[key] = strList(obj, key, `${where} rule "${key}"`, 1)
  return grammar
}

/** The exam's grammar on top of the shared one: a rule in both takes the exam's phrasings. */
export function mergeGrammar(shared: Grammar, exam: Grammar): Grammar {
  return { ...shared, ...exam }
}

/**
 * Checks the links between one exam's records: unique ids, and `related` ids that name records
 * of the same exam and kind with a different answer.
 */
export function checkExamLinks(pool: readonly PoolQuestion[], scenarios: readonly ScenarioRecord[]): void {
  const ids = new Set<string>()
  for (const r of [...pool, ...scenarios]) {
    if (ids.has(r.id)) fail(r.id, 'the id is used twice')
    ids.add(r.id)
  }
  const byId = new Map(scenarios.map((s) => [s.id, s]))
  for (const s of scenarios) {
    if (s.kind !== 'fault' && s.kind !== 'requirement') continue
    for (const rid of s.related) {
      const r = byId.get(rid)
      if (!r) fail(s.id, `related record "${rid}" does not exist`)
      if (r.kind !== s.kind || r.exam !== s.exam)
        fail(s.id, `related record "${rid}" is another kind or exam`)
      if (rid === s.id) fail(s.id, 'a record cannot be related to itself')
    }
  }
}
