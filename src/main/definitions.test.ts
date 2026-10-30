import { describe, expect, it } from 'vitest'
import { generateExercise } from '@engine/exercise/generate'
import { multipleChoiceQuestion } from '@engine/exercise/multipleChoice'
import { buildPool } from '@engine/exercise/pool'
import { gradeTyped } from '@engine/exercise/grade'
import { typedQuestion } from '@engine/exercise/typed'
import { createSpellChecker } from '@engine/spell'
import { normalizeAnswer } from '@engine/normalize'
import { createRandom } from '@engine/random'
import { loadCatalog } from './catalog'
import { loadContent, spellData } from './content'

// The Definition Exercise against the real config and content.
const catalog = loadCatalog(process.cwd())
const content = loadContent(process.cwd())
const { definitions } = content
const config = catalog.exercises.find((e) => e.id === 'definition-exercise')!
const choiceType = config.questionTypes.find((qt) => qt.type === 'multiple-choice')!
if (choiceType.type !== 'multiple-choice') throw new Error('no multiple-choice type')

describe.each(['a-plus', 'network-plus'])('Definition Exercise for %s', (cert) => {
  const records = definitions.filter((r) => r.certifications.includes(cert))

  it('can ask every record as multiple choice in both directions, with clean distractors', () => {
    const rng = createRandom(1)
    const norm = new Map(records.map((r) => [r.id, [normalizeAnswer(r.term), normalizeAnswer(r.definition)]]))
    for (const record of records) {
      const [term, definition] = norm.get(record.id)!
      for (const direction of ['term-to-definition', 'definition-to-term'] as const) {
        const q = multipleChoiceQuestion({ ...choiceType, direction }, record, records, rng)
        expect(q.options).toHaveLength(choiceType.choices)
        expect(new Set(q.options.map(normalizeAnswer)).size).toBe(choiceType.choices)
        expect(q.options[q.correctIndex]).toBe(q.answer)
        // No distractor is another record's text for the same term or definition.
        const twins = records.filter(
          (r) => r.id !== record.id && (norm.get(r.id)![0] === term || norm.get(r.id)![1] === definition)
        )
        for (const twin of twins)
          expect(q.options).not.toContain(direction === 'term-to-definition' ? twin.definition : twin.term)
      }
    }
  })

  it('builds the configured mix with no repeats', () => {
    const cfgCert = catalog.certifications.find((c) => c.id === cert)!
    const pool = buildPool(definitions, cert, cfgCert.exams)
    for (const seed of [1, 2, 3]) {
      const questions = generateExercise(config, pool, seed, records)
      expect(questions).toHaveLength(config.questionCount)
      expect(new Set(questions.map((q) => q.recordId)).size).toBe(config.questionCount)
      for (const qt of config.questionTypes)
        expect(questions.filter((q) => q.kind === qt.type)).toHaveLength(qt.count)
      const typed = questions.filter((q) => q.kind === 'typed')
      for (const q of typed) expect(definitions.find((r) => r.id === q.recordId)!.typeable).toBe(true)
    }
  })
})

describe('typed definition questions', () => {
  const data = spellData(content)
  const spell = createSpellChecker(data.aff, data.dic, data.words)
  const typedType = config.questionTypes.find((qt) => qt.type === 'typed')!
  if (typedType.type !== 'typed') throw new Error('no typed type')

  it('accept the acronym of the term', () => {
    const dhcp = definitions.find((d) => d.certifications.includes('a-plus') && d.acronyms?.includes('DHCP'))!
    const q = typedQuestion(typedType, dhcp)
    expect(gradeTyped(q, 'DHCP', spell).correct).toBe(true)
    expect(gradeTyped(q, 'dhcp', spell).correct).toBe(true)
    expect(gradeTyped(q, dhcp.term, spell).correct).toBe(true)
  })

  it('link many terms to their acronyms in both certifications', () => {
    for (const cert of ['a-plus', 'network-plus'])
      expect(definitions.filter((d) => d.certifications.includes(cert) && d.acronyms).length).toBeGreaterThan(
        50
      )
  })
})
