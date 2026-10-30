import type { AcronymRecord, DefinitionRecord } from '@shared/types'

type PoolRecord = Pick<AcronymRecord | DefinitionRecord, 'certifications' | 'exams'>

/** A record is in the pool when it belongs to the certification and to at least one selected exam. */
export function inPool(record: PoolRecord, certification: string, exams: readonly string[]): boolean {
  return record.certifications.includes(certification) && record.exams.some((e) => exams.includes(e))
}

export function buildPool<T extends PoolRecord>(
  records: readonly T[],
  certification: string,
  exams: readonly string[]
): T[] {
  return records.filter((r) => inPool(r, certification, exams))
}
