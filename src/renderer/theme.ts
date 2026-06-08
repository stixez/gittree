import type { SceneNode } from './types'

// ── Dark-fantasy palette ──────────────────────────────────────────────────
// Obsidian blue-black ground, pale antique gold for the highlighted path,
// bone-white highlights, cool jewel-tone lanes.
export const GOLD = '#e0bd6b'        // antique gold — highlighted path
export const GOLD_BRIGHT = '#f6edd6' // bone white — HEAD / focus rings
export const BG_CENTER = '#0b111a'   // deep cold obsidian
export const BG_EDGE = '#0c0507'     // warm near-black — faint blood-red undertone
export const DIM = '#33272b'         // muted warm steel for off-path edges
export const CRIMSON = '#d24b4b'     // blood red — accent

/**
 * Lane 0 = gold (the highlighted ancestry path). Remaining hues are jewel
 * tones with crimson/ember reds woven in for a darker, bloodier feel.
 */
export const LANE_COLORS = [
  GOLD,      // gold — highlighted path
  '#4fb6c4', // teal
  CRIMSON,   // crimson — blood red
  '#6f9fd8', // steel blue
  '#e0784a', // ember orange-red
  '#5fbf9a', // jade
  '#9484c8', // muted violet
  '#a93226', // deep garnet
]

/** Level of detail from zoom. 0 = dot, 1 = orb, 2 = full + label. */
export function lodForZoom(zoom: number): 0 | 1 | 2 {
  if (zoom < 0.3) return 0
  if (zoom < 0.6) return 1
  return 2
}

const BASE_R = 6
const SIGNIFICANT_R = 9
const MERGE_BASE_R = 8

/** World-space radius of a node by its structural significance. */
export function nodeRadius(node: SceneNode): number {
  if (node.kind === 'merge') {
    return MERGE_BASE_R + Math.min(node.parentCount, 5)
  }
  if (node.significant) return SIGNIFICANT_R
  return BASE_R
}

export function laneColor(lane: number): string {
  return LANE_COLORS[lane % LANE_COLORS.length]
}
