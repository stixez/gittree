import { GitRepository } from '../types/git'
import { computeGraphLayout, compactLanes } from '../utils/graphLayout'
import type { Scene, SceneNode, SceneEdge, SceneBounds } from './types'

const NODE_PITCH_X = 92 // lane spacing — roomy enough for ref labels + readability
const NODE_PITCH_Y = 56 // vertical spacing between commit levels

export function buildScene(repository: GitRepository): Scene {
  const layout = computeGraphLayout(repository)
  const positions = compactLanes(layout.positions)

  const branchesByOid = new Map<string, string[]>()
  repository.branches.forEach(b => {
    const list = branchesByOid.get(b.oid) ?? []
    list.push(b.name)
    branchesByOid.set(b.oid, list)
  })
  const tagsByOid = new Map<string, string[]>()
  repository.tags.forEach(t => {
    const list = tagsByOid.get(t.oid) ?? []
    list.push(t.name)
    tagsByOid.set(t.oid, list)
  })

  const pos = (oid: string) => {
    const p = positions.get(oid)
    if (!p) return { x: 0, y: 0, lane: 0 }
    return { x: p.lane * NODE_PITCH_X, y: (p.y / 50) * NODE_PITCH_Y, lane: p.lane }
  }

  const nodes: SceneNode[] = []
  const edges: SceneEdge[] = []
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity

  for (const commit of repository.commits) {
    const p = pos(commit.oid)
    const isMerge = commit.parents.length > 1
    const branches = branchesByOid.get(commit.oid) ?? []
    const tags = tagsByOid.get(commit.oid) ?? []
    const isHead = commit.oid === repository.head
    const significant = isMerge || tags.length > 0 || branches.length > 0

    nodes.push({
      oid: commit.oid,
      x: p.x, y: p.y, lane: p.lane,
      kind: isMerge ? 'merge' : 'commit',
      parentCount: commit.parents.length,
      isHead,
      hasBranch: branches.length > 0,
      hasTag: tags.length > 0,
      branch: branches[0], tag: tags[0],
      branches, tags,
      significant,
      message: commit.message,
      authorName: commit.author.name,
      authorEmail: commit.author.email,
      authorTs: commit.author.timestamp,
      parents: commit.parents,
    })

    minX = Math.min(minX, p.x); minY = Math.min(minY, p.y)
    maxX = Math.max(maxX, p.x); maxY = Math.max(maxY, p.y)

    commit.parents.forEach((parentOid, index) => {
      const pp = pos(parentOid)
      edges.push({
        fromOid: commit.oid, toOid: parentOid,
        fromX: p.x, fromY: p.y, toX: pp.x, toY: pp.y,
        lane: p.lane,
        sameLane: pp.lane === p.lane,
        isMerge: isMerge && index > 0,
      })
    })
  }

  if (!isFinite(minX)) { minX = minY = maxX = maxY = 0 }
  const bounds: SceneBounds = { minX, minY, maxX, maxY }

  return { nodes, edges, bounds, headOid: repository.head }
}
