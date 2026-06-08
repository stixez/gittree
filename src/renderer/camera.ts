import type { Camera, SceneBounds } from './types'

/**
 * World→screen. Caller draws with the canvas origin already translated to the
 * viewport center, so screen coords here are relative to that center.
 */
export function worldToScreen(cam: Camera, wx: number, wy: number) {
  return { sx: (wx - cam.x) * cam.zoom, sy: (wy - cam.y) * cam.zoom }
}

export function screenToWorld(cam: Camera, sx: number, sy: number) {
  return { wx: sx / cam.zoom + cam.x, wy: sy / cam.zoom + cam.y }
}

export const MIN_ZOOM = 0.05
export const MAX_ZOOM = 2

export function clampZoom(z: number): number {
  return Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, z))
}

/** Center bounds in a viewport, choosing a zoom that fits with padding. */
export function fitCamera(b: SceneBounds, viewW: number, viewH: number, padding = 60): Camera {
  const w = (b.maxX - b.minX) || 1
  const h = (b.maxY - b.minY) || 1
  const zoom = clampZoom(Math.min((viewW - padding * 2) / w, (viewH - padding * 2) / h))
  return { x: (b.minX + b.maxX) / 2, y: (b.minY + b.maxY) / 2, zoom }
}
