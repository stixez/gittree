import { GitCommit, GitRepository } from '../types/git'

export const LANE_SPACING_X = 160
export const LEVEL_SPACING_Y = 50

export interface LayoutPosition {
  x: number
  y: number
  lane: number
}

export interface LayoutResult {
  positions: Map<string, LayoutPosition>
  maxLane: number
  maxLevel: number
}

/**
 * Advanced graph layout algorithm for git commit trees
 * Uses lane-based positioning similar to GitHub's network graph
 */
export function computeGraphLayout(repository: GitRepository): LayoutResult {
  const commits = repository.commits
  const commitMap = new Map<string, GitCommit>()
  
  // Build commit map
  commits.forEach(c => commitMap.set(c.oid, c))
  
  // 1. Topological sort (reverse chronological order)
  const sorted = topologicalSort(commits, commitMap)
  
  // 2. Assign lanes to commits
  const lanes = assignLanes(sorted)
  
  // 3. Calculate positions
  const positions = new Map<string, LayoutPosition>()
  let maxLane = 0
  
  sorted.forEach((commit, level) => {
    const lane = lanes.get(commit.oid) || 0
    maxLane = Math.max(maxLane, lane)
    
    positions.set(commit.oid, {
      x: lane * LANE_SPACING_X,
      y: level * LEVEL_SPACING_Y,
      lane,
    })
  })
  
  return {
    positions,
    maxLane,
    maxLevel: sorted.length - 1,
  }
}

/**
 * Topological sort with first-parent continuity.
 * Uses Kahn's algorithm but prefers following first-parent chains so that
 * each branch's commits stay grouped together (like `git log --graph`).
 * Falls back to newest-first ordering when no first-parent continuation exists.
 */
function topologicalSort(
  commits: GitCommit[],
  commitMap: Map<string, GitCommit>
): GitCommit[] {
  // Build in-degree map (how many children each commit has within our set)
  const inDegree = new Map<string, number>()

  for (const c of commits) {
    if (!inDegree.has(c.oid)) inDegree.set(c.oid, 0)
    for (const p of c.parents) {
      if (commitMap.has(p)) {
        inDegree.set(p, (inDegree.get(p) || 0) + 1)
      }
    }
  }

  // Start with commits that have no children (in-degree 0), sorted newest-first
  const ready = commits
    .filter(c => (inDegree.get(c.oid) || 0) === 0)
    .sort((a, b) => b.author.timestamp - a.author.timestamp)

  const sorted: GitCommit[] = []
  const visited = new Set<string>()
  // First-parent continuation: when set, this commit is processed next
  let nextPreferred: GitCommit | null = null

  while (ready.length > 0 || nextPreferred) {
    let commit: GitCommit | undefined

    // Prefer first-parent continuation over timestamp ordering
    if (nextPreferred && !visited.has(nextPreferred.oid)) {
      commit = nextPreferred
      // Remove from ready queue if it was also inserted there
      const idx = ready.indexOf(nextPreferred)
      if (idx !== -1) ready.splice(idx, 1)
    } else {
      commit = ready.shift()
    }
    nextPreferred = null

    if (!commit || visited.has(commit.oid)) continue
    visited.add(commit.oid)
    sorted.push(commit)

    // Decrease in-degree of parents; if they reach 0, they're ready
    for (const parentOid of commit.parents) {
      const parent = commitMap.get(parentOid)
      if (!parent || visited.has(parentOid)) continue
      const deg = (inDegree.get(parentOid) || 1) - 1
      inDegree.set(parentOid, deg)
      if (deg <= 0) {
        // First parent gets priority — continue following this branch line
        if (parentOid === commit.parents[0] && !nextPreferred) {
          nextPreferred = parent
        } else {
          // Other parents go into the ready queue sorted by timestamp
          const ts = parent.author.timestamp
          let idx = 0
          while (idx < ready.length && ready[idx].author.timestamp >= ts) idx++
          ready.splice(idx, 0, parent)
        }
      }
    }
  }

  // Add any remaining commits not reached (disconnected graph fragments)
  for (const c of commits) {
    if (!visited.has(c.oid)) sorted.push(c)
  }

  return sorted
}

/**
 * Assign lanes to commits to minimize crossing edges.
 * Each lane "waits" for the next commit OID it expects.
 * When a commit arrives, we place it in the lane that was waiting for it.
 */
