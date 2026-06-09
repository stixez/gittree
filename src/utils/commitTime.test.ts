import { describe, it, expect } from 'vitest'
import { authorLocalHour, authorLocalDay } from './commitTime'

// 2026-06-08 07:00:00 UTC — a Monday
const UTC_0700 = Date.UTC(2026, 5, 8, 7, 0, 0) / 1000

describe('authorLocalHour', () => {
  it('returns the UTC hour when offset is 0', () => {
    expect(authorLocalHour(UTC_0700, 0)).toBe(7)
  })
  it('returns UTC hour when offset is missing', () => {
    expect(authorLocalHour(UTC_0700)).toBe(7)
  })
  it('applies a positive UTC offset (e.g. UTC+2 → tzOffset -120 → 09:00 local)', () => {
    expect(authorLocalHour(UTC_0700, -120)).toBe(9)
  })
  it('applies a negative UTC offset (e.g. UTC-5 → tzOffset 300 → 02:00 local)', () => {
    expect(authorLocalHour(UTC_0700, 300)).toBe(2)
  })
  it('handles fractional-hour offsets (e.g. India UTC+5:30 → tzOffset -330)', () => {
    // 07:00 UTC + 5:30 = 12:30 local → hour 12
    expect(authorLocalHour(UTC_0700, -330)).toBe(12)
  })
  it('wraps hours across midnight', () => {
    // 01:00 UTC, author at UTC-5 → 20:00 previous day, local hour 20
    const utc0100 = Date.UTC(2026, 5, 8, 1, 0, 0) / 1000
    expect(authorLocalHour(utc0100, 300)).toBe(20)
  })
})

describe('authorLocalDay', () => {
  it('returns the UTC weekday when offset is 0 (Mon = 1)', () => {
    expect(authorLocalDay(UTC_0700, 0)).toBe(1)
  })
  it('rolls back to the previous day in a far-west timezone', () => {
    // 2026-06-08 01:00 UTC (Monday); author at UTC-5 → Sunday 20:00 local → 0
    const utc0100 = Date.UTC(2026, 5, 8, 1, 0, 0) / 1000
    expect(authorLocalDay(utc0100, 300)).toBe(0)
  })
  it('rolls forward to the next day in a far-east timezone', () => {
    // 2026-06-08 23:00 UTC (Monday); author at UTC+5 → Tuesday 04:00 local → 2
    const utc2300 = Date.UTC(2026, 5, 8, 23, 0, 0) / 1000
    expect(authorLocalDay(utc2300, -300)).toBe(2)
  })
})
