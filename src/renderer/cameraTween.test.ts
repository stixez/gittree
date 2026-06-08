import { describe, it, expect } from 'vitest'
import { easeOutCubic, lerpCamera, stepTween } from './cameraTween'

describe('easeOutCubic', () => {
  it('pins endpoints and clamps out-of-range input', () => {
    expect(easeOutCubic(0)).toBe(0)
    expect(easeOutCubic(1)).toBe(1)
    expect(easeOutCubic(-1)).toBe(0)
    expect(easeOutCubic(2)).toBe(1)
  })
  it('eases out (past halfway by t=0.5)', () => {
    expect(easeOutCubic(0.5)).toBeGreaterThan(0.5)
  })
})

describe('lerpCamera', () => {
  const a = { x: 0, y: 0, zoom: 1 }
  const b = { x: 100, y: 200, zoom: 2 }
  it('returns from at t=0 and to at t=1', () => {
    expect(lerpCamera(a, b, 0)).toEqual(a)
    expect(lerpCamera(a, b, 1)).toEqual(b)
  })
  it('interpolates all three fields', () => {
    const m = lerpCamera(a, b, 0.5)
    expect(m.x).toBeGreaterThan(0)
    expect(m.x).toBeLessThan(100)
    expect(m.zoom).toBeGreaterThan(1)
  })
})

describe('stepTween', () => {
  const tween = { from: { x: 0, y: 0, zoom: 1 }, to: { x: 100, y: 0, zoom: 1 }, start: 1000, duration: 300 }
  it('is done and snaps to target at/after end', () => {
    const r = stepTween(tween, 1300)
    expect(r.done).toBe(true)
    expect(r.cam).toEqual(tween.to)
  })
  it('is in-progress before end', () => {
    const r = stepTween(tween, 1150)
    expect(r.done).toBe(false)
    expect(r.cam.x).toBeGreaterThan(0)
    expect(r.cam.x).toBeLessThan(100)
  })
})
