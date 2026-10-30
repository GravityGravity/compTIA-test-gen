import type { AcronymRecord, DefinitionRecord } from '@shared/types'
import { ConfigError } from './config'

// Light checks on the content records: the fields the app reads. tools/extract/check_content.py
// does the full content check during development.

type Json = Record<string, unknown>

function fail(where: string, message: string): never {
  throw new ConfigError(`${where}: ${message}`)
}

function str(obj: Json, key: string, where: string): string {
  const value = obj[key]
  if (typeof value !== 'string' || value === '') fail(where, `"${key}" must be a non-empty string`)
  return value
}

function strList(obj: Json, key: string, where: string): string[] {
  const value = obj[key]
  if (!Array.isArray(value) || !value.every((v) => typeof v === 'string'))
    fail(where, `"${key}" must be a list of strings`)
  return value as string[]
}

function base(raw: unknown, where: string) {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) fail(where, 'must be an object')
  const obj = raw as Json
  const id = str(obj, 'id', where)
  const at = `${where} (${id})`
  return {
    obj,
    at,
    record: {
      id,
      acceptedAnswers: strList(obj, 'acceptedAnswers', at),
      certifications: strList(obj, 'certifications', at),
      exams: strList(obj, 'exams', at),
      objectives: strList(obj, 'objectives', at)
    }
  }
}

export function parseAcronym(raw: unknown, where: string): AcronymRecord {
  const { obj, at, record } = base(raw, where)
  return {
    ...record,
    acronym: str(obj, 'acronym', at),
    expanded: str(obj, 'expanded', at),
    meaning: str(obj, 'meaning', at)
  }
}

export function parseDefinition(raw: unknown, where: string): DefinitionRecord {
  const { obj, at, record } = base(raw, where)
  if (typeof obj.typeable !== 'boolean') fail(at, '"typeable" must be true or false')
  return {
    ...record,
    term: str(obj, 'term', at),
    definition: str(obj, 'definition', at),
    typeable: obj.typeable,
    group: str(obj, 'group', at)
  }
}

/** Every phrase a user may type: acronyms, expanded forms, terms, and accepted answers. */
export function answerPhrases(
  acronyms: readonly AcronymRecord[],
  definitions: readonly DefinitionRecord[]
): string[] {
  return [
    ...acronyms.flatMap((r) => [r.acronym, r.expanded, ...r.acceptedAnswers]),
    ...definitions.flatMap((r) => [r.term, ...r.acceptedAnswers])
  ]
}
