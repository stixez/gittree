# Contributing to GitTree

Conventions and setup for working on GitTree.

> GitTree is a **read-only** visualization tool. Write operations (commit, push, pull) are out of scope.

---

## Development

```bash
npm install
npm run dev        # dev server at http://localhost:3000
npm run test       # unit tests (Vitest)
npm run build      # verify production build
```

### Project structure

```
src/
  components/     React components
  hooks/          Custom hooks
  renderer/       Canvas 2D renderer + layout
  services/       Business logic (git, storage)
  types/          TypeScript interfaces
  utils/          Helper functions
```

---

## Code Style

- **TypeScript** — use proper types, avoid `any`, export reusable interfaces.
- **React** — functional components with hooks; `useMemo`/`useCallback` where it matters.
- **Styling** — Tailwind CSS utilities, dark-mode-first with the `slate` palette.

### Naming

| Type | Convention | Example |
|---|---|---|
| Components | PascalCase | `CommitNode.tsx` |
| Hooks | camelCase with `use` | `useKeyboard.ts` |
| Services | camelCase | `gitService.ts` |
| Types | PascalCase | `GitCommit` |

---

## Commit Messages

Follow [Conventional Commits](https://www.conventionalcommits.org/): `<type>: <subject>`.

| Type | Purpose |
|---|---|
| `feat` | New feature |
| `fix` | Bug fix |
| `docs` | Documentation |
| `refactor` | Code restructuring |
| `perf` | Performance improvement |
| `chore` | Maintenance |

Imperative mood, lowercase, no trailing period, under 72 characters.

---

## Debugging

| Problem | Solution |
|---|---|
| "File System Access API not supported" | Use Chrome 102+ or Edge 102+ |
| Clone fails with CORS error | CORS proxy may be down; check the console |
| Repository doesn't load | Verify a `.git` directory exists at the selected folder root |

Useful DevTools panels: Console (errors), Network (CORS), Application → Storage (OPFS).
