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
 * Produce one band per distinct (year, month), positioned at the first node
 * (scanning by increasing y) whose author timestamp falls in that month.
 * Deterministic and pure; bands come back sorted by y.
 */
export function computeTimeBands(nodes: { y: number; authorTs: number }[]): TimeBand[] {
  const sorted = [...nodes].sort((a, b) => a.y - b.y)
  const seen = new Set<string>()
  const bands: TimeBand[] = []
  for (const n of sorted) {
    const label = monthLabel(n.authorTs)
    if (seen.has(label)) continue
    seen.add(label)
    bands.push({ y: n.y, label })
  }
  return bands
}
