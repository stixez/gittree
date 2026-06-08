// Dependency-free line diff for the unified diff viewer.

export interface DiffRow {
  type: 'add' | 'del' | 'context'
  text: string
  oldNo?: number
  newNo?: number
}

/** A collapsed run of unchanged lines, rendered as a separator. */
export interface SepRow {
  type: 'sep'
  count: number
}

export type DiffDisplayRow = DiffRow | SepRow

// Above this, an LCS table would get too big; fall back to a plain replace.
const MAX_LCS_CELLS = 4_000_000

function splitLines(text: string): string[] {
  if (text.length === 0) return []
  // Normalize CRLF so line-ending style alone doesn't read as a change.
  return text.replace(/\r\n/g, '\n').replace(/\n$/, '').split('\n')
}

/** Assign old/new line numbers in file order. */
function number(rows: Array<{ type: DiffRow['type']; text: string }>): DiffRow[] {
  let oldLine = 1
  let newLine = 1
  return rows.map((r) => {
    if (r.type === 'context') return { ...r, oldNo: oldLine++, newNo: newLine++ }
    if (r.type === 'del') return { ...r, oldNo: oldLine++ }
    return { ...r, newNo: newLine++ }
  })
}

/** Unified line diff between two texts. */
export function diffLines(oldText: string, newText: string): DiffRow[] {
  const o = splitLines(oldText)
  const n = splitLines(newText)

  // Trim common prefix.
  let start = 0
  while (start < o.length && start < n.length && o[start] === n[start]) start++

  // Trim common suffix.
  let endO = o.length
  let endN = n.length
  while (endO > start && endN > start && o[endO - 1] === n[endN - 1]) { endO--; endN-- }

  const midO = o.slice(start, endO)
  const midN = n.slice(start, endN)

  const rows: Array<{ type: DiffRow['type']; text: string }> = []
  for (let i = 0; i < start; i++) rows.push({ type: 'context', text: o[i] })

  if (midO.length * midN.length > MAX_LCS_CELLS) {
    // Too large to align — show the middle as a full replace.
    for (const t of midO) rows.push({ type: 'del', text: t })
    for (const t of midN) rows.push({ type: 'add', text: t })
  } else {
    // LCS table over the middle segments.
    const a = midO, b = midN
    const dp: number[][] = Array.from({ length: a.length + 1 }, () => new Array(b.length + 1).fill(0))
    for (let i = a.length - 1; i >= 0; i--) {
      for (let j = b.length - 1; j >= 0; j--) {
        dp[i][j] = a[i] === b[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1])
      }
    }
    let i = 0, j = 0
    while (i < a.length && j < b.length) {
      if (a[i] === b[j]) { rows.push({ type: 'context', text: a[i] }); i++; j++ }
      else if (dp[i + 1][j] >= dp[i][j + 1]) { rows.push({ type: 'del', text: a[i] }); i++ }
      else { rows.push({ type: 'add', text: b[j] }); j++ }
    }
    while (i < a.length) { rows.push({ type: 'del', text: a[i] }); i++ }
    while (j < b.length) { rows.push({ type: 'add', text: b[j] }); j++ }
  }

  for (let i = endO; i < o.length; i++) rows.push({ type: 'context', text: o[i] })

  return number(rows)
}

/**
 * Fold unchanged runs longer than 2*padding into a separator, keeping `padding`
 * context lines on each side of a change.
 */
export function collapseContext(rows: DiffRow[], padding = 3): DiffDisplayRow[] {
  const out: DiffDisplayRow[] = []
  let i = 0
  while (i < rows.length) {
    if (rows[i].type !== 'context') { out.push(rows[i]); i++; continue }
    // Gather a run of context rows.
    let j = i
    while (j < rows.length && rows[j].type === 'context') j++
    const run = rows.slice(i, j)
    const atStart = i === 0
    const atEnd = j === rows.length
    const keepHead = atStart ? 0 : padding
    const keepTail = atEnd ? 0 : padding
    if (run.length > keepHead + keepTail + 1) {
      for (let k = 0; k < keepHead; k++) out.push(run[k])
      out.push({ type: 'sep', count: run.length - keepHead - keepTail })
      for (let k = run.length - keepTail; k < run.length; k++) out.push(run[k])
    } else {
      out.push(...run)
    }
    i = j
  }
  return out
}
