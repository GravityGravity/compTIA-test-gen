import { readdirSync, readFileSync } from 'node:fs'
import { join, relative } from 'node:path'
import dictionary from 'dictionary-en'
import { answerPhrases, linkAcronyms, parseAcronym, parseDefinition } from '@engine/content'
import { wordsOf } from '@engine/spell'
import type { ContentByKind, SpellData } from '@shared/types'

/** Every *.json file under `dir`, in a stable order. */
function jsonFiles(dir: string): string[] {
  return readdirSync(dir, { recursive: true, encoding: 'utf8' })
    .filter((name) => name.endsWith('.json'))
    .sort()
    .map((name) => join(dir, name))
}

function readRecords<T>(root: string, dir: string, parse: (raw: unknown, where: string) => T): T[] {
  return jsonFiles(join(root, 'content', dir)).flatMap((file) => {
    const where = relative(root, file)
    const data: unknown = JSON.parse(readFileSync(file, 'utf8'))
    if (!Array.isArray(data)) throw new Error(`${where}: the file must hold a JSON array of records`)
    return data.map((raw, i) => parse(raw, `${where} [${i}]`))
  })
}

/** Reads and checks content/acronyms/ and content/definitions/. `root` holds the `content/` folder. */
export function loadContent(root: string): ContentByKind {
  const acronyms = readRecords(root, 'acronyms', parseAcronym)
  return {
    acronyms,
    definitions: linkAcronyms(readRecords(root, 'definitions', parseDefinition), acronyms)
  }
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
