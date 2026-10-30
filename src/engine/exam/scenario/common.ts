import type { Grammar, ScenarioRecord } from '@shared/exam'
import { normalizeAnswer } from '../../normalize'
import { expand } from './grammar'
import type { GenerateContext } from './types'

/** The record's device and setting as grammar rules, so "#device#" and "#setting#" name them. */
export function bindings(record: ScenarioRecord, extra: Grammar = {}): Grammar {
  return {
    ...(record.devices.length > 0 ? { device: record.devices.map((d) => `#${d}#`) } : {}),
    ...(record.settings.length > 0 ? { setting: record.settings.map((s) => `#${s}#`) } : {}),
    ...extra
  }
}

export function say(ctx: GenerateContext, rule: string, record: ScenarioRecord, extra: Grammar = {}): string {
  return expand(`#${rule}#`, ctx.grammar, ctx.rng, bindings(record, extra))
}

/**
 * Up to `count` related records whose answer text (from `text`) differs from the target's and from
 * each other, in random order.
 */
export function distractorRecords<R extends ScenarioRecord>(
  record: R,
  ctx: GenerateContext,
  text: (r: R) => string | undefined,
  count: number
): R[] {
  const seen = new Set([normalizeAnswer(text(record) ?? '')])
  const out: R[] = []
  const related = 'related' in record ? record.related : []
  for (const id of ctx.rng.shuffle(related)) {
    const r = ctx.byId.get(id) as R | undefined
    const t = r && r.kind === record.kind ? text(r) : undefined
    if (!r || !t || seen.has(normalizeAnswer(t))) continue
    seen.add(normalizeAnswer(t))
    out.push(r)
    if (out.length === count) break
  }
  return out
}
