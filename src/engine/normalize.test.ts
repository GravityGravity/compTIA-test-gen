import { describe, expect, it } from 'vitest'
import { normalizeAnswer } from './normalize'

describe('normalizeAnswer', () => {
  it('ignores letter case, extra spaces, and punctuation', () => {
    expect(normalizeAnswer('  Basic   Input/Output  System ')).toBe('basic input output system')
    expect(normalizeAnswer('Keyboard-Video-Mouse')).toBe(normalizeAnswer('keyboard video mouse'))
    expect(normalizeAnswer('Authentication, Authorization, and Accounting.')).toBe(
      'authentication authorization and accounting'
    )
  })

  it('keeps letters and digits', () => {
    expect(normalizeAnswer('IEEE 802.11ax')).toBe('ieee 802 11ax')
  })

  it('does not join words', () => {
    expect(normalizeAnswer('WiFi')).not.toBe(normalizeAnswer('Wi-Fi'))
  })
})
