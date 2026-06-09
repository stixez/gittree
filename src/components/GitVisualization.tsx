import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Maximize2, Minimize2, Scan, Crosshair } from 'lucide-react'
import { GitRepository, GitCommit } from '../types/git'
import { CommitDetails } from './CommitDetails'
import { TreeCanvas } from './TreeCanvas'
import { CommitHoverCard } from './CommitHoverCard'
import { CanvasMiniMap } from './CanvasMiniMap'
import { connectedPath } from '../renderer/pathWalk'
import { clearGlowCache } from '../renderer/glowCache'
import type { ColorMode } from '../renderer/colorModes'
import type { Scene, Camera, LayoutRequest, LayoutResponse } from '../renderer/types'
import LayoutWorker from '../workers/layout.worker?worker'

interface GitVisualizationProps {
  repository: GitRepository
  dirHandle: FileSystemDirectoryHandle | null
  remoteUrl?: string
  /** Search matches to highlight in context; null when no search is active. */
  highlightOids?: Set<string> | null
  /** Commit to open/focus on load (from a shared URL); restored once. */
  initialCommitOid?: string
  /** Reports the currently-open commit so the URL can reflect it. */
  onSelectionChange?: (oid: string | null) => void
  /** External request to select a commit (e.g. a click in the commit list). */
  selectRequest?: { oid: string } | null
  /** External request to focus+center a commit without opening its details
   * (e.g. stepping through search matches). New identity per request. */
  focusRequest?: { oid: string } | null
  /** Filter the graph by an author (wired from the commit-details panel). */
  onFilterAuthor?: (name: string) => void
  /** Filter the graph to commits touching a path (wired to the changed-files list). */
  onFilterPath?: (path: string) => void
}

const EMPTY_SCENE: Scene = { nodes: [], edges: [], bounds: { minX: 0, minY: 0, maxX: 0, maxY: 0 }, headOid: '' }
// Shared empty set so "no path" always has the same identity — avoids
// re-triggering the canvas render effect / repaint on every hover.
const EMPTY_OIDS: ReadonlySet<string> = new Set<string>()

