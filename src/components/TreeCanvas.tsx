import { useEffect, useRef, useCallback, useMemo } from 'react'
import type { Scene, Camera } from '../renderer/types'
import { SpatialIndex } from '../renderer/spatialIndex'
import { drawScene, DrawState, PREFERS_REDUCED_MOTION } from '../renderer/draw'
import { screenToWorld, clampZoom, fitCamera } from '../renderer/camera'
import { stepTween, type CameraTween } from '../renderer/cameraTween'
import { colorCtxFromNodes, type ColorMode } from '../renderer/colorModes'
import { computeTimeBands } from '../renderer/timeAxis'

export interface TreeCanvasHandle {
  centerOn: (oid: string) => void
}

interface Props {
  scene: Scene
  focusedOid: string | null
  pathOids: ReadonlySet<string>
  hoverPathOids: ReadonlySet<string>
  /** Search matches; null when no search is active. */
  highlightOids: ReadonlySet<string> | null
  /** Node coloring lens. */
  colorMode: ColorMode
  onSelect: (oid: string) => void
  onHover: (oid: string | null, sx: number, sy: number) => void
  onBackgroundClick: () => void
  cameraRef: React.MutableRefObject<Camera>
  centerRef: React.MutableRefObject<((oid: string) => void) | null>
  /** Animate the camera to fit the whole graph (used by the toolbar). */
  fitRef: React.MutableRefObject<(() => void) | null>
  /** Pan the camera to an arbitrary world point and repaint (used by the minimap). */
  panToRef: React.MutableRefObject<((x: number, y: number) => void) | null>
  /** Kept in sync with the real viewport size (CSS px) for the minimap. */
  viewportRef: React.MutableRefObject<{ w: number; h: number }>
}

