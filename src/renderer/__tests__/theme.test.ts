import { describe, it, expect } from 'vitest'
import { lodForZoom, nodeRadius, LANE_COLORS, GOLD } from '../theme'
import type { SceneNode } from '../types'

const base = (over: Partial<SceneNode>): SceneNode => ({
  oid: 'a', x: 0, y: 0, lane: 0, kind: 'commit', parentCount: 1,
  isHead: false, hasBranch: false, hasTag: false, branches: [], tags: [], significant: false,
  message: 'm', authorName: 'n', authorEmail: '', authorTs: 0, parents: ['p'], ...over,
})

describe('lodForZoom', () => {
  it('returns 0 (dot) when far', () => expect(lodForZoom(0.2)).toBe(0))
  it('returns 1 (orb) at mid zoom', () => expect(lodForZoom(0.4)).toBe(1))
  it('returns 2 (full) when close', () => expect(lodForZoom(0.8)).toBe(2))
})

describe('nodeRadius', () => {
  it('ordinary commit is base size', () => {
    expect(nodeRadius(base({}))).toBe(6)
  })
  it('significant commit is larger', () => {
    expect(nodeRadius(base({ significant: true }))).toBe(9)
  })
  it('merge grows with parent count', () => {
    expect(nodeRadius(base({ kind: 'merge', parentCount: 2 }))).toBe(10)
    expect(nodeRadius(base({ kind: 'merge', parentCount: 4 }))).toBeGreaterThan(10)
  })
})

describe('LANE_COLORS', () => {
  it('reserves the highlighted-path gold as the first lane color', () => {
    expect(LANE_COLORS[0]).toBe(GOLD)
  })
})
