import type { SceneNode } from './types'
import { laneColor } from './theme'

// Alternative ways to color commit nodes — the same graph as different lenses.

export type ColorMode = 'branch' | 'author' | 'recency'

export interface ColorCtx {
  minTs: number
  maxTs: number
}

/** Distinct hues for the author lens. */
export const AUTHOR_COLORS = [
  '#4fb6c4', '#d24b4b', '#6f9fd8', '#e0784a', '#5fbf9a',
  '#9484c8', '#e0bd6b', '#c45c8a', '#7bc043', '#d98e4a',
]

/** Stable string hash (FNV-1a-ish) for deterministic author→color mapping. */
export function hashString(s: string): number {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

export function authorColor(name: string): string {
  return AUTHOR_COLORS[hashString(name) % AUTHOR_COLORS.length]
}

function clamp01(n: number): number {
  return Math.min(1, Math.max(0, n))
}

/** Interpolate between two #rrggbb colors at t in [0,1]. */
export function hexLerp(a: string, b: string, t: number): string {
  const e = clamp01(t)
  const pa = [parseInt(a.slice(1, 3), 16), parseInt(a.slice(3, 5), 16), parseInt(a.slice(5, 7), 16)]
  const pb = [parseInt(b.slice(1, 3), 16), parseInt(b.slice(3, 5), 16), parseInt(b.slice(5, 7), 16)]
  const mix = pa.map((v, i) => Math.round(v + (pb[i] - v) * e))
  return '#' + mix.map(v => v.toString(16).padStart(2, '0')).join('')
}

const RECENCY_OLD = '#3a6ea5' // cold blue — oldest
const RECENCY_NEW = '#e0784a' // warm ember — newest

/** Color a node under the given mode. */
export function nodeColor(node: SceneNode, mode: ColorMode, ctx: ColorCtx): string {
  if (mode === 'author') return authorColor(node.authorName)
  if (mode === 'recency') {
    const span = ctx.maxTs - ctx.minTs
    const t = span > 0 ? (node.authorTs - ctx.minTs) / span : 1
    return hexLerp(RECENCY_OLD, RECENCY_NEW, t)
  }
  return laneColor(node.lane)
}

/** Min/max author timestamps across the scene (for the recency gradient). */
export function colorCtxFromNodes(nodes: { authorTs: number }[]): ColorCtx {
  let minTs = Infinity, maxTs = -Infinity
  for (const n of nodes) {
    if (n.authorTs < minTs) minTs = n.authorTs
    if (n.authorTs > maxTs) maxTs = n.authorTs
  }
  if (!isFinite(minTs)) { minTs = 0; maxTs = 0 }
  return { minTs, maxTs }
}
