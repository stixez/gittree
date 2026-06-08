import { useEffect, useMemo, useRef, useState } from 'react'
import { Map as MapIcon, ChevronDown } from 'lucide-react'
import type { Scene, Camera } from '../renderer/types'
import { laneColor, GOLD, GOLD_BRIGHT } from '../renderer/theme'
import { minimapTransform, minimapToWorld, worldToMinimap, viewportRectOnMinimap, minimapSize } from '../renderer/minimap'
import { getMinimapCollapsed, setMinimapCollapsed } from '../utils/preferences'

interface Props {
  scene: Scene
  focusedOid: string | null
  cameraRef: React.MutableRefObject<Camera>
  /** Real viewport size (CSS px) of the main canvas, kept current by TreeCanvas. */
  viewportRef: React.MutableRefObject<{ w: number; h: number }>
  onNavigate: (x: number, y: number) => void
}

const MAX_W = 190
const MAX_H = 300
const PAD = 12

export function CanvasMiniMap({ scene, focusedOid, cameraRef, viewportRef, onNavigate }: Props) {
  const ref = useRef<HTMLCanvasElement>(null)
  const cacheRef = useRef<HTMLCanvasElement | null>(null)
  const draggingRef = useRef(false)
  const [collapsed, setCollapsed] = useState(() => getMinimapCollapsed())

  const { w, h } = useMemo(() => minimapSize(scene.bounds, MAX_W, MAX_H), [scene.bounds])
  const t = useMemo(() => minimapTransform(scene.bounds, w, h, PAD), [scene.bounds, w, h])

  // Focused node position on the minimap (recomputed only when focus/scene changes).
  const focusPos = useMemo(() => {
    if (!focusedOid) return null
    const n = scene.nodes.find((n) => n.oid === focusedOid)
    return n ? worldToMinimap(t, n.x, n.y) : null
  }, [focusedOid, scene, t])

  // Build the static graph image (edges + nodes) once per scene/size.
  useEffect(() => {
    if (!scene.nodes.length || collapsed) return
    const cache = document.createElement('canvas')
    cache.width = w
    cache.height = h
    const cx = cache.getContext('2d')!
    cx.fillStyle = '#0b111a'
    cx.fillRect(0, 0, w, h)
    // edges
    cx.strokeStyle = 'rgba(120,140,170,0.16)'
    cx.lineWidth = 0.5
    cx.beginPath()
    for (const e of scene.edges) {
      const a = worldToMinimap(t, e.fromX, e.fromY)
      const b = worldToMinimap(t, e.toX, e.toY)
      cx.moveTo(a.x, a.y)
      cx.lineTo(b.x, b.y)
    }
    cx.stroke()
    // nodes
    for (const n of scene.nodes) {
      cx.fillStyle = n.isHead ? GOLD : laneColor(n.lane)
      const p = worldToMinimap(t, n.x, n.y)
      const r = n.isHead ? 2.5 : 1.6
      cx.fillRect(p.x - r, p.y - r, r * 2, r * 2)
    }
    cacheRef.current = cache
  }, [scene, t, w, h, collapsed])

  // Per-frame: blit the cached graph + draw the live viewport box and focus ring.
  useEffect(() => {
    if (!scene.nodes.length || collapsed) return
    let raf = 0
    const canvas = ref.current!
    const ctx = canvas.getContext('2d')!
    const draw = () => {
      const cache = cacheRef.current
      if (cache) ctx.drawImage(cache, 0, 0)
      else { ctx.fillStyle = '#0b111a'; ctx.fillRect(0, 0, w, h) }

      if (focusPos) {
        ctx.beginPath()
        ctx.arc(focusPos.x, focusPos.y, 3.5, 0, Math.PI * 2)
        ctx.strokeStyle = GOLD_BRIGHT
        ctx.lineWidth = 1.5
        ctx.stroke()
      }

      const vp = viewportRef.current
      if (vp.w && vp.h) {
        const r = viewportRectOnMinimap(cameraRef.current, vp.w, vp.h, t)
        ctx.strokeStyle = GOLD
        ctx.lineWidth = 1
        ctx.globalAlpha = 0.85
        ctx.strokeRect(r.x, r.y, r.w, r.h)
        ctx.globalAlpha = 1
      }
      raf = requestAnimationFrame(draw)
    }
    raf = requestAnimationFrame(draw)
    return () => cancelAnimationFrame(raf)
  }, [scene, t, w, h, collapsed, focusPos, cameraRef, viewportRef])

  const toggle = () => {
    setCollapsed((c) => { const next = !c; setMinimapCollapsed(next); return next })
  }

  const navigateFromEvent = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const world = minimapToWorld(t, e.clientX - rect.left, e.clientY - rect.top)
    onNavigate(world.x, world.y)
  }

  if (!scene.nodes.length) return null

  if (collapsed) {
    return (
      <button
        onClick={toggle}
        className="absolute bottom-3 right-3 z-10 flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-900/80 border border-slate-700 text-slate-400 hover:text-white hover:bg-slate-800 backdrop-blur-sm text-xs font-sans"
        title="Show minimap"
        aria-label="Show minimap"
      >
        <MapIcon className="w-3.5 h-3.5" />
        Map
      </button>
    )
  }

  return (
    <div className="absolute bottom-3 right-3 z-10" style={{ width: w }}>
      <button
        onClick={toggle}
        className="absolute -top-2 -right-2 z-20 p-1 rounded-md bg-slate-900 border border-slate-700 text-slate-400 hover:text-white hover:bg-slate-800"
        title="Hide minimap"
        aria-label="Hide minimap"
      >
        <ChevronDown className="w-3.5 h-3.5" />
      </button>
      <canvas
        ref={ref}
        width={w}
        height={h}
        onPointerDown={(e) => {
          e.currentTarget.setPointerCapture(e.pointerId)
          draggingRef.current = true
          navigateFromEvent(e)
        }}
        onPointerMove={(e) => { if (draggingRef.current) navigateFromEvent(e) }}
        onPointerUp={() => { draggingRef.current = false }}
        style={{ display: 'block', border: '1px solid #2b3744', borderRadius: 8, cursor: 'pointer', touchAction: 'none' }}
      />
    </div>
  )
}