function assignLanes(
  commits: GitCommit[]
): Map<string, number> {
  const lanes = new Map<string, number>()
  // activeLanes[i] = OID the lane is waiting for, or null if free
  const activeLanes: Array<string | null> = []
  // O(1) lookup: OID -> lane index (reverse index of activeLanes)
  const oidToLane = new Map<string, number>()
  // Track first free lane index for O(1) free-lane finding
  let firstFreeLane = -1

  const updateFirstFree = () => {
    firstFreeLane = -1
    for (let i = 0; i < activeLanes.length; i++) {
      if (activeLanes[i] === null) { firstFreeLane = i; return }
    }
  }

  commits.forEach(commit => {
    const oid = commit.oid
    const parents = commit.parents

    // 1. Check if THIS commit is being waited for in any lane — O(1)
    let assignedLane = oidToLane.get(oid) ?? -1

    // 2. If not, grab a free lane or create a new one
    if (assignedLane === -1) {
      if (firstFreeLane !== -1) {
        assignedLane = firstFreeLane
      } else {
        assignedLane = activeLanes.length
        activeLanes.push(null)
      }
    }

    // Clear old mapping for this lane
    const prev = activeLanes[assignedLane]
    if (prev !== null) oidToLane.delete(prev)

    lanes.set(oid, assignedLane)

    // 3. Set this lane to wait for the first parent (main line continues)
    if (parents.length === 0) {
      activeLanes[assignedLane] = null
    } else {
      activeLanes[assignedLane] = parents[0]
      oidToLane.set(parents[0], assignedLane)

      // 4. For merge commits, put additional parents in their own lanes
      for (let i = 1; i < parents.length; i++) {
        const parentOid = parents[i]
        // Skip if another lane is already waiting for this parent — O(1)
        if (oidToLane.has(parentOid)) continue

        if (firstFreeLane !== -1) {
          // Recalculate since we may have used it
          let free = -1
          for (let j = 0; j < activeLanes.length; j++) {
            if (activeLanes[j] === null) { free = j; break }
          }
          if (free !== -1) {
            activeLanes[free] = parentOid
            oidToLane.set(parentOid, free)
          } else {
            const newLane = activeLanes.length
            activeLanes.push(parentOid)
            oidToLane.set(parentOid, newLane)
          }
        } else {
          const newLane = activeLanes.length
          activeLanes.push(parentOid)
          oidToLane.set(parentOid, newLane)
        }
      }
    }

    // Trim trailing free lanes
    while (activeLanes.length > 0 && activeLanes[activeLanes.length - 1] === null) {
      activeLanes.pop()
    }

    updateFirstFree()
  })

  return lanes
}

/**
 * Optimize lane assignments to minimize crossings
 * (Advanced optimization - optional)
 */
export function optimizeLanes(
  commits: GitCommit[],
  _lanes?: Map<string, number>
): Map<string, number> {
  const commitMap = new Map<string, GitCommit>()
  commits.forEach(c => commitMap.set(c.oid, c))
  // Simple optimization: group branches together
  const optimized = new Map<string, number>()
  
  // Find "branch tips" (commits with no children in our set)
  const hasChildren = new Set<string>()
  commits.forEach(commit => {
    commit.parents.forEach(p => hasChildren.add(p))
  })
  
  const tips = commits.filter(c => !hasChildren.has(c.oid))
  
  // Assign lanes to branches starting from tips
  let nextLane = 0
  const visited = new Set<string>()
  
  function assignBranch(oid: string, lane: number) {
    if (visited.has(oid)) return
    
    const commit = commitMap.get(oid)
    if (!commit) return
    
    visited.add(oid)
    optimized.set(oid, lane)
    
    // Follow first parent in same lane
    if (commit.parents.length > 0) {
      assignBranch(commit.parents[0], lane)
      
      // Assign other parents to new lanes
      for (let i = 1; i < commit.parents.length; i++) {
        assignBranch(commit.parents[i], nextLane++)
      }
    }
  }
  
  // Assign lanes starting from each tip
  tips.forEach(tip => {
    assignBranch(tip.oid, nextLane++)
  })
  
  // Assign any remaining commits (shouldn't happen if graph is connected)
  commits.forEach(commit => {
    if (!optimized.has(commit.oid)) {
      optimized.set(commit.oid, 0)
    }
  })
  
  return optimized
}

/**
 * Compact lanes by removing gaps
 */
export function compactLanes(
  positions: Map<string, LayoutPosition>
): Map<string, LayoutPosition> {
  // Find all unique lanes
  const usedLanes = new Set<number>()
  positions.forEach(pos => usedLanes.add(pos.lane))
  
  // Create lane mapping (old lane -> new lane)
  const sortedLanes = Array.from(usedLanes).sort((a, b) => a - b)
  const laneMapping = new Map<number, number>()
  sortedLanes.forEach((lane, index) => {
    laneMapping.set(lane, index)
  })
  
  // Remap positions
  const compacted = new Map<string, LayoutPosition>()
  positions.forEach((pos, oid) => {
    const newLane = laneMapping.get(pos.lane) || 0
    compacted.set(oid, {
      ...pos,
      lane: newLane,
      x: newLane * LANE_SPACING_X,
    })
  })
  
  return compacted
}
