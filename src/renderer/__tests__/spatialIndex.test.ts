import { describe, it, expect } from 'vitest'
import { SpatialIndex } from '../spatialIndex'
import type { SceneNode } from '../types'

const node = (oid: string, x: number, y: number): SceneNode => ({
  oid, x, y, lane: 0, kind: 'commit', parentCount: 1, isHead: false,
  hasBranch: false, hasTag: false, branches: [], tags: [], significant: false, message: '',
  authorName: '', authorTs: 0, parents: [],
})

describe('SpatialIndex', () => {
  const nodes = [node('a', 0, 0), node('b', 500, 500), node('c', 510, 510)]
  const idx = new SpatialIndex(nodes, 100)

  it('queryRect returns only nodes within the world rect', () => {
    const found = idx.queryRect({ minX: 400, minY: 400, maxX: 600, maxY: 600 }).map(n => n.oid).sort()
    expect(found).toEqual(['b', 'c'])
  })

  it('hitTest returns the nearest node within radius', () => {
    expect(idx.hitTest(2, 2, 10)).toBe('a')
  })

  it('hitTest returns null when nothing is within radius', () => {
    expect(idx.hitTest(250, 250, 10)).toBeNull()
  })
})
