import { describe, expect, it } from 'vitest'
import { loadCatalog } from './catalog'

// Loads the real files in config/, so a broken config fails the tests.
describe('loadCatalog', () => {
  const catalog = loadCatalog(process.cwd())

  it('loads every certification', () => {
    expect(catalog.certifications.map((c) => c.id)).toEqual(['a-plus', 'network-plus'])
  })

  it('loads every exercise module', () => {
    expect(catalog.exercises.map((e) => e.id).sort()).toEqual(['acronym-exercise', 'definition-exercise'])
  })
})