export function GitVisualization({ repository, dirHandle, remoteUrl, highlightOids = null, initialCommitOid, onSelectionChange, selectRequest, focusRequest, onFilterAuthor, onFilterPath }: GitVisualizationProps) {
  const [scene, setScene] = useState<Scene>(EMPTY_SCENE)
  const [selectedCommit, setSelectedCommit] = useState<GitCommit | null>(null)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [focusedOid, setFocusedOid] = useState<string | null>(null)
  const [hover, setHover] = useState<{ commit: GitCommit; x: number; y: number } | null>(null)
  const [hoverPathOids, setHoverPathOids] = useState<ReadonlySet<string>>(EMPTY_OIDS)
  const [colorMode, setColorMode] = useState<ColorMode>('branch')

  const cameraRef = useRef<Camera>({ x: 0, y: 0, zoom: 0.7 })
  const centerRef = useRef<((oid: string) => void) | null>(null)
  const fitRef = useRef<(() => void) | null>(null)
  const panToRef = useRef<((x: number, y: number) => void) | null>(null)
  const viewportRef = useRef<{ w: number; h: number }>({ w: 0, h: 0 })
  const containerRef = useRef<HTMLDivElement>(null)
  const commitMapRef = useRef(new Map<string, GitCommit>())
  const parentsMapRef = useRef(new Map<string, string[]>())
  const childrenMapRef = useRef(new Map<string, string[]>())
  const pathCacheRef = useRef(new Map<string, Set<string>>())
  const nodePosRef = useRef(new Map<string, { x: number; y: number; lane: number }>())
  const workerRef = useRef<Worker | null>(null)

  // ── Create the layout worker once; it processes posted repositories in
  //    order, so the latest (and progressive partials) settle naturally. ──
  useEffect(() => {
    const worker = new LayoutWorker()
    workerRef.current = worker
    worker.onmessage = (e: MessageEvent<LayoutResponse>) => {
      if (e.data.type === 'layout-result') {
        const s = e.data.scene
        const posMap = new Map<string, { x: number; y: number; lane: number }>()
        s.nodes.forEach(n => posMap.set(n.oid, { x: n.x, y: n.y, lane: n.lane }))
        nodePosRef.current = posMap
        setScene(s)
      }
    }
    return () => { worker.terminate(); workerRef.current = null }
  }, [])

  // Release the offscreen glow-sprite canvases when this view goes away, so the
  // global cache doesn't accumulate across repository/tab switches.
  useEffect(() => clearGlowCache, [])

  // ── Build lookup maps + dispatch layout when the repository changes ──
  useEffect(() => {
    setFocusedOid(null)

    const commitMap = new Map<string, GitCommit>()
    const parentsMap = new Map<string, string[]>()
    repository.commits.forEach(c => { commitMap.set(c.oid, c); parentsMap.set(c.oid, c.parents) })
    commitMapRef.current = commitMap
    parentsMapRef.current = parentsMap

    const childrenMap = new Map<string, string[]>()
    repository.commits.forEach(c => c.parents.forEach(p => {
      if (!childrenMap.has(p)) childrenMap.set(p, [])
      childrenMap.get(p)!.push(c.oid)
    }))
    childrenMapRef.current = childrenMap
    pathCacheRef.current = new Map() // lineage cache is repository-specific

    const req: LayoutRequest = { type: 'layout', repository }
    workerRef.current?.postMessage(req)
  }, [repository])

  // Memoized lineage walk — hovering sweeps across many nodes, so cache each
  // commit's connected path (cleared when the repository changes).
  const getConnectedPath = useCallback((oid: string): Set<string> => {
    const cache = pathCacheRef.current
    let path = cache.get(oid)
    if (!path) {
      path = connectedPath(oid, parentsMapRef.current, childrenMapRef.current)
      cache.set(oid, path)
    }
    return path
  }, [])

  // ── Lineage (ancestors ∪ descendants) of the focused commit ─────────
  const pathOids = useMemo<ReadonlySet<string>>(
    () => (focusedOid ? getConnectedPath(focusedOid) : EMPTY_OIDS),
    [focusedOid, getConnectedPath],
  )

  const navigateTo = useCallback((oid: string) => {
    setFocusedOid(oid)
    centerRef.current?.(oid)
  }, [])

  const handleSelect = useCallback((oid: string) => {
    const c = commitMapRef.current.get(oid)
    if (c) { setSelectedCommit(c); setFocusedOid(oid); centerRef.current?.(oid) }
  }, [])

  // Honor external selection requests (new object identity per request, so the
  // same commit clicked twice still re-selects). No-op if it isn't in the graph.
  useEffect(() => {
    if (selectRequest) handleSelect(selectRequest.oid)
  }, [selectRequest, handleSelect])

  // Step-to-match (search): focus + center, but don't open the details panel —
  // keeps Enter-cycling lightweight.
  useEffect(() => {
    if (focusRequest) navigateTo(focusRequest.oid)
  }, [focusRequest, navigateTo])

  // Report the open commit upward so the URL can reflect it (deep-linkable).
  // Skip the initial mount report when nothing is selected — otherwise it would
  // clobber a shared ?commit= before the (async) scene loads and restore runs.
  const firstReportRef = useRef(true)
  useEffect(() => {
    if (firstReportRef.current) {
      firstReportRef.current = false
      if (selectedCommit === null) return
    }
    onSelectionChange?.(selectedCommit?.oid ?? null)
  }, [selectedCommit, onSelectionChange])

  // Restore a commit from a shared URL once it exists in the loaded scene
  // (one-shot). Keeps retrying across scene updates until the commit appears —
  // e.g. it's currently filtered out and the user clears the filter.
  const restoredRef = useRef(false)
  useEffect(() => {
    if (restoredRef.current || !initialCommitOid || !scene.nodes.length) return
    const c = commitMapRef.current.get(initialCommitOid)
    if (c) {
      restoredRef.current = true
      setSelectedCommit(c)
      setFocusedOid(initialCommitOid)
      centerRef.current?.(initialCommitOid)
    }
  }, [scene.nodes.length, initialCommitOid])

  const hoveredOidRef = useRef<string | null>(null)
  const handleHover = useCallback((oid: string | null, x: number, y: number) => {
    if (!oid) {
      setHover(null)
      if (hoveredOidRef.current !== null) { hoveredOidRef.current = null; setHoverPathOids(EMPTY_OIDS) }
      return
    }
    const c = commitMapRef.current.get(oid)
    if (c) setHover({ commit: c, x, y })
    // Recompute the hover lineage only when the hovered commit changes, and
    // only when no commit is focused (focus highlighting takes over).
    if (oid !== hoveredOidRef.current) {
      hoveredOidRef.current = oid
      setHoverPathOids(!focusedOid && c ? getConnectedPath(oid) : EMPTY_OIDS)
    }
  }, [focusedOid, getConnectedPath])

  // ── Keyboard navigation (parity with old behavior) ─────────────────
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return

      if (e.key === 'f' || e.key === 'F') {
        if (document.fullscreenElement) document.exitFullscreen?.()
        else containerRef.current?.requestFullscreen?.()
        e.preventDefault(); return
      }

      const commitMap = commitMapRef.current
      const childrenMap = childrenMapRef.current
      const positions = nodePosRef.current

      if (e.key === 'Escape') {
        if (selectedCommit) { setSelectedCommit(null); e.preventDefault() }
        else if (focusedOid) { setFocusedOid(null); e.preventDefault() }
        else if (document.fullscreenElement) { document.exitFullscreen?.(); e.preventDefault() }
        return
      }

      if (!focusedOid) {
        if (['ArrowDown', 'ArrowUp', 'j', 'k', 'h', 'l'].includes(e.key)) {
          const start = repository.head || commitMap.keys().next().value
          if (start) { navigateTo(start); e.preventDefault() }
        }
        return
      }

      const commit = commitMap.get(focusedOid)
      if (!commit) return
      let nextOid: string | null = null

      switch (e.key) {
        case 'ArrowDown': case 'j':
          if (commit.parents.length && commitMap.has(commit.parents[0])) nextOid = commit.parents[0]
          break
        case 'ArrowUp': case 'k': {
          const ch = childrenMap.get(focusedOid)
          if (ch && ch.length) nextOid = ch[0]
          break
        }
        case 'ArrowLeft': case 'h': {
          const cur = positions.get(focusedOid); if (!cur) break
          let best: string | null = null, bestD = Infinity
          positions.forEach((p, oid) => {
            if (p.lane >= cur.lane || oid === focusedOid) return
            const d = Math.abs(p.y - cur.y) + (cur.lane - p.lane) * 80
            if (d < bestD) { bestD = d; best = oid }
          })
          nextOid = best; break
        }
        case 'ArrowRight': case 'l': {
          const cur = positions.get(focusedOid); if (!cur) break
          let best: string | null = null, bestD = Infinity
          positions.forEach((p, oid) => {
            if (p.lane <= cur.lane || oid === focusedOid) return
            const d = Math.abs(p.y - cur.y) + (p.lane - cur.lane) * 80
            if (d < bestD) { bestD = d; best = oid }
          })
          nextOid = best; break
        }
        case 'Enter':
          setSelectedCommit(commit); e.preventDefault(); return
      }

      if (nextOid) { navigateTo(nextOid); e.preventDefault() }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [focusedOid, selectedCommit, isFullscreen, repository.head, navigateTo])

  // Use the native Fullscreen API — robust across browsers and avoids CSS
  // stacking/sizing pitfalls. State is synced from the fullscreenchange event.
  const toggleFullscreen = useCallback(() => {
    if (document.fullscreenElement) {
      document.exitFullscreen?.()
    } else {
      containerRef.current?.requestFullscreen?.()
    }
  }, [])

  useEffect(() => {
    const onChange = () => setIsFullscreen(!!document.fullscreenElement)
    document.addEventListener('fullscreenchange', onChange)
    return () => document.removeEventListener('fullscreenchange', onChange)
  }, [])

  return (
    <>
      <div
        ref={containerRef}
        className={`overflow-hidden relative bg-[#0b111a] ${
          isFullscreen ? 'rounded-none border-0' : 'w-full rounded-xl border border-slate-800'
        }`}
        style={{ height: isFullscreen ? '100%' : 'calc(100vh - 14rem)' }}
      >
        <div className="absolute top-3 right-3 z-10 flex items-center gap-2">
          <button
            onClick={() => fitRef.current?.()}
            className="p-2 rounded-lg bg-slate-900/80 border border-slate-700 text-slate-400 hover:text-white hover:bg-slate-800 backdrop-blur-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            title="Fit graph to view"
            aria-label="Fit graph to view"
          >
            <Scan className="w-4 h-4" />
          </button>
          <button
            onClick={() => { if (scene.headOid) { setFocusedOid(scene.headOid); centerRef.current?.(scene.headOid) } }}
            disabled={!scene.headOid}
            className="p-2 rounded-lg bg-slate-900/80 border border-slate-700 text-slate-400 hover:text-white hover:bg-slate-800 backdrop-blur-sm disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            title="Jump to HEAD"
            aria-label="Jump to HEAD"
          >
            <Crosshair className="w-4 h-4" />
          </button>
          <button
            onClick={toggleFullscreen}
            className="p-2 rounded-lg bg-slate-900/80 border border-slate-700 text-slate-400 hover:text-white hover:bg-slate-800 backdrop-blur-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            title={isFullscreen ? 'Exit fullscreen (Esc)' : 'Fullscreen'}
            aria-label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>

        <div className="absolute top-3 left-3 z-10 flex items-center gap-0.5 p-0.5 bg-slate-900/80 border border-slate-700 rounded-lg backdrop-blur-sm">
          {(['branch', 'author', 'recency'] as const).map((mode) => (
            <button
              key={mode}
              onClick={() => setColorMode(mode)}
              className={`px-2 py-1 text-[11px] font-medium rounded-md capitalize transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                colorMode === mode ? 'bg-primary text-white' : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
              title={`Color commits by ${mode}`}
              aria-label={`Color commits by ${mode}`}
              aria-pressed={colorMode === mode}
            >
              {mode}
            </button>
          ))}
        </div>

        <div className="absolute bottom-3 left-3 z-10 flex items-center gap-2 px-2.5 py-1.5 bg-slate-900/70 border border-slate-800 rounded-lg backdrop-blur-sm pointer-events-none">
          <span className="text-[10px] text-slate-400 font-mono">↑↓←→ navigate</span>
          <span className="text-[10px] text-slate-500">·</span>
          <span className="text-[10px] text-slate-400 font-mono">Enter details</span>
          <span className="text-[10px] text-slate-500">·</span>
          <span className="text-[10px] text-slate-400 font-mono">Esc clear</span>
        </div>

        <TreeCanvas
          scene={scene}
          focusedOid={focusedOid}
          pathOids={pathOids}
          hoverPathOids={hoverPathOids}
          highlightOids={highlightOids}
          colorMode={colorMode}
          onSelect={handleSelect}
          onHover={handleHover}
          onBackgroundClick={() => setFocusedOid(null)}
          cameraRef={cameraRef}
          centerRef={centerRef}
          fitRef={fitRef}
          panToRef={panToRef}
          viewportRef={viewportRef}
        />

        <CanvasMiniMap scene={scene} focusedOid={focusedOid} cameraRef={cameraRef} viewportRef={viewportRef} onNavigate={(x, y) => panToRef.current?.(x, y)} />

        {/* Rendered inside the container so they remain visible in native
            fullscreen (only descendants of the fullscreen element paint). */}
        {hover && <CommitHoverCard commit={hover.commit} x={hover.x} y={hover.y} />}

        {selectedCommit && (
          <CommitDetails
            commit={selectedCommit}
            branches={repository.branches}
            tags={repository.tags}
            dirHandle={dirHandle}
            remoteUrl={remoteUrl}
            onClose={() => setSelectedCommit(null)}
            onSelectCommit={handleSelect}
            onFilterAuthor={onFilterAuthor}
            onFilterPath={onFilterPath}
          />
        )}
      </div>
    </>
  )
}
