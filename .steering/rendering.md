# Rendering & performance

The graph is drawn on a single **Canvas 2D** context, not SVG/DOM. There is one
node per commit, so everything here exists to keep a 50k-commit repo at 60fps.
Touch `src/renderer/` or `TreeCanvas` with these invariants in mind.

## The redraw loop — `TreeCanvas.tsx`

- A `requestAnimationFrame` loop runs continuously but **only paints when
  `dirtyRef` is set** (`markDirty()`). Pan, zoom, hover, selection, resize, and
  an in-flight camera tween each mark dirty. Idle = no paint.
- The **camera lives in a `ref`**, not React state — mutated directly during
  drag/wheel so input never triggers a React re-render. Same for the hovered oid.
  If you add interaction, follow this: mutate the ref + `markDirty()`, don't
  `setState` per frame.
- Canvas is **DPR-aware**: a `ResizeObserver` sets backing-store size to
  `rect * devicePixelRatio` and the loop does `ctx.setTransform(dpr,…)`, then
  draws in CSS pixels. World coords go through `worldToScreen`/`screenToWorld`
  (`renderer/camera.ts`); `clampZoom` bounds zoom; `fitCamera` frames the graph.
- Camera animations are tweened (`cameraTween.ts`, 300ms). Any user input cancels
  the tween. `prefers-reduced-motion` snaps instead of animating
  (`PREFERS_REDUCED_MOTION` in `draw.ts`) — respect it.

## What makes it scale

- **Viewport culling** — `SpatialIndex` (`renderer/spatialIndex.ts`) is a grid
  over node positions. Each frame the loop computes the visible world rect
  (+margin) and only `queryRect` results are drawn. `hitTest` on the same index
  powers hover/click picking (no per-node loop). Rebuild the index whenever
  `scene` changes (already wired in `TreeCanvas`).
- **Level of detail** — `lodForZoom` (`renderer/theme.ts`) drops detail (ref
  labels, glow, then shapes) as you zoom out so far-out views stay cheap.
- **Glow sprite cache** — `renderer/glowCache.ts` pre-renders one radial-glow
  sprite per `(color, radius)` to an offscreen canvas; the draw loop *blits* it
  with `drawImage`. Never apply a per-frame blur/shadow per node — stamp the
  cached sprite. Call `clearGlowCache()` if the palette changes.

## Visual language (geometry; colors live in `DESIGN.md`)

`buildScene` flags nodes: `kind: 'merge'` (multi-parent), `significant`
(merge / tagged / branch tip → larger orb), `isHead`. `draw.ts` consumes
`DrawState` to decide emphasis each frame:

- **focused** commit + its `pathOids` (ancestors ∪ descendants) glow gold;
  everything else dims (`DIM`). `hoverPathOids` is a lighter preview when nothing
  is focused.
- **search**: when `highlightOids` is non-null, matches get a ring and non-matches
  dim — this takes priority over focus dimming.
- Node body color is pluggable via `ColorMode`/`colorCtx` (`colorModes.ts`):
  by-branch, by-author, by-recency, etc. Ref labels come from `refLabels.ts`,
  the month markers on the Y axis from `timeAxis.ts`.

## Export — `renderer/exportScene.ts`, `utils/export.ts`

PNG/SVG export re-renders the *whole* scene (not just the viewport) at a chosen
scale. Keep export drawing logic in sync with `draw.ts` when you change node/edge
appearance, or exports will diverge from the live canvas.
