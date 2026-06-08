import type { Scene, SceneNode, SceneEdge, Camera } from './types'
import { worldToScreen } from './camera'
import { laneColor, GOLD, GOLD_BRIGHT, DIM, BG_CENTER, BG_EDGE, lodForZoom, nodeRadius } from './theme'
import { getGlowSprite } from './glowCache'
import { nodeRefBadges, REF_COLORS } from './refLabels'
import { nodeColor, type ColorMode, type ColorCtx } from './colorModes'
import type { TimeBand } from './timeAxis'

export const PREFERS_REDUCED_MOTION =
  typeof window !== 'undefined' && window.matchMedia
    ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
    : false

export interface DrawState {
  cam: Camera
  width: number
  height: number
  focusedOid: string | null
  /** ancestors ∪ descendants of the focused commit (gold lineage). */
  pathOids: ReadonlySet<string>
  hoveredOid: string | null
  /** lineage of the hovered commit — a lighter preview when nothing is focused. */
  hoverPathOids: ReadonlySet<string>
  /** Search matches. When non-null, non-matches dim and matches get a ring. */
  highlightOids: ReadonlySet<string> | null
  /** How node bodies are colored. */
  colorMode: ColorMode
  /** Timestamp range for the recency color mode. */
  colorCtx: ColorCtx
  /** Month markers along the time (Y) axis. */
  timeBands: TimeBand[]
}

/** True when a search highlight is active. */
function highlightActive(s: DrawState): boolean {
  return s.highlightOids !== null && s.highlightOids.size > 0
}

export function drawBackground(ctx: CanvasRenderingContext2D, s: DrawState) {
  const { width, height } = s
  const g = ctx.createRadialGradient(width / 2, height * 0.42, 0, width / 2, height / 2, Math.max(width, height) * 0.75)
  g.addColorStop(0, BG_CENTER)
  g.addColorStop(0.7, '#13090c') // warm transition — faint blood undertone
  g.addColorStop(1, BG_EDGE)
  ctx.fillStyle = g
  ctx.fillRect(0, 0, width, height)

  // faint static dust — deterministic, cheap (no per-frame randomness)
  ctx.save()
  ctx.fillStyle = 'rgba(127,212,239,0.05)'
  for (let i = 0; i < 60; i++) {
    const dx = ((i * 73) % width)
    const dy = ((i * 137) % height)
    ctx.fillRect(dx, dy, 1, 1)
  }
  ctx.restore()
}

function dimmed(oid: string, s: DrawState): boolean {
  // Search highlight takes priority: anything not matched is dimmed.
  if (highlightActive(s)) return !s.highlightOids!.has(oid)
  return s.focusedOid !== null && oid !== s.focusedOid && !s.pathOids.has(oid)
}

/** Hover preview is shown only when no focus and no search is active. */
function hoverPreviewActive(s: DrawState): boolean {
  return !highlightActive(s) && s.focusedOid === null && s.hoverPathOids.size > 0
}

export function drawEdges(ctx: CanvasRenderingContext2D, edges: SceneEdge[], s: DrawState) {
  ctx.save()
  ctx.translate(s.width / 2, s.height / 2)
  for (const e of edges) {
    const a = worldToScreen(s.cam, e.fromX, e.fromY)
    const b = worldToScreen(s.cam, e.toX, e.toY)
    const onPath = s.focusedOid !== null && s.pathOids.has(e.fromOid) && s.pathOids.has(e.toOid)
    const onHoverPath = hoverPreviewActive(s) && s.hoverPathOids.has(e.fromOid) && s.hoverPathOids.has(e.toOid)
    const isDim = dimmed(e.fromOid, s) || dimmed(e.toOid, s)

    ctx.beginPath()
    ctx.moveTo(a.sx, a.sy)
    // gentle vertical bezier
    const midY = (a.sy + b.sy) / 2
    ctx.bezierCurveTo(a.sx, midY, b.sx, midY, b.sx, b.sy)

    if (onPath) { ctx.strokeStyle = GOLD; ctx.lineWidth = 2.5; ctx.globalAlpha = 1 }
    else if (onHoverPath) { ctx.strokeStyle = '#c4cde0'; ctx.lineWidth = 2; ctx.globalAlpha = 0.95 }
    else if (e.sameLane) { ctx.strokeStyle = laneColor(e.lane); ctx.lineWidth = 1.8; ctx.globalAlpha = isDim ? 0.08 : 0.85 }
    else { ctx.strokeStyle = DIM; ctx.lineWidth = 1.2; ctx.globalAlpha = isDim ? 0.06 : 0.7 }
    if (e.isMerge) ctx.setLineDash([4, 3]); else ctx.setLineDash([])
    ctx.stroke()
  }
  ctx.globalAlpha = 1
  ctx.setLineDash([])
  ctx.restore()
}

