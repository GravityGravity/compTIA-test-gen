import type { CertificationConfig, ExamConfig, ExerciseConfig, QuestionTypeConfig } from '@shared/types'

// Validates the configs in config/. Throws with the file and field on the first problem,
// so a broken config stops the app with a clear message instead of a half-working screen.

export class ConfigError extends Error {}

type Json = Record<string, unknown>

function fail(where: string, message: string): never {
  throw new ConfigError(`${where}: ${message}`)
}

function asObject(value: unknown, where: string): Json {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) fail(where, 'must be an object')
  return value as Json
}

function str(obj: Json, key: string, where: string): string {
  const value = obj[key]
  if (typeof value !== 'string' || value === '') fail(where, `"${key}" must be a non-empty string`)
  return value
}

function bool(obj: Json, key: string, where: string): boolean {
  const value = obj[key]
  if (typeof value !== 'boolean') fail(where, `"${key}" must be true or false`)
  return value
}

function posInt(obj: Json, key: string, where: string): number {
  const value = obj[key]
  if (typeof value !== 'number' || !Number.isInteger(value) || value < 1)
    fail(where, `"${key}" must be a positive whole number`)
  return value
}

function strList(obj: Json, key: string, where: string): string[] {
  const value = obj[key]
  if (!Array.isArray(value) || value.length === 0 || !value.every((v) => typeof v === 'string' && v !== ''))
    fail(where, `"${key}" must be a non-empty list of strings`)
  return value as string[]
}

function oneOf<T extends string>(obj: Json, key: string, allowed: readonly T[], where: string): T {
  const value = obj[key]
  if (!allowed.includes(value as T)) fail(where, `"${key}" must be one of ${allowed.join(', ')}`)
  return value as T
}

export function parseCertification(raw: unknown, where: string): CertificationConfig {
  const obj = asObject(raw, where)
  return {
    id: str(obj, 'id', where),
    name: str(obj, 'name', where),
    shortName: str(obj, 'shortName', where),
    active: bool(obj, 'active', where),
    exams: strList(obj, 'exams', where)
  }
}

export function parseExam(raw: unknown, where: string): ExamConfig {
  const obj = asObject(raw, where)
  const domainsRaw = obj.domains
  if (!Array.isArray(domainsRaw) || domainsRaw.length === 0) fail(where, '"domains" must be a non-empty list')
  const domains = domainsRaw.map((d, i) => {
    const at = `${where} domains[${i}]`
    const dom = asObject(d, at)
    return { id: str(dom, 'id', at), name: str(dom, 'name', at), weight: posInt(dom, 'weight', at) }
  })
  const total = domains.reduce((sum, d) => sum + d.weight, 0)
  if (total !== 100) fail(where, `domain weights add up to ${total}, not 100`)
  return {
    id: str(obj, 'id', where),
    certification: str(obj, 'certification', where),
    name: str(obj, 'name', where),
    shortName: str(obj, 'shortName', where),
    active: bool(obj, 'active', where),
    domains
  }
}

function parseQuestionType(raw: unknown, where: string): QuestionTypeConfig {
  const obj = asObject(raw, where)
  const type = oneOf(obj, 'type', ['typed', 'multiple-choice'] as const, where)
  const count = posInt(obj, 'count', where)
  if (type === 'typed') {
    const requires =
      obj.requires === undefined ? undefined : oneOf(obj, 'requires', ['typeable'] as const, where)
    return {
      type,
      prompt: oneOf(obj, 'prompt', ['acronym', 'definition'] as const, where),
      answer: oneOf(obj, 'answer', ['expanded', 'term'] as const, where),
      ...(requires ? { requires } : {}),
      count
    }
  }
  const directions = ['term-to-definition', 'definition-to-term'] as const
  const direction = oneOf(obj, 'direction', ['random', ...directions] as const, where)
  const choices = posInt(obj, 'choices', where)
  if (choices < 2) fail(where, '"choices" must be at least 2')
  if (direction === 'random') {
    const list = strList(obj, 'directions', where)
    for (const d of list) if (!directions.includes(d as never)) fail(where, `unknown direction "${d}"`)
    return { type, direction, directions: list as (typeof directions)[number][], choices, count }
  }
  return { type, direction, choices, count }
}

export function parseExercise(raw: unknown, where: string): ExerciseConfig {
  const obj = asObject(raw, where)
  const questionTypesRaw = obj.questionTypes
  if (!Array.isArray(questionTypesRaw) || questionTypesRaw.length === 0)
    fail(where, '"questionTypes" must be a non-empty list')
  const questionTypes = questionTypesRaw.map((qt, i) => parseQuestionType(qt, `${where} questionTypes[${i}]`))
  const questionCount = posInt(obj, 'questionCount', where)
  const total = questionTypes.reduce((sum, qt) => sum + qt.count, 0)
  if (total !== questionCount)
    fail(where, `question-type counts add up to ${total}, but "questionCount" is ${questionCount}`)
  const description = obj.description === undefined ? undefined : str(obj, 'description', where)
  const notSure = obj.notSure === undefined ? false : bool(obj, 'notSure', where)
  return {
    id: str(obj, 'id', where),
    name: str(obj, 'name', where),
    ...(description ? { description } : {}),
    ...(notSure ? { notSure } : {}),
    active: bool(obj, 'active', where),
    content: oneOf(obj, 'content', ['acronyms', 'definitions'] as const, where),
    certifications: strList(obj, 'certifications', where),
    questionCount,
    timeLimitMinutes: posInt(obj, 'timeLimitMinutes', where),
    onTimeUp: oneOf(obj, 'onTimeUp', ['end'] as const, where),
    selection: oneOf(obj, 'selection', ['random'] as const, where),
    questionTypes
  }
}

/** Checks that every certification's exams have a config, and every exercise names a known certification. */
export function checkCatalogLinks(
  certifications: CertificationConfig[],
  exams: ExamConfig[],
  exercises: ExerciseConfig[]
): void {
  const examIds = new Set(exams.map((e) => e.id))
  for (const cert of certifications)
    for (const code of cert.exams)
      if (!examIds.has(code))
        fail(`certification ${cert.id}`, `exam "${code}" has no config in config/exams/`)
  const known = new Set(certifications.map((c) => c.id))
  for (const ex of exercises)
    for (const cert of ex.certifications)
      if (!known.has(cert)) fail(`exercise ${ex.id}`, `unknown certification "${cert}"`)
}
