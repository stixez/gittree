import { GitRepository } from '../types/git'

/** Shape category drives base geometry. */
export type NodeKind = 'commit' | 'merge'

export interface SceneNode {
  oid: string
  x: number
  y: number
  lane: number
  kind: NodeKind
  /** parents.length; merges with more parents get a larger frame */
  parentCount: number
  isHead: boolean
  hasBranch: boolean
  hasTag: boolean
  /** first branch / tag pointing here (back-compat convenience) */
  branch?: string
  tag?: string
  /** all branches / tags pointing at this commit */
  branches: string[]
  tags: string[]
  /** structurally significant (merge, tagged, or branch tip) → larger orb */
  significant: boolean
  message: string
  authorName: string
  /** Lowercased-on-use identity key for the author lens; matches contributor grouping. */
  authorEmail: string
  authorTs: number
  parents: string[]
}

export interface SceneEdge {
  fromOid: string
  toOid: string
  fromX: number
  fromY: number
  toX: number
  toY: number
  lane: number
  sameLane: boolean
  isMerge: boolean
}

export interface SceneBounds {
  minX: number
  minY: number
  maxX: number
  maxY: number
}

export interface Scene {
  nodes: SceneNode[]
  edges: SceneEdge[]
  bounds: SceneBounds
  headOid: string
}

/** Camera in world space. zoom = pixels per world unit. */
export interface Camera {
  x: number
  y: number
  zoom: number
}

export interface LayoutRequest {
  type: 'layout'
  repository: GitRepository
}

export interface LayoutResponse {
  type: 'layout-result'
  scene: Scene
}
