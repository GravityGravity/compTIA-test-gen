import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { createRandom } from '../../random'
import { parseGrammar } from '../parse'
import { expand, GrammarError, joinList, missingRules } from './grammar'

describe('expand', () => {
  const grammar = {
    greeting: ['#name.capitalize# says hi to #thing.a#'],
    name: ['ana'],
    thing: ['SSD', 'cable', 'old PC']
  }

  it('replaces rules, with modifiers', () => {
    const seen = new Set<string>()
    for (let seed = 0; seed < 30; seed++) seen.add(expand('#greeting#', grammar, createRandom(seed)))
    expect([...seen].sort()).toEqual([
      'Ana says hi to a cable',
      'Ana says hi to an SSD',
      'Ana says hi to an old PC'
    ])
  })

  it('takes bound rules over the grammar', () => {
    expect(expand('#name#', grammar, createRandom(1), { name: ['sam'] })).toBe('sam')
  })

  it('stops on an unknown rule or modifier', () => {
    expect(() => expand('#nope#', grammar, createRandom(1))).toThrow(GrammarError)
    expect(() => expand('#name.shout#', grammar, createRandom(1))).toThrow(/modifier/)
  })

  it('joins lists in plain English', () => {
    expect(joinList(['a'])).toBe('a')
    expect(joinList(['a', 'b'])).toBe('a and b')
    expect(joinList(['a', 'b', 'c'])).toBe('a, b, and c')
  })
})

describe('content/shared/grammar.json', () => {
  const shared = parseGrammar(JSON.parse(readFileSync('content/shared/grammar.json', 'utf8')), 'shared')
  // Rules that each generator binds at run time from the record.
  const bound = ['fits', 'clues', 'need', 'conditions', 'itemType', 'task', 'done', 'order']

  it('uses only rules that exist', () => {
    expect(missingRules(shared, bound)).toEqual([])
  })

  // The question asks are where the qualifier words are; the app reads them from the stem.
  it('writes qualifier words in capitals in the question asks', () => {
    const lower = Object.entries(shared)
      .filter(([name]) => name.startsWith('ask'))
      .flatMap(([, phrasings]) => phrasings)
      .filter((p) => /\b(most likely|best|first|next)\b/.test(p))
    expect(lower).toEqual([])
  })
})

describe('the person rule', () => {
  it('uses "an" before a vowel sound', () => {
    const shared = parseGrammar(JSON.parse(readFileSync('content/shared/grammar.json', 'utf8')), 'shared')
    const out = new Set<string>()
    for (let seed = 0; seed < 300; seed++) out.add(expand('#person#', shared, createRandom(seed)))
    expect([...out].filter((p) => /\ba [aeiou]/i.test(p))).toEqual([])
    expect([...out].some((p) => p.startsWith('an accountant'))).toBe(true)
  })
})
