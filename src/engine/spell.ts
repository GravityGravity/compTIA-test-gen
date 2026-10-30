import nspell from 'nspell'

// Spell check for typed answers: nspell with the bundled en_US Hunspell dictionary, plus every
// word in the content records (acronyms, expanded forms, terms, accepted answers).
// The check ignores letter case, like the answer comparison.

export interface WordSpan {
  word: string
  start: number
  end: number
}

export interface SpellChecker {
  isCorrect(word: string): boolean
  /** The words in `text` that are misspelled, with their positions. */
  misspelled(text: string): WordSpan[]
}

const WORD = /[\p{L}\p{N}]+(?:['’][\p{L}\p{N}]+)*/gu

export function words(text: string): WordSpan[] {
  return [...text.matchAll(WORD)].map((m) => ({ word: m[0], start: m.index, end: m.index + m[0].length }))
}

/** Every word in a list of phrases, lowercased. */
export function wordsOf(phrases: Iterable<string>): Set<string> {
  const out = new Set<string>()
  for (const phrase of phrases) for (const { word } of words(phrase)) out.add(word.toLowerCase())
  return out
}

export function createSpellChecker(aff: string, dic: string, extraWords: Iterable<string>): SpellChecker {
  const hunspell = nspell(aff, dic)
  const extra = wordsOf(extraWords)
  const cache = new Map<string, boolean>()

  const isCorrect = (word: string): boolean => {
    if (/^\p{N}+$/u.test(word)) return true
    const lower = word.toLowerCase()
    const cached = cache.get(lower)
    if (cached !== undefined) return cached
    const capital = lower.charAt(0).toUpperCase() + lower.slice(1)
    const ok =
      extra.has(lower) || [word, lower, capital, word.toUpperCase()].some((form) => hunspell.correct(form))
    cache.set(lower, ok)
    return ok
  }

  return {
    isCorrect,
    misspelled: (text) => words(text).filter((span) => !isCorrect(span.word))
  }
}