export function drawNodes(ctx: CanvasRenderingContext2D, nodes: SceneNode[], s: DrawState) {
  const lod = lodForZoom(s.cam.zoom)
  ctx.save()
  ctx.translate(s.width / 2, s.height / 2)
  for (const n of nodes) {
    const p = worldToScreen(s.cam, n.x, n.y)
    const isDim = dimmed(n.oid, s)
    const isFocused = n.oid === s.focusedOid
    const r = nodeRadius(n) * s.cam.zoom
    // HEAD stays gold in branch mode; other modes color it by the lens (the
    // bright ring still marks it).
    const color = (n.isHead && s.colorMode === 'branch') ? GOLD : nodeColor(n, s.colorMode, s.colorCtx)
    const alpha = isDim ? 0.12 : 1

    ctx.globalAlpha = alpha

    // glow (skip at LOD 0 for cheapest far view, except focused/head)
    if ((lod > 0 || isFocused || n.isHead) && !isDim) {
      const sprite = getGlowSprite(color, Math.max(r, 4))
      ctx.drawImage(sprite, p.sx - sprite.width / 2, p.sy - sprite.height / 2)
    }

    // body
    if (n.kind === 'merge') {
      // ornate diamond + ring
      ctx.save()
      ctx.translate(p.sx, p.sy)
      ctx.rotate(Math.PI / 4)
      ctx.fillStyle = color
      ctx.fillRect(-r, -r, r * 2, r * 2)
      ctx.restore()
      if (lod > 0) {
        ctx.beginPath(); ctx.arc(p.sx, p.sy, r * 1.8, 0, Math.PI * 2)
        ctx.strokeStyle = color; ctx.lineWidth = 1; ctx.globalAlpha = alpha * 0.6; ctx.stroke()
        ctx.globalAlpha = alpha
      }
    } else {
      ctx.beginPath(); ctx.arc(p.sx, p.sy, r, 0, Math.PI * 2)
      ctx.fillStyle = color; ctx.fill()
    }

    // tag: dashed ornate ring
    if (n.hasTag && lod > 0) {
      ctx.beginPath(); ctx.arc(p.sx, p.sy, r * 1.6, 0, Math.PI * 2)
      ctx.strokeStyle = GOLD; ctx.lineWidth = 1.2; ctx.setLineDash([2, 4]); ctx.stroke(); ctx.setLineDash([])
    }

    // head: bright ring
    if (n.isHead) {
      ctx.beginPath(); ctx.arc(p.sx, p.sy, r * 1.7, 0, Math.PI * 2)
      ctx.strokeStyle = GOLD_BRIGHT; ctx.lineWidth = 2; ctx.stroke()
    }

    // focused outline
    if (isFocused) {
      ctx.beginPath(); ctx.arc(p.sx, p.sy, r * 1.9, 0, Math.PI * 2)
      ctx.strokeStyle = GOLD_BRIGHT; ctx.lineWidth = 1.5; ctx.stroke()
    }

    // search match ring
    if (highlightActive(s) && !isDim) {
      ctx.beginPath(); ctx.arc(p.sx, p.sy, r * 1.9, 0, Math.PI * 2)
      ctx.strokeStyle = '#f0d089'; ctx.lineWidth = 2; ctx.globalAlpha = 1; ctx.stroke()
      ctx.globalAlpha = alpha
    }

    // ref badges (branch tips, tags, HEAD) — readable from LOD 1
    let labelX = p.sx + r + 6
    if (lod > 0 && !isDim) {
      labelX = drawRefBadges(ctx, n, p.sx + r + 6, p.sy)
    }

    // commit hash + message label at full detail, after any badges
    if (lod === 2 && !isDim) {
      ctx.globalAlpha = alpha
      ctx.fillStyle = '#c4cde0'
      ctx.font = '11px ui-monospace, monospace'
      ctx.textBaseline = 'middle'
      const label = `${n.oid.slice(0, 7)}  ${n.message.split('\n')[0].slice(0, 32)}`
      ctx.fillText(label, labelX, p.sy)
    }
  }
  ctx.globalAlpha = 1
  ctx.restore()
}

