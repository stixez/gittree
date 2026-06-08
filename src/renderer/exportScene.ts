import type { Scene } from './types'
import { drawScene } from './draw'
import { laneColor, GOLD, BG_CENTER, nodeRadius } from './theme'
import { colorCtxFromNodes } from './colorModes'

const PAD = 60
const MAX_EXPORT = 4096

/**
 * Render the whole scene (no culling, no focus) to an offscreen canvas, fit
 * within a max pixel budget so even huge graphs export to a sane image size.
 */
export function renderSceneToCanvas(scene: Scene, scale = 1): HTMLCanvasElement {
  const b = scene.bounds
  const worldW = (b.maxX - b.minX) + PAD * 2
  const worldH = (b.maxY - b.minY) + PAD * 2
  const fitZoom = Math.min(MAX_EXPORT / worldW, MAX_EXPORT / worldH, 1.5) * scale
  const cw = Math.max(1, Math.ceil(worldW * fitZoom))
  const ch = Math.max(1, Math.ceil(worldH * fitZoom))

  const canvas = document.createElement('canvas')
  canvas.width = cw
  canvas.height = ch
  const ctx = canvas.getContext('2d')!
  drawScene(ctx, scene, scene.nodes, {
    cam: { x: (b.minX + b.maxX) / 2, y: (b.minY + b.maxY) / 2, zoom: fitZoom },
    width: cw, height: ch,
    focusedOid: null, pathOids: new Set(), hoveredOid: null, hoverPathOids: new Set(), highlightOids: null,
    colorMode: 'branch', colorCtx: colorCtxFromNodes(scene.nodes), timeBands: [],
  })
  return canvas
}

/** Build a standalone SVG string from the scene (vector nodes + edges). */
export function sceneToSVG(scene: Scene): string {
  const b = scene.bounds
  const minX = b.minX - PAD, minY = b.minY - PAD
  const w = (b.maxX - b.minX) + PAD * 2
  const h = (b.maxY - b.minY) + PAD * 2

  const parts: string[] = []
  parts.push(`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="${minX} ${minY} ${w} ${h}">`)
  parts.push(`<rect x="${minX}" y="${minY}" width="${w}" height="${h}" fill="${BG_CENTER}"/>`)

  for (const e of scene.edges) {
    const midY = (e.fromY + e.toY) / 2
    const color = e.sameLane ? laneColor(e.lane) : '#2b3445'
    const dash = e.isMerge ? ' stroke-dasharray="4,3"' : ''
    parts.push(`<path d="M${e.fromX},${e.fromY} C${e.fromX},${midY} ${e.toX},${midY} ${e.toX},${e.toY}" fill="none" stroke="${color}" stroke-width="1.5"${dash} opacity="0.8"/>`)
  }

  for (const n of scene.nodes) {
    const r = nodeRadius(n)
    const color = n.isHead ? GOLD : laneColor(n.lane)
    if (n.kind === 'merge') {
      parts.push(`<rect x="${n.x - r}" y="${n.y - r}" width="${r * 2}" height="${r * 2}" fill="${color}" transform="rotate(45 ${n.x} ${n.y})"/>`)
    } else {
      parts.push(`<circle cx="${n.x}" cy="${n.y}" r="${r}" fill="${color}"/>`)
    }
    if (n.hasTag) {
      parts.push(`<circle cx="${n.x}" cy="${n.y}" r="${r * 1.6}" fill="none" stroke="${GOLD}" stroke-width="1.2" stroke-dasharray="2,4"/>`)
    }
  }

  parts.push('</svg>')
  return parts.join('\n')
}
