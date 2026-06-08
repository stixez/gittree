export interface TreeEntry {
  path: string
  oid: string
  type: 'blob' | 'tree' | 'commit'
}

/** Normalize a path string into clean segments (drops leading/trailing/empty). */
export function splitPath(path: string): string[] {
  return path.split('/').map((s) => s.trim()).filter(Boolean)
}

/**
 * Resolve the oid of the entry (blob or tree) at `segments` within the tree
 * `rootTreeOid`. Returns the entry's oid, or undefined if the path doesn't
 * exist (including when a non-final segment isn't a directory).
 * `readTree(oid)` returns that tree's direct entries.
 */
export async function resolvePathOid(
  readTree: (oid: string) => Promise<TreeEntry[]>,
  rootTreeOid: string,
  segments: string[],
): Promise<string | undefined> {
  let currentTree = rootTreeOid
  for (let i = 0; i < segments.length; i++) {
    const entries = await readTree(currentTree)
    const entry = entries.find((e) => e.path === segments[i])
    if (!entry) return undefined
    if (i === segments.length - 1) return entry.oid
    if (entry.type !== 'tree') return undefined
    currentTree = entry.oid
  }
  return undefined
}