export function TreeCanvas({
  scene, focusedOid, pathOids, hoverPathOids, highlightOids, colorMode, onSelect, onHover, onBackgroundClick, cameraRef, centerRef, fitRef, panToRef, viewportRef,
}: Props) {
  const colorCtx = useMemo(() => colorCtxFromNodes(scene.nodes), [scene])
  const timeBands = useMemo(() => computeTimeBands(scene.nodes), [scene])
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const dirtyRef = useRef(true)
  const indexRef = useRef<SpatialIndex>(new SpatialIndex(scene.nodes))
  const hoveredRef = useRef<string | null>(null)
  const sizeRef = useRef({ w: 0, h: 0, dpr: 1 })
  const dragRef = useRef<{ x: number; y: number; moved: boolean } | null>(null)
  const tweenRef = useRef<CameraTween | null>(null)

  const markDirty = () => { dirtyRef.current = true }

  // Animate the camera toward a target (instant if reduced motion is preferred).
  const animateTo = useCallback((target: Camera) => {
    if (PREFERS_REDUCED_MOTION) {
      cameraRef.current = target
      tweenRef.current = null
    } else {
      tweenRef.current = { from: { ...cameraRef.current }, to: target, start: performance.now(), duration: 300 }
    }
    markDirty()
  }, [cameraRef])

  // Rebuild index + fit camera when the scene changes
  useEffect(() => {
    indexRef.current = new SpatialIndex(scene.nodes)
    const { w, h, dpr } = sizeRef.current
    if (w && h && scene.nodes.length) {
      cameraRef.current = fitCamera(scene.bounds, w / dpr, h / dpr)
    }
    markDirty()
  }, [scene, cameraRef])

  // Expose centerOn to parent (animated)
  useEffect(() => {
    centerRef.current = (oid: string) => {
      const n = scene.nodes.find(n => n.oid === oid)
      if (n) animateTo({ ...cameraRef.current, x: n.x, y: n.y })
    }
    return () => { centerRef.current = null }
  }, [scene, cameraRef, centerRef, animateTo])

  // Expose fit-to-view to parent (animated)
  useEffect(() => {
    fitRef.current = () => {
      const { w, h, dpr } = sizeRef.current
      if (w && h && scene.nodes.length) animateTo(fitCamera(scene.bounds, w / dpr, h / dpr))
    }
    return () => { fitRef.current = null }
  }, [scene, fitRef, animateTo])

  // Expose panTo (arbitrary world point) to parent — instant, cancels any tween
  useEffect(() => {
    panToRef.current = (x: number, y: number) => {
      tweenRef.current = null
      cameraRef.current = { ...cameraRef.current, x, y }
      markDirty()
    }
    return () => { panToRef.current = null }
  }, [cameraRef, panToRef])

  // Resize handling (DPR-aware)
  useEffect(() => {
    const canvas = canvasRef.current!
    const ro = new ResizeObserver(() => {
      const dpr = window.devicePixelRatio || 1
      const rect = canvas.getBoundingClientRect()
      canvas.width = Math.floor(rect.width * dpr)
      canvas.height = Math.floor(rect.height * dpr)
      sizeRef.current = { w: canvas.width, h: canvas.height, dpr }
      viewportRef.current = { w: rect.width, h: rect.height }
      markDirty()
    })
    ro.observe(canvas)
    return () => ro.disconnect()
  }, [viewportRef])

  // Render loop — only repaints when dirty
  useEffect(() => {
    let raf = 0
    const canvas = canvasRef.current!
    const ctx = canvas.getContext('2d')!
    const tick = () => {
      // Advance an in-flight camera tween; keep repainting until it lands.
      if (tweenRef.current) {
        const { cam, done } = stepTween(tweenRef.current, performance.now())
        cameraRef.current = cam
        if (done) tweenRef.current = null
        dirtyRef.current = true
      }
      if (dirtyRef.current) {
        dirtyRef.current = false
        const { w, h, dpr } = sizeRef.current
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
        const cssW = w / dpr, cssH = h / dpr
        const cam = cameraRef.current
        // viewport world rect for culling (+margin)
        const half = { x: cssW / 2 / cam.zoom, y: cssH / 2 / cam.zoom }
        const margin = 100 / cam.zoom
        const visible = indexRef.current.queryRect({
          minX: cam.x - half.x - margin, minY: cam.y - half.y - margin,
          maxX: cam.x + half.x + margin, maxY: cam.y + half.y + margin,
        })
        const state: DrawState = { cam, width: cssW, height: cssH, focusedOid, pathOids, hoveredOid: hoveredRef.current, hoverPathOids, highlightOids, colorMode, colorCtx, timeBands }
        drawScene(ctx, scene, visible, state)
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [scene, focusedOid, pathOids, hoverPathOids, highlightOids, colorMode, colorCtx, timeBands, cameraRef])

  // focus/path/highlight/color changes need a repaint
  useEffect(markDirty, [focusedOid, pathOids, hoverPathOids, highlightOids, colorMode])

  const toWorld = useCallback((clientX: number, clientY: number) => {
    const canvas = canvasRef.current!
    const rect = canvas.getBoundingClientRect()
    const sx = clientX - rect.left - rect.width / 2
    const sy = clientY - rect.top - rect.height / 2
    return screenToWorld(cameraRef.current, sx, sy)
  }, [cameraRef])

  // Native, non-passive wheel listener so we can preventDefault and stop the
  // page from scrolling while zooming the canvas.
  useEffect(() => {
    const canvas = canvasRef.current!
    const onWheelNative = (e: WheelEvent) => {
      e.preventDefault()
      tweenRef.current = null // user input cancels any camera animation
      const rect = canvas.getBoundingClientRect()
      const toW = (cx: number, cy: number) =>
        screenToWorld(cameraRef.current, cx - rect.left - rect.width / 2, cy - rect.top - rect.height / 2)
      const before = toW(e.clientX, e.clientY)
      const factor = e.deltaY < 0 ? 1.1 : 1 / 1.1
      cameraRef.current = { ...cameraRef.current, zoom: clampZoom(cameraRef.current.zoom * factor) }
      const after = toW(e.clientX, e.clientY)
      cameraRef.current.x += before.wx - after.wx
      cameraRef.current.y += before.wy - after.wy
      markDirty()
    }
    canvas.addEventListener('wheel', onWheelNative, { passive: false })
    return () => canvas.removeEventListener('wheel', onWheelNative)
  }, [cameraRef])

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    (e.target as Element).setPointerCapture(e.pointerId)
    tweenRef.current = null // user input cancels any camera animation
    dragRef.current = { x: e.clientX, y: e.clientY, moved: false }
  }, [])

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    const drag = dragRef.current
    if (drag) {
      const dx = e.clientX - drag.x, dy = e.clientY - drag.y
      if (Math.abs(dx) + Math.abs(dy) > 3) drag.moved = true
      const cam = cameraRef.current
      cameraRef.current = { ...cam, x: cam.x - dx / cam.zoom, y: cam.y - dy / cam.zoom }
      drag.x = e.clientX; drag.y = e.clientY
      markDirty()
    } else {
      const w = toWorld(e.clientX, e.clientY)
      const hit = indexRef.current.hitTest(w.wx, w.wy, 14 / cameraRef.current.zoom)
      if (hit !== hoveredRef.current) {
        hoveredRef.current = hit
        markDirty()
      }
      onHover(hit, e.clientX, e.clientY)
    }
  }, [toWorld, cameraRef, onHover])

  const onPointerUp = useCallback((e: React.PointerEvent) => {
    const drag = dragRef.current
    dragRef.current = null
    if (drag && !drag.moved) {
      const w = toWorld(e.clientX, e.clientY)
      const hit = indexRef.current.hitTest(w.wx, w.wy, 14 / cameraRef.current.zoom)
      if (hit) onSelect(hit)
      else onBackgroundClick()
    }
  }, [toWorld, cameraRef, onSelect, onBackgroundClick])

  return (
    <canvas
      ref={canvasRef}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      style={{ width: '100%', height: '100%', display: 'block', cursor: 'grab', touchAction: 'none' }}
    />
  )
}