const BADGE_H = 15
const BADGE_PAD = 5
const BADGE_GAP = 4

/**
 * Draw a commit's ref badges as small pills stacked to the right, vertically
 * centered on the node. Returns the x at which following labels should start.
 */
function drawRefBadges(ctx: CanvasRenderingContext2D, n: SceneNode, x: number, y: number): number {
  const badges = nodeRefBadges(n)
  if (badges.length === 0) return x

  ctx.save()
  ctx.font = '10px "Fira Sans", ui-sans-serif, sans-serif'
  ctx.textBaseline = 'middle'
  ctx.globalAlpha = 1

  const widths = badges.map(b => Math.ceil(ctx.measureText(b.text).width) + BADGE_PAD * 2)
  const maxW = Math.max(...widths)
  const totalH = badges.length * BADGE_H + (badges.length - 1) * BADGE_GAP
  let by = y - totalH / 2

  badges.forEach((b, i) => {
    const w = widths[i]
    const color = REF_COLORS[b.type]
    // pill
    ctx.beginPath()
    roundRect(ctx, x, by, w, BADGE_H, 4)
    ctx.fillStyle = color + '2e' // translucent fill
    ctx.fill()
    ctx.strokeStyle = color
    ctx.lineWidth = 1
    ctx.stroke()
    // text
    ctx.fillStyle = '#f1f5f9'
    ctx.fillText(b.text, x + BADGE_PAD, by + BADGE_H / 2)
    by += BADGE_H + BADGE_GAP
  })

  ctx.restore()
  return x + maxW + 8
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + w, y, x + w, y + h, r)
  ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r)
  ctx.arcTo(x, y, x + w, y, r)
}

/** Faint horizontal month markers with labels; Y roughly tracks time. */
export function drawTimeAxis(ctx: CanvasRenderingContext2D, s: DrawState) {
  if (!s.timeBands.length) return
  ctx.save()
  ctx.font = '10px "Fira Sans", ui-sans-serif, sans-serif'
  ctx.textBaseline = 'middle'
  for (const band of s.timeBands) {
    const sy = s.height / 2 + (band.y - s.cam.y) * s.cam.zoom
    if (sy < 0 || sy > s.height) continue
    ctx.strokeStyle = 'rgba(196,205,224,0.06)'
    ctx.lineWidth = 1
    ctx.beginPath(); ctx.moveTo(0, sy); ctx.lineTo(s.width, sy); ctx.stroke()
    ctx.fillStyle = 'rgba(148,163,184,0.55)'
    ctx.fillText(band.label, 8, sy - 8)
  }
  ctx.restore()
}

/** Convenience: full scene draw in correct order. */
export function drawScene(ctx: CanvasRenderingContext2D, scene: Scene, visibleNodes: SceneNode[], s: DrawState) {
  drawBackground(ctx, s)
  drawTimeAxis(ctx, s)
  drawEdges(ctx, scene.edges, s)
  drawNodes(ctx, visibleNodes, s)
}
