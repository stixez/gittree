import { useEffect, useRef } from 'react'

// Decorative, self-contained animated commit-graph used as the landing backdrop.
// Independent of the real renderer so it can't affect graph rendering.

const LANE_COLORS = ['#e0bd6b', '#4fb6c4', '#d24b4b', '#6f9fd8', '#e0784a', '#5fbf9a', '#9484c8']
const HEAD_LANE = 3
const LANES = 7
const SPACING = 72
const DRIFT_PX_PER_SEC = 13

const reducedMotion =
  typeof window !== 'undefined' && window.matchMedia
    ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
    : false

interface GNode { x: number; y: number; r: number; color: string; head: boolean; phase: number }

export function LandingGraphCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current!
    const ctx = canvas.getContext('2d')!
    let raf = 0
    let w = 0, h = 0, dpr = 1, field = 1
    let nodes: GNode[] = []
    let edges: Array<[number, number]> = []

    // Deterministic pseudo-random so the field is stable across rebuilds.
    const rand = (seed: number) => {
      const s = Math.sin(seed * 127.1) * 43758.5453
      return s - Math.floor(s)
    }

    const build = () => {
      nodes = []
      edges = []
      field = Math.max(h, 600) * 1.6
      const lastInLane: number[] = new Array(LANES).fill(-1)
      let id = 0
      for (let lane = 0; lane < LANES; lane++) {
        const laneX = ((lane + 0.5) / LANES) * w + (rand(lane * 3.3) - 0.5) * (w / LANES) * 0.4
        let y = (lane * 29) % SPACING
        while (y < field) {
          const node: GNode = {
            x: laneX + (rand(id * 1.7) - 0.5) * 14,
            y,
            r: 2.2 + (id % 5 === 0 ? 2.4 : 0),
            color: lane === HEAD_LANE ? '#e0bd6b' : LANE_COLORS[lane % LANE_COLORS.length],
            head: lane === HEAD_LANE,
            phase: id * 0.7,
          }
          const idx = nodes.push(node) - 1
          if (lastInLane[lane] >= 0) edges.push([lastInLane[lane], idx])
          if (id % 8 === 0 && lane > 0 && lastInLane[lane - 1] >= 0) edges.push([lastInLane[lane - 1], idx])
          lastInLane[lane] = idx
          y += SPACING + rand(id * 5.1) * 26
          id++
        }
      }
    }

    const resize = () => {
      dpr = window.devicePixelRatio || 1
      const rect = canvas.getBoundingClientRect()
      w = rect.width; h = rect.height
      canvas.width = Math.floor(w * dpr)
      canvas.height = Math.floor(h * dpr)
      build()
    }

    const start = performance.now()
    const screenY = (y: number, drift: number) => ((y - drift) % field + field) % field

    const frame = (now: number) => {
      const t = (now - start) / 1000
      const drift = reducedMotion ? field * 0.15 : (t * DRIFT_PX_PER_SEC) % field
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      ctx.clearRect(0, 0, w, h)

      ctx.lineWidth = 1.4
      for (const [a, b] of edges) {
        const ya = screenY(nodes[a].y, drift)
        const yb = screenY(nodes[b].y, drift)
        if (Math.abs(ya - yb) > field * 0.5) continue // wrapped seam
        if (Math.min(ya, yb) > h + 30 || Math.max(ya, yb) < -30) continue
        const xa = nodes[a].x, xb = nodes[b].x
        const my = (ya + yb) / 2
        ctx.beginPath()
        ctx.moveTo(xa, ya)
        ctx.bezierCurveTo(xa, my, xb, my, xb, yb)
        ctx.strokeStyle = nodes[a].head && nodes[b].head ? 'rgba(224,189,107,0.45)' : 'rgba(90,120,150,0.16)'
        ctx.stroke()
      }

      for (const n of nodes) {
        const y = screenY(n.y, drift)
        if (y < -20 || y > h + 20) continue
        const tw = reducedMotion ? 1 : 0.55 + 0.45 * Math.sin(t * 1.4 + n.phase)
        ctx.beginPath()
        ctx.arc(n.x, y, n.r, 0, Math.PI * 2)
        ctx.fillStyle = n.color
        ctx.globalAlpha = 0.45 + 0.55 * tw
        ctx.shadowColor = n.color
        ctx.shadowBlur = 11 * tw
        ctx.fill()
      }
      ctx.shadowBlur = 0
      ctx.globalAlpha = 1
      raf = requestAnimationFrame(frame)
    }

    const ro = new ResizeObserver(resize)
    ro.observe(canvas)
    resize()
    raf = requestAnimationFrame(frame)
    return () => { cancelAnimationFrame(raf); ro.disconnect() }
  }, [])

  return <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" aria-hidden="true" />
}
