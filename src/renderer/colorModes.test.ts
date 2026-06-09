import { describe, it, expect } from 'vitest'
import { hashString, authorColor, authorKey, hexLerp, nodeColor, colorCtxFromNodes, AUTHOR_COLORS } from './colorModes'
import { laneColor } from './theme'
import type { SceneNode } from './types'

function node(p: Partial<SceneNode>): SceneNode {
  return {
    oid: 'x', x: 0, y: 0, lane: 2, kind: 'commit', parentCount: 1,
    isHead: false, hasBranch: false, hasTag: false, branches: [], tags: [],
    significant: false, message: '', authorName: 'Ada', authorEmail: 'ada@x.com',
    authorTs: 100, parents: [],
    ...p,
  }
}

describe('hashString / authorColor', () => {
  it('is deterministic for the same name', () => {
    expect(hashString('Ada')).toBe(hashString('Ada'))
    expect(authorColor('Ada')).toBe(authorColor('Ada'))
  })
  it('returns a color from the palette', () => {
    expect(AUTHOR_COLORS).toContain(authorColor('Grace'))
  })
})

describe('hexLerp', () => {
  it('returns endpoints at t=0 and t=1', () => {
    expect(hexLerp('#000000', '#ffffff', 0)).toBe('#000000')
    expect(hexLerp('#000000', '#ffffff', 1)).toBe('#ffffff')
  })
  it('midpoint is grey for black↔white', () => {
    expect(hexLerp('#000000', '#ffffff', 0.5)).toBe('#808080')
  })
})

describe('nodeColor', () => {
  const ctx = { minTs: 0, maxTs: 100 }
  it('branch mode uses the lane color', () => {
    expect(nodeColor(node({ lane: 3 }), 'branch', ctx)).toBe(laneColor(3))
  })
  it('author mode keys on email so name-spelling variants share a color', () => {
    const a = nodeColor(node({ authorName: 'Ada Lovelace', authorEmail: 'ada@x.com' }), 'author', ctx)
    const b = nodeColor(node({ authorName: 'ada', authorEmail: 'Ada@X.com' }), 'author', ctx)
    expect(a).toBe(authorColor(authorKey({ authorEmail: 'ada@x.com', authorName: 'Ada Lovelace' })))
    expect(a).toBe(b) // same email (case-insensitive) → same color despite different names
  })
  it('author mode falls back to name when email is blank', () => {
    const a = nodeColor(node({ authorName: 'Ada', authorEmail: '' }), 'author', ctx)
    expect(a).toBe(authorColor('name:ada'))
  })
  it('recency maps oldest→cold and newest→warm', () => {
    const oldest = nodeColor(node({ authorTs: 0 }), 'recency', ctx)
    const newest = nodeColor(node({ authorTs: 100 }), 'recency', ctx)
    expect(oldest).not.toBe(newest)
  })
})

describe('colorCtxFromNodes', () => {
  it('finds min/max timestamps', () => {
    expect(colorCtxFromNodes([{ authorTs: 5 }, { authorTs: 50 }, { authorTs: 20 }])).toEqual({ minTs: 5, maxTs: 50 })
  })
  it('handles empty input', () => {
    expect(colorCtxFromNodes([])).toEqual({ minTs: 0, maxTs: 0 })
  })
})
