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

export interface Contributor {
  /** Display email (first-seen casing) for the grouped author. */
  email: string
  /** Spelling of the name used on the most commits for this email. */
  name: string
  commits: number
  firstCommit: number
  lastCommit: number
}

/**
 * Group commits into contributors keyed by author email (case-insensitive), so
 * one person committing under varied name spellings (or differing email case)
 * collapses into a single entry. The display `name` is the spelling used on the
 * most commits, with ties broken alphabetically for determinism.
 *
 * Both ContributorStats and RepositoryHealth use this so the "top contributor"
 * and the ranked list always agree. Returned sorted by commit count descending.
 */
export function aggregateContributors(commits: GitCommit[]): Contributor[] {
  interface Accumulator {
    email: string
    commits: number
    firstCommit: number
    lastCommit: number
    nameCounts: Map<string, number>
  }

  const byEmail = new Map<string, Accumulator>()
  for (const commit of commits) {
    const { name, email, timestamp } = commit.author
    const key = email.trim().toLowerCase()

    let acc = byEmail.get(key)
    if (!acc) {
      acc = { email, commits: 0, firstCommit: timestamp, lastCommit: timestamp, nameCounts: new Map() }
      byEmail.set(key, acc)
    }

    acc.commits++
    acc.firstCommit = Math.min(acc.firstCommit, timestamp)
    acc.lastCommit = Math.max(acc.lastCommit, timestamp)
    acc.nameCounts.set(name, (acc.nameCounts.get(name) ?? 0) + 1)
  }

  return Array.from(byEmail.values())
    .map((acc) => ({
      email: acc.email,
      name: mostUsedName(acc.nameCounts),
      commits: acc.commits,
      firstCommit: acc.firstCommit,
      lastCommit: acc.lastCommit,
    }))
    .sort((a, b) => b.commits - a.commits)
}

/** Name with the highest commit count; ties broken alphabetically. */
function mostUsedName(nameCounts: Map<string, number>): string {
  let best = ''
  let bestCount = -1
  for (const [name, count] of nameCounts) {
    if (count > bestCount || (count === bestCount && name.localeCompare(best, 'en') < 0)) {
      best = name
      bestCount = count
    }
  }
  return best
}
