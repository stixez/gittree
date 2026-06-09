import { describe, it, expect } from 'vitest'
import { computeGraphLayout } from './graphLayout'
import type { GitCommit, GitRepository } from '../types/git'

const commit = (oid: string, parents: string[], ts: number): GitCommit => ({
  oid, message: oid, parents,
  author: { name: 'a', email: 'a@x.com', timestamp: ts },
  committer: { name: 'a', email: 'a@x.com', timestamp: ts },
})

const repo = (commits: GitCommit[], head: string): GitRepository => ({
  commits, branches: [{ name: 'main', oid: head }], tags: [], head,
})

describe('computeGraphLayout', () => {
  it('positions every commit', () => {
    const { positions } = computeGraphLayout(repo([
      commit('b', ['a'], 2),
      commit('a', [], 1),
    ], 'b'))
    expect(positions.size).toBe(2)
  })

  it('keeps a shared first parent in the mainline lane, not the side branch', () => {
    // Diamond: M merges B (first parent, mainline) and C (side); both B and C
    // have A as their first parent. A must stay in B/M's lane rather than being
    // yanked into C's side lane by a last-writer-wins overwrite.
    const { positions } = computeGraphLayout(repo([
      commit('m', ['b', 'c'], 4),
      commit('b', ['a'], 3),
      commit('c', ['a'], 2),
      commit('a', [], 1),
    ], 'm'))

    const lane = (oid: string) => positions.get(oid)!.lane
    expect(lane('a')).toBe(lane('b'))
    expect(lane('b')).toBe(lane('m'))
    expect(lane('a')).not.toBe(lane('c'))
  })
})
