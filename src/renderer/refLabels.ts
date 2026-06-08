import type { SceneNode } from './types'
import { GOLD } from './theme'

// Ref badges drawn next to commits that are branch tips, tags, or HEAD.

export type RefType = 'head' | 'local' | 'remote' | 'tag'

export interface RefBadge {
  text: string
  type: RefType
}

/** Colors per ref type (kept here so draw + tests share one source). */
export const REF_COLORS: Record<RefType, string> = {
  head: GOLD, // antique gold — HEAD
  local: '#d24b4b', // blood red — local branch
  remote: '#6f9fd8', // steel blue — remote branch
  tag: '#4fb6c4', // teal — tag
}

const REMOTE_PREFIX = /^(origin|upstream|remotes)\//i

/** A branch name is treated as remote if it carries a known remote prefix. */
export function classifyBranch(name: string): 'local' | 'remote' {
  return REMOTE_PREFIX.test(name) ? 'remote' : 'local'
}

/** Truncate a ref name to maxLen, with an ellipsis when shortened. */
export function truncateRef(name: string, maxLen = 22): string {
  if (name.length <= maxLen) return name
  return name.slice(0, maxLen - 1) + '…'
}

/**
 * Build the badge list for a node: HEAD first, then tags, then branches,
 * capped at maxBadges with a "+N" overflow chip. Returns [] for nodes with
 * no refs.
 */
export function nodeRefBadges(node: SceneNode, maxBadges = 3): RefBadge[] {
  const badges: RefBadge[] = []
  if (node.isHead) badges.push({ text: 'HEAD', type: 'head' })
  for (const t of node.tags) badges.push({ text: truncateRef(t), type: 'tag' })
  for (const b of node.branches) badges.push({ text: truncateRef(b), type: classifyBranch(b) })

  if (badges.length <= maxBadges) return badges
  const kept = badges.slice(0, maxBadges)
  kept.push({ text: `+${badges.length - maxBadges}`, type: 'local' })
  return kept
}

/**
 * Greedy vertical de-overlap: given items sorted by their preferred y, push
 * each down just enough to clear the previous one. Pure + testable; draw uses
 * it to stack nearby badges. Returns adjusted y per item (input order).
 */
export function stackVertically(items: { y: number; height: number }[], gap = 2): number[] {
  const ordered = items
    .map((it, i) => ({ ...it, i }))
    .sort((a, b) => a.y - b.y)
  const out = new Array<number>(items.length)
  let prevBottom = -Infinity
  for (const it of ordered) {
    const y = Math.max(it.y, prevBottom + gap)
    out[it.i] = y
    prevBottom = y + it.height
  }
  return out
}
