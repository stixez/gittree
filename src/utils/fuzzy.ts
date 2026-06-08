/**
 * Subsequence fuzzy match. Returns a score (higher = better) when every char of
 * `query` appears in `text` in order, or null when it doesn't. Consecutive
 * matches score higher. Case-insensitive. Empty query => neutral score 0.
 */
export function fuzzyMatch(query: string, text: string): number | null {
  if (!query) return 0
  const q = query.toLowerCase()
  const t = text.toLowerCase()
  let qi = 0
  let score = 0
  let prev = -2
  for (let ti = 0; ti < t.length && qi < q.length; ti++) {
    if (t[ti] === q[qi]) {
      score += ti === prev + 1 ? 2 : 1
      prev = ti
      qi++
    }
  }
  return qi === q.length ? score : null
}

/**
 * Rank `items` by fuzzy match against `getText(item)`. Empty query returns the
 * first `limit` items unchanged; otherwise non-matches are dropped and the rest
 * sorted best-first. Stable for equal scores (preserves input order).
 */
export function rankItems<T>(
  query: string,
  items: T[],
  getText: (item: T) => string,
  limit = 50,
): T[] {
  if (!query) return items.slice(0, limit)
  const scored: { item: T; score: number; idx: number }[] = []
  items.forEach((item, idx) => {
    const s = fuzzyMatch(query, getText(item))
    if (s !== null) scored.push({ item, score: s, idx })
  })
  scored.sort((a, b) => b.score - a.score || a.idx - b.idx)
  return scored.slice(0, limit).map((s) => s.item)
}
