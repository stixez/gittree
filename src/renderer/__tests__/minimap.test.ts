import { describe, it, expect } from 'vitest'
import { minimapTransform, viewportRectOnMinimap, minimapSize } from '../minimap'

describe('minimapSize', () => {
  it('makes a tall graph portrait (full height, narrow width)', () => {
    const s = minimapSize({ minX: 0, minY: 0, maxX: 100, maxY: 1000 }, 190, 300)
    expect(s.h).toBe(300)
    expect(s.w).toBeLessThan(s.h)
  })
  it('makes a wide graph landscape (full width, short height)', () => {
    const s = minimapSize({ minX: 0, minY: 0, maxX: 1000, maxY: 100 }, 190, 300)
    expect(s.w).toBe(190)
    expect(s.h).toBeLessThan(s.w)
  })
  it('fills both dimensions for a square graph', () => {
    const s = minimapSize({ minX: 0, minY: 0, maxX: 500, maxY: 500 }, 190, 300)
    expect(s.w).toBe(190)
    expect(s.h).toBe(190)
  })
  it('floors degenerate dimensions instead of collapsing', () => {
    const s = minimapSize({ minX: 0, minY: 0, maxX: 0, maxY: 1000 }, 190, 300, 60)
    expect(s.w).toBe(60)
    expect(s.h).toBe(300)
  })
})

describe('minimapTransform', () => {
  it('fits bounds (plus padding) into the minimap, preserving scale', () => {
    const t = minimapTransform({ minX: 0, minY: 0, maxX: 100, maxY: 100 }, 200, 150, 10)
    // gW = gH = 120; scale = min(200/120, 150/120) = 1.25
    expect(t.scale).toBeCloseTo(1.25)
    expect(t.ox).toBe(-10)
    expect(t.oy).toBe(-10)
  })
})

describe('viewportRectOnMinimap', () => {
  const t = minimapTransform({ minX: 0, minY: 0, maxX: 100, maxY: 100 }, 200, 150, 10)

  it('maps the real viewport (viewW/zoom) onto the minimap', () => {
    // viewport exactly covers the graph: 120 world units at zoom 1
    const r = viewportRectOnMinimap({ x: 50, y: 50, zoom: 1 }, 120, 120, t)
    expect(r.x).toBeCloseTo(0)
    expect(r.y).toBeCloseTo(0)
    expect(r.w).toBeCloseTo(150) // 120 * 1.25
    expect(r.h).toBeCloseTo(150)
  })

  it('shrinks the box as the user zooms in', () => {
    const zoomedOut = viewportRectOnMinimap({ x: 50, y: 50, zoom: 1 }, 120, 120, t)
    const zoomedIn = viewportRectOnMinimap({ x: 50, y: 50, zoom: 4 }, 120, 120, t)
    expect(zoomedIn.w).toBeLessThan(zoomedOut.w)
  })
})
