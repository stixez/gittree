import type { GitBranch, GitTag, GitCommit } from '../types/git'

export type PaletteItem =
  | { kind: 'branch' | 'tag' | 'commit'; id: string; label: string; sublabel?: string; oid: string }
  | { kind: 'action'; id: string; label: string; run: () => void }

export function buildRefItems(branches: GitBranch[], tags: GitTag[]): PaletteItem[] {
  return [
    ...branches.map((b): PaletteItem => ({ kind: 'branch', id: `branch:${b.name}`, label: b.name, oid: b.oid })),
    ...tags.map((t): PaletteItem => ({ kind: 'tag', id: `tag:${t.name}`, label: t.name, oid: t.oid })),
  ]
}

export function buildCommitItems(commits: GitCommit[]): PaletteItem[] {
  return commits.map((c): PaletteItem => ({
    kind: 'commit',
    id: `commit:${c.oid}`,
    label: c.message.split('\n')[0],
    sublabel: c.oid.substring(0, 7),
    oid: c.oid,
  }))
}

export interface PaletteHandlers {
  openRepo: () => void
  clearFilters: () => void
  copyShareLink: () => void
  openExport: () => void
  openCompare: () => void
  openStats: () => void
  openHeatmap: () => void
  openHealth: () => void
  openSettings: () => void
  openKeyboardHelp: () => void
}

/** Build the action list, omitting actions that don't apply in the current state. */
export function buildActions(
  h: PaletteHandlers,
  ctx: { hasRepo: boolean; branchCount: number },
): PaletteItem[] {
  const items: PaletteItem[] = []
  const add = (id: keyof PaletteHandlers, label: string) =>
    items.push({ kind: 'action', id: `action:${id}`, label, run: h[id] })

  add('openRepo', 'Open repository')
  if (ctx.hasRepo) {
    add('clearFilters', 'Clear filters')
    add('copyShareLink', 'Copy share link')
    add('openExport', 'Export visualization')
    if (ctx.branchCount >= 2) add('openCompare', 'Compare branches')
    add('openStats', 'Contributor statistics')
    add('openHeatmap', 'Commit activity heatmap')
    add('openHealth', 'Repository health')
  }
  add('openSettings', 'Settings')
  add('openKeyboardHelp', 'Keyboard shortcuts')
  return items
}
