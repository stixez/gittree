import { describe, it, expect } from 'vitest'
import { buildScene } from '../scene'
import type { GitRepository, GitCommit } from '../../types/git'

const commit = (oid: string, parents: string[], ts: number): GitCommit => ({
  oid, message: `msg ${oid}`,
  author: { name: 'A', email: 'a@x', timestamp: ts },
  committer: { name: 'A', email: 'a@x', timestamp: ts },
  parents,
})

// c3 (merge of c2,c1b) -> c2 -> c1 ; c1b -> c1
const repo: GitRepository = {
  commits: [
    commit('c3', ['c2', 'c1b'], 40),
    commit('c2', ['c1'], 30),
    commit('c1b', ['c1'], 25),
    commit('c1', [], 10),
  ],
  branches: [{ name: 'main', oid: 'c3' }, { name: 'feat', oid: 'c1b' }],
  tags: [{ name: 'v1', oid: 'c1' }],
  head: 'c3',
}

describe('buildScene', () => {
  const scene = buildScene(repo)

  it('creates one node per commit', () => {
    expect(scene.nodes.length).toBe(4)
  })

  it('marks merge commits', () => {
    const c3 = scene.nodes.find(n => n.oid === 'c3')!
    expect(c3.kind).toBe('merge')
    expect(c3.parentCount).toBe(2)
  })

  it('flags head, branch, and tag', () => {
    const c3 = scene.nodes.find(n => n.oid === 'c3')!
    const c1b = scene.nodes.find(n => n.oid === 'c1b')!
    const c1 = scene.nodes.find(n => n.oid === 'c1')!
    expect(c3.isHead).toBe(true)
    expect(c3.hasBranch).toBe(true)
    expect(c1b.branch).toBe('feat')
    expect(c1.hasTag).toBe(true)
    expect(c1.tag).toBe('v1')
  })

  it('significant = merge, tagged, or branch tip', () => {
    expect(scene.nodes.find(n => n.oid === 'c3')!.significant).toBe(true) // merge+branch
    expect(scene.nodes.find(n => n.oid === 'c1')!.significant).toBe(true) // tagged
    expect(scene.nodes.find(n => n.oid === 'c1b')!.significant).toBe(true) // branch tip
  })

  it('creates an edge per parent link with resolved coordinates', () => {
    expect(scene.edges.length).toBe(4) // c3->c2, c3->c1b, c2->c1, c1b->c1
    const e = scene.edges.find(e => e.fromOid === 'c3' && e.toOid === 'c1b')!
    expect(e.isMerge).toBe(true) // second parent of a merge
    expect(typeof e.fromX).toBe('number')
    expect(typeof e.toY).toBe('number')
  })

  it('computes bounds covering all nodes', () => {
    expect(scene.bounds.minX).toBeLessThanOrEqual(0)
    expect(scene.bounds.maxY).toBeGreaterThan(scene.bounds.minY)
  })

  it('carries the head oid', () => {
    expect(scene.headOid).toBe('c3')
  })
})

describe('buildScene — multiple refs per commit', () => {
  // c1 carries two branches + a tag; c2 is a plain tip.
  const multiRepo: GitRepository = {
    commits: [commit('c2', ['c1'], 20), commit('c1', [], 10)],
    branches: [
      { name: 'main', oid: 'c1' },
      { name: 'release', oid: 'c1' },
      { name: 'dev', oid: 'c2' },
    ],
    tags: [{ name: 'v1', oid: 'c1' }, { name: 'v1.0', oid: 'c1' }],
    head: 'c2',
  }
  const scene = buildScene(multiRepo)

  it('collects all branches and tags pointing at a commit', () => {
    const c1 = scene.nodes.find(n => n.oid === 'c1')!
    expect(c1.branches).toEqual(['main', 'release'])
    expect(c1.tags).toEqual(['v1', 'v1.0'])
    expect(c1.hasBranch).toBe(true)
    expect(c1.hasTag).toBe(true)
  })

  it('keeps the first branch/tag in the back-compat scalar fields', () => {
    const c1 = scene.nodes.find(n => n.oid === 'c1')!
    expect(c1.branch).toBe('main')
    expect(c1.tag).toBe('v1')
  })

  it('leaves ref arrays empty for commits with no refs of that kind', () => {
    const c2 = scene.nodes.find(n => n.oid === 'c2')!
    expect(c2.branches).toEqual(['dev'])
    expect(c2.tags).toEqual([])
  })
})
