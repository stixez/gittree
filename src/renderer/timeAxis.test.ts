import { describe, it, expect } from 'vitest'
import { monthLabel, computeTimeBands } from './timeAxis'

// 2026-06-08 and 2026-05-20 in unix seconds (UTC)
const JUN_2026 = Date.UTC(2026, 5, 8) / 1000
const JUN_2026_LATER = Date.UTC(2026, 5, 20) / 1000
const MAY_2026 = Date.UTC(2026, 4, 20) / 1000
const JUL_2026 = Date.UTC(2026, 6, 5) / 1000

describe('monthLabel', () => {
  it('formats month + year in UTC', () => {
    expect(monthLabel(JUN_2026)).toBe('Jun 2026')
    expect(monthLabel(MAY_2026)).toBe('May 2026')
  })
})

describe('computeTimeBands', () => {
  it('emits one band per distinct month at the first y it appears', () => {
    const bands = computeTimeBands([
      { y: 0, authorTs: JUN_2026 },
      { y: 10, authorTs: JUN_2026_LATER }, // same month → no new band
      { y: 20, authorTs: MAY_2026 },
    ])
    expect(bands).toEqual([
      { y: 0, label: 'Jun 2026' },
      { y: 20, label: 'May 2026' },
    ])
  })
  it('returns bands sorted by y regardless of input order', () => {
    const bands = computeTimeBands([
      { y: 50, authorTs: MAY_2026 },
      { y: 5, authorTs: JUN_2026 },
    ])
    expect(bands.map(b => b.y)).toEqual([5, 50])
  })
  it('skips an out-of-order newer month so bands stay chronological down the axis', () => {
    // y increases downward (older). A July commit topologically placed below the
    // June band would make markers read Jun → Jul → May; the monotonic guard
    // skips it so the axis stays Jun → May.
    const bands = computeTimeBands([
      { y: 0, authorTs: JUN_2026 },
      { y: 10, authorTs: JUL_2026 }, // newer than the Jun band above → skip
      { y: 20, authorTs: MAY_2026 },
    ])
    expect(bands).toEqual([
      { y: 0, label: 'Jun 2026' },
      { y: 20, label: 'May 2026' },
    ])
  })

  it('handles empty input', () => {
    expect(computeTimeBands([])).toEqual([])
  })
})
