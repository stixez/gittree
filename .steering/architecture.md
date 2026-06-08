# Architecture

The whole app is a pipeline that turns a git repo into a painted graph, entirely
in the browser. Trace it in this order:

```
load (gitService)  →  GitRepository  →  layout worker  →  Scene  →  Canvas renderer
   src/services        src/types/git    src/workers       src/renderer/types   src/renderer
```

## 1. Load — `src/services/gitService.ts`

Reads a repo with **isomorphic-git** and produces a `GitRepository`
(`commits`, `branches`, `tags`, `head`, `isPartial`). Two sources:

- **Local folder** — File System Access API `FileSystemDirectoryHandle`. Reads
  `.git` in place; never uploads. Requires Chrome/Edge 102+.
- **Remote clone** — clones into **OPFS** (browser sandbox storage, see
  `storageService.ts`) via a CORS proxy, then reads from there.

Loading is **progressive and abortable**. A fast first pass is depth-capped
(`MAIN_DEPTH`, `BRANCH_DEPTH`) and reports partial results via `onPartialResult`;
`loadFullRepository`/`full: true` removes the caps. `isPartial` marks a capped
result (surfaced as `PartialBadge`). `historyTruncated` (`utils/partialLoad.ts`)
decides whether more remains. Always thread the `AbortSignal` through.

## 2. Layout — Web Worker, off the main thread

`GitVisualization` creates one **persistent** `layout.worker` and posts the
`GitRepository` to it whenever the repo (or a progressive partial) changes. The
worker is intentionally tiny glue (`src/workers/layout.worker.ts`); all real work
is the **pure, testable** `buildScene` (`src/renderer/scene.ts`), which calls
`computeGraphLayout` + `compactLanes` (`src/utils/graphLayout.ts`) to assign each
commit a lane (x) and topological level (y), then emits a `Scene` of `SceneNode`s
and `SceneEdge`s in **world coordinates** (`NODE_PITCH_X/Y` constants in
`scene.ts`). Keeping layout pure + in a worker is why it scales to 50k commits
without blocking the UI — preserve that boundary (no DOM/React in the worker path).

## 3. Render — `src/renderer/` + `TreeCanvas`

`TreeCanvas` (`src/components/TreeCanvas.tsx`) owns the `<canvas>`, the camera, all
pointer/wheel input, and a dirty-redraw RAF loop. It calls `drawScene`
(`renderer/draw.ts`). See **`.steering/rendering.md`** for the performance model.

## State & data flow

- **`App.tsx`** is the root: multi-repo **tabs**, search/branch/author/date
  **filters**, URL state, and which side panels are open. The *filtered* commit
  set flows down; filtering happens here, not in the renderer.
- **`GitVisualization.tsx`** is the bridge between repo data and the canvas. It
  owns the worker, the `Scene`, the selected/focused/hovered commit, and lookup
  maps (`commitMap`, `parents`, `children`, lineage `pathCache`). Camera lives in
  a `ref` (`cameraRef`) — mutated imperatively, never in React state, to avoid
  re-renders on every pan/zoom frame. Parent→child imperative actions (centerOn,
  fit, panTo) are exposed via `ref` callbacks set inside `TreeCanvas`.
- **URL state** (`utils/urlState.ts`) encodes filters + selected commit so views
  are shareable/deep-linkable; `initialCommitOid` restores selection once on load.

## Core types — `src/types/git.ts`, `src/renderer/types.ts`

`GitCommit/Branch/Tag/Repository` are the loader's output. `Scene/SceneNode/`
`SceneEdge/Camera` are the renderer's input. The worker boundary is
`LayoutRequest`/`LayoutResponse`. Coordinates are **world space**; `Camera.zoom`
is pixels per world unit.

## Testing seam

`vitest` runs in a **node** env (no DOM). Pure modules — `renderer/` (layout,
scene, camera, spatialIndex, pathWalk, …) and `utils/` — have colocated `.test.ts`
and are tested directly. Components are largely untested by design, so keep logic
out of them and in the pure modules.
