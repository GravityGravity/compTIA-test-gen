import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { basename, join, relative } from 'node:path'
import dictionary from 'dictionary-en'
import { answerPhrases, linkAcronyms, parseAcronym, parseDefinition } from '@engine/content'
import {
  checkExamLinks,
  mergeGrammar,
  parseGrammar,
  parsePoolQuestion,
  parseScenario
} from '@engine/exam/parse'
import { wordsOf } from '@engine/spell'
import type { ExamContent, Grammar } from '@shared/exam'
import type { ContentByKind, ExamConfig, SpellData } from '@shared/types'

/** Every *.json file under `dir`, in a stable order. */
function jsonFiles(dir: string): string[] {
  return readdirSync(dir, { recursive: true, encoding: 'utf8' })
    .filter((name) => name.endsWith('.json'))
    .sort()
    .map((name) => join(dir, name))
}

function readRecords<T>(root: string, dir: string, parse: (raw: unknown, where: string) => T): T[] {
  return jsonFiles(join(root, 'content', dir)).flatMap((file) => readArray(root, file, parse))
}

function readArray<T>(root: string, file: string, parse: (raw: unknown, where: string) => T): T[] {
  const where = relative(root, file)
  const data: unknown = JSON.parse(readFileSync(file, 'utf8'))
  if (!Array.isArray(data)) throw new Error(`${where}: the file must hold a JSON array of records`)
  return data.map((raw, i) => parse(raw, `${where} [${i}]`))
}

/** Reads and checks content/acronyms/ and content/definitions/. `root` holds the `content/` folder. */
export function loadContent(root: string): ContentByKind {
  const acronyms = readRecords(root, 'acronyms', parseAcronym)
  return {
    acronyms,
    definitions: linkAcronyms(readRecords(root, 'definitions', parseDefinition), acronyms)
  }
}

function readGrammar(root: string, file: string): Grammar {
  return existsSync(file) ? parseGrammar(JSON.parse(readFileSync(file, 'utf8')), relative(root, file)) : {}
}

/** Records of one exam module folder (pool/ or scenarios/), checked against the exam and the file's domain. */
function readExamRecords<T extends { id: string; exam: string; domain: string }>(
  root: string,
  dir: string,
  exam: ExamConfig,
  parse: (raw: unknown, where: string) => T
): T[] {
  if (!existsSync(dir)) return []
  return jsonFiles(dir).flatMap((file) => {
    const where = relative(root, file)
    const domain = /^d(\d+)\.json$/.exec(basename(file))?.[1]
    if (!domain) throw new Error(`${where}: an exam content file is named d<domain>.json`)
    return readArray(root, file, parse).map((r) => {
      if (r.exam !== exam.id) throw new Error(`${where} (${r.id}): "exam" must be ${exam.id}`)
      if (r.domain !== domain)
        throw new Error(`${where} (${r.id}): "domain" must be ${domain}, as the file name says`)
      return r
    })
  })
}

/**
 * Reads the content of each exam from its folder (the config's `content`): pool/, scenarios/, and
 * grammar.json, plus content/shared/grammar.json. An exam without a folder gets empty content.
 */
export function loadExamContent(root: string, exams: readonly ExamConfig[]): Record<string, ExamContent> {
  const shared = readGrammar(root, join(root, 'content', 'shared', 'grammar.json'))
  const out: Record<string, ExamContent> = {}
  for (const exam of exams) {
    const dir = join(root, 'content', exam.content)
    const pool = readExamRecords(root, join(dir, 'pool'), exam, parsePoolQuestion)
    const scenarios = readExamRecords(root, join(dir, 'scenarios'), exam, parseScenario)
    checkExamLinks(pool, scenarios)
    out[exam.id] = {
      pool,
      scenarios,
      grammar: mergeGrammar(shared, readGrammar(root, join(dir, 'grammar.json')))
    }
  }
  return out
}

const decoder = new TextDecoder()

/** The en_US dictionary plus every word a user may type for an answer. */
export function spellData(content: ContentByKind): SpellData {
  return {
    aff: decoder.decode(dictionary.aff),
    dic: decoder.decode(dictionary.dic),
    words: [...wordsOf(answerPhrases(content.acronyms, content.definitions))].sort()
  }
}
