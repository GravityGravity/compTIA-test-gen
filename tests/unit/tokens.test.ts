import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

// tokens.css must match the compTIA UI style tokens exactly.
const tokens = JSON.parse(readFileSync('references/comptia-ui-style/tokens.json', 'utf8'))
const css = readFileSync('src/renderer/src/styles/tokens.css', 'utf8')

const declared = new Map(
  [...css.matchAll(/--([\w-]+):\s*([^;]+);/g)].map((m) => [m[1] as string, (m[2] as string).trim()])
)

const expected: Array<[string, string]> = [
  ...tokens.color.tokens.map((t: { name: string; value: string }) => [t.name, t.value]),
  ...tokens.spacing.tokens.map((t: { name: string; value: string }) => [t.name, t.value]),
  ...tokens.radius.tokens.map((t: { name: string; value: string }) => [t.name, t.value]),
  ...tokens.shadow.tokens.map((t: { name: string; value: string }) => [t.name, t.value]),
  ['font-sans', tokens.type.families.sans]
]

describe('tokens.css', () => {
  it.each(expected)('--%s is %s', (name, value) => {
    expect(declared.get(name)).toBe(value)
  })

  it('declares nothing that is not in tokens.json', () => {
    expect([...declared.keys()].sort()).toEqual(expected.map(([name]) => name).sort())
  })
})
