import { describe, it, expect } from 'vitest'
import { nextMatchIndex } from './matchCursor'

describe('nextMatchIndex', () => {
  it('returns -1 when there are no matches', () => {
    expect(nextMatchIndex(-1, 1, 0)).toBe(-1)
    expect(nextMatchIndex(0, -1, 0)).toBe(-1)
  })

  it('first forward step from -1 lands on the first match', () => {
    expect(nextMatchIndex(-1, 1, 5)).toBe(0)
  })

  it('first backward step from -1 lands on the last match', () => {
    expect(nextMatchIndex(-1, -1, 5)).toBe(4)
  })

  it('wraps forward past the end', () => {
    expect(nextMatchIndex(4, 1, 5)).toBe(0)
  })

  it('wraps backward past the start', () => {
    expect(nextMatchIndex(0, -1, 5)).toBe(4)
  })

  it('steps within range', () => {
    expect(nextMatchIndex(1, 1, 5)).toBe(2)
    expect(nextMatchIndex(3, -1, 5)).toBe(2)
  })

  it('stays on the only match when count is 1', () => {
    expect(nextMatchIndex(-1, 1, 1)).toBe(0)
    expect(nextMatchIndex(0, 1, 1)).toBe(0)
    expect(nextMatchIndex(0, -1, 1)).toBe(0)
  })
})
