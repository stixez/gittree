<p align="center">
  <img src="https://img.shields.io/badge/license-MIT-blue" alt="License" />
  <img src="https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=white" alt="React 18" />
  <img src="https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Chrome%20102%2B%20%7C%20Edge%20102%2B-supported-brightgreen" alt="Browser Support" />
  <a href="https://buymeacoffee.com/stixe"><img src="https://img.shields.io/badge/Buy%20Me%20a%20Coffee-FFDD00?logo=buymeacoffee&logoColor=black" alt="Buy Me a Coffee" /></a>
</p>

# GitTree

**A git history visualizer that renders your repository as a dark, glowing graph.** Open a local repo or clone a public one — entirely in your browser. No install, no backend, nothing leaves your machine.

Commits are glowing nodes on a dark obsidian canvas; merges are ornate gold landmarks; the checked-out branch's ancestry lights up as a gold **highlighted path.** It reads repository data with [isomorphic-git](https://isomorphic-git.org/) and draws everything on a custom **Canvas 2D** renderer, with layout computed in a **Web Worker** so it stays smooth on repositories of any size.

---

## Quick start

```bash
git clone https://github.com/stixez/gittree.git
cd gittree
npm install
npm run dev        # http://localhost:3000
```

Then, in Chrome or Edge: click **Local Folder** to open a repo from disk, or **Clone Remote** to fetch a public URL. Zoom with the wheel, drag to pan, click a node for details.

```bash
npm run build      # production build
npm run test       # unit tests (Vitest)
```

---

## Features

| | |
|---|---|
| **Visualization** | Lane-based commit graph — pan, zoom, fullscreen, minimap. Distinct shapes for ordinary commits, significant commits, merges (gold diamonds), tags (ornate rings), and HEAD. |
| **Focus & navigate** | Click or use the keyboard (`↑↓←→` / `hjkl`) to walk history; the focused commit's ancestry glows while everything else dims. |
| **Search & filter** | Real-time search by message, author, email, or hash. Filter by branch (with ancestry) or date range. |
| **Commit details** | Metadata, changed files (add/modify/delete), and deep links to GitHub/GitLab/Bitbucket. |
| **Code explorer** | Browse files with syntax highlighting, view per-file history, download at any commit. |
| **Analytics** | Contributor stats, commits by day/hour, a 365-day activity heatmap, and a repository health score. |
| **Branch comparison** | Side-by-side diff of two branches — unique commits, merge base, divergence. |
| **Export & share** | PNG and SVG of the whole graph, plus permalink URLs that embed filter state. |
| **Tabs** | Multiple repositories open at once, drag-and-drop to open, remote clone with progress. |

---

## How it works

| Layer | Choice |
|---|---|
| UI | React 18 · TypeScript · Tailwind CSS |
| Build | Vite 5 |
| Git | isomorphic-git (in-browser git client) |
| Rendering | Custom **Canvas 2D** renderer; topological layout runs in a **Web Worker** |
| Performance | Viewport culling · level-of-detail · offscreen glow-sprite cache · redraw-on-dirty loop · progressive load |
| Storage | Origin Private File System (OPFS) for cloned repos |

Because the canvas only paints what's on screen and the layout never blocks the UI thread, the same code handles a 50-commit repo and a 50,000-commit one.

---

## Privacy

Everything runs in the browser. Local files are read in place and never uploaded; cloned repos live in the browser's sandboxed OPFS. Remote cloning routes git protocol traffic through a [CORS proxy](https://cors.isomorphic-git.org) (required by browsers) and nothing else. No analytics, accounts, or cookies. See [SECURITY.md](SECURITY.md).

---

## Browser support

Requires the **File System Access API** (Chrome/Edge 102+) to open local folders and store clones. Firefox and Safari don't support it yet.

---

## Contributing

Contributions welcome — see [CONTRIBUTING.md](CONTRIBUTING.md) for setup and conventions, and [DESIGN.md](DESIGN.md) for the visual style. GitTree is a **read-only** explorer by design; write operations (commit, push, pull) are out of scope.

## Support

If GitTree saves you time, you can support its development:

<a href="https://buymeacoffee.com/stixe"><img src="https://img.shields.io/badge/Buy%20me%20a%20coffee-FFDD00?style=for-the-badge&logo=buymeacoffee&logoColor=black" alt="Buy Me a Coffee" /></a>

## License

MIT — see [LICENSE](LICENSE).

## Acknowledgments

- [isomorphic-git](https://isomorphic-git.org/) — the in-browser git engine
