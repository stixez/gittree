# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

GitTree is a browser-only, read-only git history visualizer. It reads a repo with
isomorphic-git, computes layout in a Web Worker, and paints the graph on a custom
Canvas 2D renderer. Nothing leaves the browser. Write operations (commit/push/pull)
are out of scope by design.

## Commands

```bash
npm run dev          # dev server at http://localhost:3000
npm run build        # tsc typecheck + vite production build
npm run lint         # eslint, zero-warnings (--max-warnings 0)
npm run test         # vitest run (one-shot)
npm run test:watch   # vitest watch
npx vitest run src/renderer/__tests__/scene.test.ts   # single test file
```

Tests run in a `node` environment (no jsdom) — keep pure logic out of components
so it stays unit-testable; the renderer and layout are deliberately separated from
React for this reason. The build will fail on unused locals/params (`tsconfig`
`noUnused*`) and lint fails on any warning.

## Steering

Read the relevant file before working in that area — these cover the things that
require reading several files to understand:

- **`.steering/architecture.md`** — the load → layout (worker) → scene → render
  pipeline, the core data types, and where state lives. Read this first for any
  non-trivial change.
- **`.steering/rendering.md`** — the Canvas 2D renderer and its performance model
  (culling, LOD, glow-sprite cache, dirty-redraw). Read before touching `renderer/`.
- **`DESIGN.md`** — visual design system (colors, type, components, a11y). Read
  before any UI change; follow its pre-delivery checklist.
- **`CONTRIBUTING.md`** — code style, naming, and Conventional Commits format.
