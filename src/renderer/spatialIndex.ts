import type { SceneNode, SceneBounds } from './types'

export class SpatialIndex {
  private cells = new Map<string, SceneNode[]>()
  private cell: number

  constructor(nodes: SceneNode[], cellSize = 200) {
    this.cell = cellSize
    for (const n of nodes) {
      const key = this.key(n.x, n.y)
      const bucket = this.cells.get(key)
      if (bucket) bucket.push(n)
      else this.cells.set(key, [n])
    }
  }

  private key(x: number, y: number): string {
    return `${Math.floor(x / this.cell)},${Math.floor(y / this.cell)}`
  }

  /** All nodes whose position falls inside the world rect. */
  queryRect(r: SceneBounds): SceneNode[] {
    const out: SceneNode[] = []
    const x0 = Math.floor(r.minX / this.cell), x1 = Math.floor(r.maxX / this.cell)
    const y0 = Math.floor(r.minY / this.cell), y1 = Math.floor(r.maxY / this.cell)
    for (let cx = x0; cx <= x1; cx++) {
      for (let cy = y0; cy <= y1; cy++) {
        const bucket = this.cells.get(`${cx},${cy}`)
        if (!bucket) continue
        for (const n of bucket) {
          if (n.x >= r.minX && n.x <= r.maxX && n.y >= r.minY && n.y <= r.maxY) out.push(n)
        }
      }
    }
    return out
  }

  /** Nearest node oid within `radius` world units of (x,y), else null. */
  hitTest(x: number, y: number, radius: number): string | null {
    const r: SceneBounds = { minX: x - radius, minY: y - radius, maxX: x + radius, maxY: y + radius }
    let best: string | null = null
    let bestD = radius * radius
    for (const n of this.queryRect(r)) {
      const dx = n.x - x, dy = n.y - y
      const d = dx * dx + dy * dy
      if (d <= bestD) { bestD = d; best = n.oid }
    }
    return best
  }
}
