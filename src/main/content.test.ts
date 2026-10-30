import { describe, expect, it } from 'vitest'
import { createSpellChecker } from '@engine/spell'
import { normalizeAnswer } from '@engine/normalize'
import { loadContent, spellData } from './content'

// Loads the real files in content/.
describe('loadContent', () => {
  const content = loadContent(process.cwd())

  it('loads the acronym and definition records', () => {
    expect(content.acronyms.length).toBeGreaterThan(300)
    expect(content.definitions.length).toBeGreaterThan(1000)
  })

  it('keeps one record per acronym per certification', () => {
    const keys = content.acronyms.map((r) => `${r.certifications.join()}:${r.acronym}`)
    expect(new Set(keys).size).toBe(keys.length)
  })

  // Every expanded form and accepted answer must pass the spell check, or the right answer would be marked wrong.
  it('has no answer that the spell check rejects', () => {
    const data = spellData(content)
    const spell = createSpellChecker(data.aff, data.dic, data.words)
    const answers = [
      ...content.acronyms.flatMap((r) => [r.expanded, ...r.acceptedAnswers]),
      ...content.definitions.flatMap((r) => [r.term, ...r.acceptedAnswers])
    ]
    expect(answers.filter((a) => spell.misspelled(a).length > 0)).toEqual([])
  })

  it('has no expanded form that normalizes to nothing', () => {
    expect(content.acronyms.filter((r) => normalizeAnswer(r.expanded) === '')).toEqual([])
  })
})
