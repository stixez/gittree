// Pure graph walks over the commit DAG, used for focus and hover highlighting.

type Adj = Map<string, string[]>

function walk(start: string, adj: Adj): Set<string> {
  const seen = new Set<string>()
  const queue = [start]
  while (queue.length) {
    const oid = queue.shift()!
    if (seen.has(oid)) continue
    seen.add(oid)
    const next = adj.get(oid)
    if (next) queue.push(...next)
  }
  return seen
}

/** All ancestors of `start` (inclusive), following parent links. */
export function ancestors(start: string, parentsOf: Adj): Set<string> {
  return walk(start, parentsOf)
}

/** All descendants of `start` (inclusive), following child links. */
export function descendants(start: string, childrenOf: Adj): Set<string> {
  return walk(start, childrenOf)
}

/** The full lineage through `start`: ancestors ∪ descendants (inclusive). */
export function connectedPath(start: string, parentsOf: Adj, childrenOf: Adj): Set<string> {
  const out = ancestors(start, parentsOf)
  for (const oid of descendants(start, childrenOf)) out.add(oid)
  return out
}
