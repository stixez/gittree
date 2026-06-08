import type { GitCommit } from '../types/git'

/** Distinct author names across the commits, sorted case-insensitively. */
export function uniqueAuthors(commits: GitCommit[]): string[] {
  const set = new Set<string>()
  for (const c of commits) {
    const name = c.author.name.trim()
    if (name) set.add(name)
  }
  return Array.from(set).sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }))
}
