import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { checkCatalogLinks, parseCertification, parseExercise } from '@engine/config'
import type { Catalog } from '@shared/types'

function readJsonDir<T>(dir: string, parse: (raw: unknown, where: string) => T): T[] {
  return readdirSync(dir)
    .filter((name) => name.endsWith('.json'))
    .sort()
    .map((name) => {
      const where = join(dir, name)
      return parse(JSON.parse(readFileSync(where, 'utf8')), where)
    })
}

/** Reads and checks every config. `root` holds the `config/` folder. */
export function loadCatalog(root: string): Catalog {
  const certifications = readJsonDir(join(root, 'config', 'certifications'), parseCertification)
  const exercises = readJsonDir(join(root, 'config', 'exercises'), parseExercise)
  checkCatalogLinks(certifications, exercises)
  return { certifications, exercises }
}
