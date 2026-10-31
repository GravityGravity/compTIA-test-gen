import type { Grammar } from '@shared/exam'
import type { Random } from '../../random'

// A small Tracery-style expander. "#rule#" is replaced by one phrasing of that rule, picked by the
// seeded generator, and the phrasing is expanded in turn. Modifiers: "#rule.a#" adds "a" or "an",
// "#rule.capitalize#" starts with a capital letter. They can be combined: "#rule.a.capitalize#".

export class GrammarError extends Error {}

const REF = /#([A-Za-z0-9_-]+)((?:\.[a-z]+)*)#/g
const MAX_DEPTH = 12

function article(text: string): string {
  const word = text.trimStart()
  // An acronym is read letter by letter: "an SSD", "an HDMI cable", "a USB drive".
  const acronym = /^[A-Z0-9]{2,}\b/.test(word)
  const vowelSound = acronym
    ? /^[AEFHILMNORSX8]/.test(word)
    : /^[aeiou]/i.test(word) && !/^(uni|use|usu|one|eu)/i.test(word)
  return `${vowelSound ? 'an' : 'a'} ${word}`
}

function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1)
}

const MODIFIERS: Record<string, (text: string) => string> = { a: article, capitalize }

/**
 * Expands every "#rule#" in `text`. `bindings` adds or replaces rules for this one expansion
 * (for example the record's device and setting).
 */
export function expand(text: string, grammar: Grammar, rng: Random, bindings: Grammar = {}): string {
  const rules = { ...grammar, ...bindings }
  const run = (input: string, depth: number): string => {
    if (depth > MAX_DEPTH) throw new GrammarError(`the grammar goes too deep at "${input}"`)
    return input.replace(REF, (_, name: string, mods: string) => {
      const phrasings = rules[name]
      if (!phrasings || phrasings.length === 0) throw new GrammarError(`unknown grammar rule "#${name}#"`)
      let out = run(rng.pick(phrasings), depth + 1)
      for (const mod of mods.split('.').filter(Boolean)) {
        const fn = MODIFIERS[mod]
        if (!fn) throw new GrammarError(`unknown modifier ".${mod}" on "#${name}#"`)
        out = fn(out)
      }
      return out
    })
  }
  return run(text, 0)
}

/** "a", "a and b", "a, b, and c" */
export function joinList(items: readonly string[]): string {
  if (items.length <= 1) return items.join('')
  if (items.length === 2) return `${items[0]} and ${items[1]}`
  return `${items.slice(0, -1).join(', ')}, and ${items[items.length - 1]}`
}

/** Lower case first letter, for a sentence that goes on after it. An acronym ("USB …") stays. */
export function lowerFirst(text: string): string {
  return /^[A-Z][a-z]/.test(text) ? text.charAt(0).toLowerCase() + text.slice(1) : text
}
