import { describe, expect, it } from 'vitest'
import type { AcronymRecord, DefinitionRecord } from '@shared/types'
import { linkAcronyms } from './content'

const acronym = (
  acr: string,
  expanded: string,
  cert = 'a-plus',
  acceptedAnswers: string[] = []
): AcronymRecord => ({
  id: `acr-${acr}-${cert}`,
  acronym: acr,
  expanded,
  meaning: '',
  acceptedAnswers,
  certifications: [cert],
  exams: [],
  objectives: []
})

const definition = (term: string, acceptedAnswers: string[] = [], cert = 'a-plus'): DefinitionRecord => ({
  id: `def-${term}`,
  term,
  definition: '',
  typeable: true,
  group: 'g',
  acceptedAnswers,
  certifications: [cert],
  exams: [],
  objectives: []
})

describe('linkAcronyms', () => {
  const acronyms = [
    acronym('NFC', 'Near Field Communication'),
    acronym('VLAN', 'Virtual LAN', 'a-plus', ['Virtual Local Area Network']),
    acronym('MDM', 'Mobile Device Management', 'network-plus')
  ]

  it('links an acronym whose expanded form is the term, ignoring case and punctuation', () => {
    expect(linkAcronyms([definition('Near-field communication')], acronyms)[0]!.acronyms).toEqual(['NFC'])
  })

  it('matches through accepted answers on either side', () => {
    expect(linkAcronyms([definition('Virtual Local Area Network')], acronyms)[0]!.acronyms).toEqual(['VLAN'])
  })

  it('links only acronyms of the same certification', () => {
    expect(linkAcronyms([definition('Mobile device management')], acronyms)[0]!.acronyms).toBeUndefined()
    expect(
      linkAcronyms([definition('Mobile device management', [], 'network-plus')], acronyms)[0]!.acronyms
    ).toEqual(['MDM'])
  })

  it('leaves a term with no acronym unchanged', () => {
    const d = definition('Firewall')
    expect(linkAcronyms([d], acronyms)[0]).toBe(d)
  })
})
