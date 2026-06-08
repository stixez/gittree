import { describe, it, expect } from 'vitest'
import { worldToScreen, screenToWorld, fitCamera } from '../camera'
import type { Camera } from '../types'

const cam: Camera = { x: 100, y: 50, zoom: 2 }

describe('camera transforms', () => {
  it('worldToScreen applies translate then scale', () => {
    // screen = (world - camera) * zoom, with viewport center offset handled by caller
    expect(worldToScreen(cam, 150, 50)).toEqual({ sx: 100, sy: 0 })
  })

  it('screenToWorld is the inverse of worldToScreen', () => {
    const s = worldToScreen(cam, 123, 456)
    const w = screenToWorld(cam, s.sx, s.sy)
    expect(w.wx).toBeCloseTo(123)
    expect(w.wy).toBeCloseTo(456)
  })

  it('fitCamera centers bounds within the viewport', () => {
    const c = fitCamera({ minX: 0, minY: 0, maxX: 100, maxY: 100 }, 400, 400, 40)
    // zoom chosen so 100+padding fits in 400px
    expect(c.zoom).toBeGreaterThan(0)
    expect(c.zoom).toBeLessThanOrEqual(2)
    // camera centered on bounds center (50,50)
    expect(c.x).toBeCloseTo(50)
    expect(c.y).toBeCloseTo(50)
  })
})
