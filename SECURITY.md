# Security Policy

## Your Data Stays Local

- GitTree runs **entirely in your browser** — no backend, no data collection, no analytics, no tracking.
- **Local repositories:** the File System Access API reads files directly from your disk. Nothing is uploaded or transmitted.
- **Remote repositories:** cloned via a CORS proxy (`https://cors.isomorphic-git.org`) and stored in your browser's Origin Private File System (OPFS), accessible only to you until you clear site data.

## Remote Cloning

The CORS proxy (operated by the isomorphic-git project) is required to bypass browser CORS restrictions. Public repositories only; no authentication credentials are transmitted.

- **Shared:** the repository URL and git protocol data (commits, trees, blobs).
- **Not shared:** your local files, browsing history, or any personal data.

## Storage

- **LocalStorage:** theme and compact-mode preferences, plus the list of cloned repositories (names + URLs).
- **OPFS:** cloned git repositories — sandboxed, accessible only by GitTree, and cleared when you clear site data.

## Export Warning

PNG and SVG exports contain commit data — messages, author names and emails, hashes, branch/tag names, and file paths. Review exported files before sharing them publicly.

## Best Practices

- Only open trusted repositories (GitTree reads git objects directly).
- Clone from HTTPS URLs, not the `git://` protocol.
- Clear site data after cloning private repositories.
- Keep your browser updated.

## Browser Support

- ✅ Chrome 102+ and Edge 102+ (File System Access API + OPFS)
- ❌ Firefox and Safari (no File System Access API support yet)

## Threat Model

**Protects against:** data leakage to third parties, unauthorized data collection, cross-site scripting (via Content Security Policy), and malicious git objects (read-only access).

**Does not protect against:** malicious repository contents, social engineering, browser vulnerabilities, or physical access to your machine.

---

GitTree is open source (MIT License) and privacy-first: no tracking, no cookies beyond LocalStorage preferences, no accounts, no data collection. You can verify this in DevTools — the only network request is the CORS proxy used for cloning.
