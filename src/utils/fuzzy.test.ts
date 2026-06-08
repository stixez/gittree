import { describe, it, expect } from 'vitest'
import { fuzzyMatch, rankItems } from './fuzzy'

describe('fuzzyMatch', () => {
  it('returns a score for a subsequence match (case-insensitive)', () => {
    expect(fuzzyMatch('abc', 'aXbXc')).not.toBeNull()
    expect(fuzzyMatch('ABC', 'aXbXc')).not.toBeNull()
  })
  it('returns null when not a subsequence', () => {
    expect(fuzzyMatch('abc', 'acb')).toBeNull()
  })
  it('scores consecutive matches higher than scattered ones', () => {
    const consecutive = fuzzyMatch('abc', 'abc')!
    const scattered = fuzzyMatch('abc', 'aXbXc')!
    expect(consecutive).toBeGreaterThan(scattered)
  })
  it('treats empty query as a neutral match (score 0)', () => {
    expect(fuzzyMatch('', 'anything')).toBe(0)
  })
})

describe('rankItems', () => {
  const items = ['main', 'maintenance', 'feature/login', 'release']
  it('returns matches ordered by score', () => {
    const out = rankItems('main', items, (s) => s)
    expect(out[0]).toBe('main')
    expect(out).toContain('maintenance')
    expect(out).not.toContain('release')
  })
  it('passes everything through (capped) for an empty query', () => {
    expect(rankItems('', items, (s) => s, 2)).toEqual(['main', 'maintenance'])
  })
  it('respects the limit', () => {
    expect(rankItems('e', items, (s) => s, 1).length).toBe(1)
  })
})
