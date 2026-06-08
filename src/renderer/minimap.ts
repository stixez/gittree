import type { Camera, SceneBounds } from './types'

export interface MinimapTransform {
  scale: number
  ox: number
  oy: number
}

/**
 * Size the minimap canvas to the graph's aspect ratio within a max box, so a
 * tall commit graph gets a tall minimap (no empty side margins) and a wide one
 * gets a wide minimap. Floored so it never collapses to a sliver.
 */
export function minimapSize(b: SceneBounds, maxW: number, maxH: number, floor = 60): { w: number; h: number } {
  const gW = Math.max(1, b.maxX - b.minX)
  const gH = Math.max(1, b.maxY - b.minY)
  const scale = Math.min(maxW / gW, maxH / gH)
  return {
    w: Math.max(floor, Math.min(maxW, Math.round(gW * scale))),
    h: Math.max(floor, Math.min(maxH, Math.round(gH * scale))),
  }
}

/** Fit scene bounds (plus padding) into the minimap rectangle. */
export function minimapTransform(b: SceneBounds, mapW: number, mapH: number, pad: number): MinimapTransform {
  const gW = (b.maxX - b.minX) + pad * 2 || 1
  const gH = (b.maxY - b.minY) + pad * 2 || 1
  return {
    scale: Math.min(mapW / gW, mapH / gH),
    ox: b.minX - pad,
    oy: b.minY - pad,
  }
}

/** Map a world point onto the minimap. */
export function worldToMinimap(t: MinimapTransform, x: number, y: number) {
  return { x: (x - t.ox) * t.scale, y: (y - t.oy) * t.scale }
}

/** Map a minimap point back to world coordinates. */
export function minimapToWorld(t: MinimapTransform, mx: number, my: number) {
  return { x: mx / t.scale + t.ox, y: my / t.scale + t.oy }
}

/**
 * The current viewport, projected onto the minimap. Uses the REAL viewport
 * size (CSS px) so the box reflects exactly what's on screen at this zoom.
 */
export function viewportRectOnMinimap(cam: Camera, viewW: number, viewH: number, t: MinimapTransform) {
  const worldW = viewW / cam.zoom
  const worldH = viewH / cam.zoom
  const p = worldToMinimap(t, cam.x - worldW / 2, cam.y - worldH / 2)
  return { x: p.x, y: p.y, w: worldW * t.scale, h: worldH * t.scale }
}
