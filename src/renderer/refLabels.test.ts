import { describe, it, expect } from 'vitest'
import { classifyBranch, truncateRef, nodeRefBadges, stackVertically, REF_COLORS } from './refLabels'
import type { SceneNode } from './types'

function node(partial: Partial<SceneNode>): SceneNode {
  return {
    oid: 'x', x: 0, y: 0, lane: 0, kind: 'commit', parentCount: 1,
    isHead: false, hasBranch: false, hasTag: false,
    branches: [], tags: [], significant: false,
    message: '', authorName: '', authorEmail: '', authorTs: 0, parents: [],
    ...partial,
  }
}

describe('classifyBranch', () => {
  it('flags known remote prefixes', () => {
    expect(classifyBranch('origin/main')).toBe('remote')
    expect(classifyBranch('upstream/dev')).toBe('remote')
    expect(classifyBranch('remotes/origin/x')).toBe('remote')
  })
  it('treats local feature branches (with slashes) as local', () => {
    expect(classifyBranch('feature/login')).toBe('local')
    expect(classifyBranch('main')).toBe('local')
  })
})

describe('truncateRef', () => {
  it('passes short names through', () => {
    expect(truncateRef('main')).toBe('main')
  })
  it('truncates long names with an ellipsis', () => {
    const out = truncateRef('a'.repeat(40), 10)
    expect(out).toHaveLength(10)
    expect(out.endsWith('…')).toBe(true)
  })
})

describe('nodeRefBadges', () => {
  it('returns nothing for a plain commit', () => {
    expect(nodeRefBadges(node({}))).toEqual([])
  })
  it('orders HEAD, then tags, then branches', () => {
    const b = nodeRefBadges(node({ isHead: true, tags: ['v1.0'], branches: ['main'] }))
    expect(b.map(x => x.type)).toEqual(['head', 'tag', 'local'])
    expect(b[0].text).toBe('HEAD')
  })
  it('caps with a +N overflow chip', () => {
    const b = nodeRefBadges(node({ branches: ['a', 'b', 'c', 'd', 'e'] }), 3)
    expect(b).toHaveLength(4)
    expect(b[3].text).toBe('+2')
  })
  it('classifies remote branches', () => {
    const b = nodeRefBadges(node({ branches: ['origin/main'] }))
    expect(b[0].type).toBe('remote')
  })
})

describe('stackVertically', () => {
  it('keeps non-overlapping items put', () => {
    expect(stackVertically([{ y: 0, height: 10 }, { y: 50, height: 10 }])).toEqual([0, 50])
  })
  it('pushes overlapping items down by gap', () => {
    const out = stackVertically([{ y: 0, height: 10 }, { y: 5, height: 10 }], 2)
    expect(out[0]).toBe(0)
    expect(out[1]).toBe(12) // 0 + 10 + gap
  })
  it('preserves input order in the returned array', () => {
    const out = stackVertically([{ y: 100, height: 10 }, { y: 0, height: 10 }], 2)
    expect(out[1]).toBe(0)
    expect(out[0]).toBe(100)
  })
})

describe('REF_COLORS', () => {
  it('has a distinct color per ref type', () => {
    const vals = Object.values(REF_COLORS)
    expect(new Set(vals).size).toBe(vals.length)
  })
})
