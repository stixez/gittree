// Faint horizontal month markers along the vertical (time) axis. Y encodes
// topological order, which roughly follows time, so we mark the y at which the
// author month first changes as we scan downward (older).

export interface TimeBand {
  y: number
  label: string
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

/** "Jun 2026" from a unix-seconds timestamp (UTC, for determinism). */
export function monthLabel(ts: number): string {
  const d = new Date(ts * 1000)
  return `${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`
}

/**
 * Produce month bands down the time axis (larger y = older). Because y is
 * topological order — only *roughly* chronological — a newer-month commit can
 * appear below an older one around merges. We emit a band only when a node is
 * not-newer than the last emitted band, which keeps the markers in
 * chronological order down the axis instead of zig-zagging (e.g. Jun→Apr→May).
 * Deterministic and pure; bands come back sorted by y.
 */
export function computeTimeBands(nodes: { y: number; authorTs: number }[]): TimeBand[] {
  const sorted = [...nodes].sort((a, b) => a.y - b.y)
  const seen = new Set<string>()
  const bands: TimeBand[] = []
  let lastTs = Infinity // author ts of the last emitted band
  for (const n of sorted) {
    if (n.authorTs > lastTs) continue // newer than the band above → out of order, skip
    const label = monthLabel(n.authorTs)
    if (seen.has(label)) continue
    seen.add(label)
    bands.push({ y: n.y, label })
    lastTs = n.authorTs
  }
  return bands
}
