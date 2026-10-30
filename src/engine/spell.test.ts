import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { createSpellChecker, words } from './spell'

const aff = readFileSync('node_modules/dictionary-en/index.aff', 'utf8')
const dic = readFileSync('node_modules/dictionary-en/index.dic', 'utf8')
const spell = createSpellChecker(aff, dic, ['IPsec', 'Keyboard-Video-Mouse', 'Kerberos'])

describe('words', () => {
  it('finds each word with its position', () => {
    expect(words('Input/Output  sys')).toEqual([
      { word: 'Input', start: 0, end: 5 },
      { word: 'Output', start: 6, end: 12 },
      { word: 'sys', start: 14, end: 17 }
    ])
  })
})

describe('createSpellChecker', () => {
  it('accepts dictionary words in any letter case', () => {
    expect(spell.misspelled('domain name system')).toEqual([])
    expect(spell.misspelled('DOMAIN NAME SYSTEM')).toEqual([])
    expect(spell.misspelled('Domain Name System')).toEqual([])
  })

  it('accepts the extra words from content in any letter case', () => {
    expect(spell.misspelled('ipsec kerberos')).toEqual([])
  })

  it('accepts numbers', () => {
    expect(spell.misspelled('802 11')).toEqual([])
  })

  it('finds misspelled words', () => {
    expect(spell.misspelled('Domain Name Sytem').map((w) => w.word)).toEqual(['Sytem'])
    expect(spell.misspelled('Dinamic Host Configuraton').map((w) => w.word)).toEqual([
      'Dinamic',
      'Configuraton'
    ])
  })
})
