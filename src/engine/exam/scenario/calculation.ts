import type { CalculationRecord } from '@shared/exam'
import type { Random } from '../../random'
import { say } from './common'
import type { Draft, ScenarioGenerator } from './types'

// IPv4 subnet calculations, worked out in code. Addresses are 32-bit numbers.

const toIp = (n: number) => [24, 16, 8, 0].map((s) => (n >>> s) & 255).join('.')
const maskOf = (prefix: number) => (prefix === 0 ? 0 : (0xffffffff << (32 - prefix)) >>> 0)
const usable = (prefix: number) => 2 ** (32 - prefix) - 2

/** A random private address (10/8, 172.16/12, or 192.168/16) that leaves room for the prefix. */
function privateAddress(rng: Random, prefix: number): number {
  const ranges: Array<[base: number, bits: number]> = (
    [
      [0x0a000000, 8],
      [0xac100000, 12],
      [0xc0a80000, 16]
    ] as Array<[number, number]>
  ).filter(([, bits]) => bits <= prefix)
  const [base, bits] = rng.pick(ranges)
  const span = 2 ** (32 - bits)
  return (base + Math.floor(rng.next() * span)) >>> 0
}

/** Distinct wrong values with their explanations, then `count` of them at random. */
function pickWrong(rng: Random, right: string, wrong: Array<[string, string]>, count: number) {
  const seen = new Set([right])
  const unique = wrong.filter(([v]) => !seen.has(v) && (seen.add(v), true))
  return rng.sample(unique, Math.min(count, unique.length))
}

export const calculation: ScenarioGenerator<CalculationRecord> = {
  canGenerate: () => true,

  generate(record, ctx): Draft {
    const { rng } = ctx
    // The mask question asks for a host count, so it needs a prefix with a smaller neighbour.
    const p = rng.int(
      Math.max(record.prefixMin, record.calculation === 'subnet-mask' ? 9 : 8),
      record.prefixMax
    )
    const h = 32 - p
    const block = 2 ** h
    const host = privateAddress(rng, p)
    const network = (host & maskOf(p)) >>> 0
    const broadcast = (network + block - 1) >>> 0
    const opening = say(ctx, 'calculationOpening', record)
    const how = `A /${p} prefix leaves ${h} host bits, so each subnet has ${block} addresses, and ${usable(p)} of them are usable hosts (the network and broadcast addresses are reserved).`
    let stem: string
    let right: string
    let wrong: Array<[string, string]>
    let detail: string

    switch (record.calculation) {
      case 'subnet-hosts': {
        stem = `${opening} The subnet is ${toIp(network)}/${p}. How many usable host addresses does it have?`
        right = String(usable(p))
        wrong = [
          [
            String(block),
            'That counts every address in the subnet, including the network and broadcast addresses.'
          ],
          [
            String(block - 1),
            'That reserves only one address, but both the network and broadcast addresses are reserved.'
          ],
          ...(p > 8
            ? [
                [String(usable(p - 1)), `That is the number of usable hosts in a /${p - 1} subnet.`] as [
                  string,
                  string
                ]
              ]
            : []),
          ...(p < 30
            ? [
                [String(usable(p + 1)), `That is the number of usable hosts in a /${p + 1} subnet.`] as [
                  string,
                  string
                ]
              ]
            : [])
        ]
        detail = `The formula is 2^${h} − 2 = ${usable(p)}.`
        break
      }
      case 'subnet-mask': {
        const need = rng.int(p < 30 ? usable(p + 1) + 1 : 1, usable(p))
        stem = `${opening} One subnet must hold ${need} hosts, and the addresses must not be wasted. Which subnet mask should the technician use?`
        right = toIp(maskOf(p))
        wrong = [
          ...(p < 30
            ? [
                [
                  toIp(maskOf(p + 1)),
                  `That mask (/${p + 1}) gives only ${usable(p + 1)} usable hosts, which is too few.`
                ] as [string, string]
              ]
            : []),
          [
            toIp(maskOf(p - 1)),
            `That mask (/${p - 1}) gives ${usable(p - 1)} usable hosts, which fits but wastes addresses.`
          ],
          ...(p > 9
            ? [
                [
                  toIp(maskOf(p - 2)),
                  `That mask (/${p - 2}) gives ${usable(p - 2)} usable hosts, which wastes even more addresses.`
                ] as [string, string]
              ]
            : []),
          ...(p < 29
            ? [
                [
                  toIp(maskOf(p + 2)),
                  `That mask (/${p + 2}) gives only ${usable(p + 2)} usable hosts, which is too few.`
                ] as [string, string]
              ]
            : []),
          ...(p > 10
            ? [
                [
                  toIp(maskOf(p - 3)),
                  `That mask (/${p - 3}) gives ${usable(p - 3)} usable hosts, which wastes many addresses.`
                ] as [string, string]
              ]
            : [])
        ]
        detail = `The /${p} mask is ${right}, the smallest subnet with room for ${need} hosts.`
        break
      }
      case 'network-address':
      case 'broadcast-address': {
        const askNetwork = record.calculation === 'network-address'
        stem = `${opening} A host has the address ${toIp(host)}/${p}. What is the ${askNetwork ? 'network' : 'broadcast'} address of its subnet?`
        right = toIp(askNetwork ? network : broadcast)
        wrong = [
          [
            toIp(askNetwork ? broadcast : network),
            `That is the ${askNetwork ? 'broadcast' : 'network'} address of the subnet.`
          ],
          [toIp((network + block) >>> 0), 'That address is in the next subnet.'],
          [
            toIp((askNetwork ? network + 1 : broadcast - 1) >>> 0),
            `That is the ${askNetwork ? 'first' : 'last'} usable host address, not the ${askNetwork ? 'network' : 'broadcast'} address.`
          ],
          [
            toIp((askNetwork ? network - block : network - 1) >>> 0),
            'That address is in the subnet before this one.'
          ]
        ]
        detail = `${toIp(host)} falls in the block that starts at ${toIp(network)}, so the network address is ${toIp(network)} and the broadcast address is ${toIp(broadcast)}.`
        break
      }
    }
    const chosen = pickWrong(rng, right, wrong, 3)
    return {
      stem,
      options: [right, ...chosen.map(([v]) => v)],
      answer: [0],
      explanation: `${how} ${detail}`,
      whyWrong: [null, ...chosen.map(([, why]) => why)],
      structure: 'calculation'
    }
  }
}
