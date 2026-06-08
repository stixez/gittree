import * as git from 'isomorphic-git'
import http from 'isomorphic-git/http/web'
import { GitCommit, GitBranch, GitTag, GitRepository } from '../types/git'
import { historyTruncated } from '../utils/partialLoad'
import { splitPath, resolvePathOid, type TreeEntry } from '../utils/treePath'

export interface FileChange {
  path: string
  type: 'added' | 'modified' | 'deleted'
  additions?: number
  deletions?: number
}

/**
 * Validate that a directory handle points to a git repository root.
 * Throws a descriptive error if .git/HEAD is not accessible.
 */
async function validateGitRepo(dirHandle: FileSystemDirectoryHandle): Promise<void> {
  try {
    const gitDir = await dirHandle.getDirectoryHandle('.git')
    await gitDir.getFileHandle('HEAD')
  } catch (err: any) {
    const isNotFound = err?.name === 'NotFoundError' || err?.code === 'ENOENT'
    const isNotAllowed = err?.name === 'NotAllowedError' || err?.name === 'SecurityError'
    if (isNotAllowed) {
      throw new Error(
        'Browser blocked access to the .git directory. ' +
        'Some browsers restrict access to hidden directories (starting with ".").' +
        'Try using the Remote Clone feature instead.'
      )
    }
    if (isNotFound) {
      throw new Error(
        'No .git directory found. Please select the root folder of a git repository ' +
        '(the folder that directly contains the .git directory).'
      )
    }
    throw new Error(`Cannot access .git directory: ${err?.message || err}`)
  }
}

export interface LoadProgress {
  phase: string
  detail?: string
  current: number
  total: number
}

export interface LoadOptions {
  onProgress?: (progress: LoadProgress) => void
  onPartialResult?: (repo: GitRepository) => void
  signal?: AbortSignal
  /** Walk the full history (no depth caps) and every branch deeply. */
  full?: boolean
}

/** Depth caps for a normal (fast) load. `full` mode removes them. */
const MAIN_DEPTH = 300
const BRANCH_DEPTH = 30

/**
 * Parse a local git repository
 * @param dirHandle - Directory handle from File System Access API
 */
export async function parseLocalRepository(
  dirHandle: FileSystemDirectoryHandle,
  opts?: LoadOptions,
): Promise<GitRepository> {
  const dir = '/'
  const { onProgress, signal } = opts || {}

  await validateGitRepo(dirHandle)

  // One FS instance (so its read + directory-handle caches are shared across
  // every stage) and one isomorphic-git `cache` object (so pack indices are
  // parsed once instead of on every object read) for the whole load.
  const fs = createFS(dirHandle)
  const cache = {}

  onProgress?.({ phase: 'Discovering branches', current: 0, total: 4 })
  if (signal?.aborted) throw new DOMException('Aborted', 'AbortError')

  const { commits, isPartial } = await getCommits(fs, dir, cache, opts)

  onProgress?.({ phase: 'Loading branches', current: 2, total: 4 })
  if (signal?.aborted) throw new DOMException('Aborted', 'AbortError')
  const branches = await getBranches(fs, dir)

  onProgress?.({ phase: 'Loading tags', current: 3, total: 4 })
  if (signal?.aborted) throw new DOMException('Aborted', 'AbortError')
  const tags = await getTags(fs, dir)

  onProgress?.({ phase: 'Resolving HEAD', current: 4, total: 4 })
  const head = await getHead(fs, dir)

  return { commits, branches, tags, head, isPartial }
}

/** Does this repo have a `.git/shallow` file (i.e. is it a shallow clone)? */
async function isShallowRepo(fs: any): Promise<boolean> {
  try {
    await fs.promises.stat('/.git/shallow')
    return true
  } catch {
    return false
  }
}

/**
 * Re-load a repository at full depth. If the on-disk repo is shallow, first
 * fetch over the network to deepen it; otherwise just re-parse what's on disk
 * without the depth caps.
 */
export async function loadFullRepository(
  dirHandle: FileSystemDirectoryHandle,
  opts?: LoadOptions,
): Promise<GitRepository> {
  const { onProgress, signal } = opts || {}
  const fs = createFS(dirHandle)

  if (await isShallowRepo(fs)) {
    // Note: isomorphic-git's fetch takes no AbortSignal, so cancel only takes
    // effect after this network call returns (its result is then discarded).
    onProgress?.({ phase: 'Fetching full history', detail: 'downloading more commits…', current: 0, total: 0 })
    try {
      await git.fetch({
        fs,
        http,
        cache: {},
        dir: '/',
        corsProxy: 'https://cors.isomorphic-git.org',
        remote: 'origin',
        singleBranch: false,
        tags: true,
        depth: 1_000_000, // effectively unshallow
        onProgress: (e) => onProgress?.({ phase: 'Fetching full history', detail: e.phase, current: e.loaded, total: e.total }),
      })
    } catch (err) {
      console.warn('[gitService] Deepening fetch failed; falling back to on-disk re-parse:', err)
      // Fall through to a local deep re-parse with whatever is on disk.
    }
    if (signal?.aborted) throw new DOMException('Aborted', 'AbortError')
  }

  return parseLocalRepository(dirHandle, { ...opts, full: true })
}

/**
 * Get all commits from every branch (local + remote) in the repository.
 * Walking only HEAD misses feature-branch commits and produces a linear graph.
 */
async function getCommits(fs: any, dir: string, cache: object, opts?: LoadOptions): Promise<{ commits: GitCommit[]; isPartial: boolean }> {
  const { onProgress, onPartialResult, signal, full } = opts || {}
  const mainDepth = full ? undefined : MAIN_DEPTH
  const branchDepth = full ? undefined : BRANCH_DEPTH

  // Collect every ref we want to walk: local branches + remote tracking branches
  const refs: string[] = []
  try {
    const local = await git.listBranches({ fs, dir })
    refs.push(...local.map(b => `refs/heads/${b}`))
  } catch (err) {
    console.warn('[gitService] Failed to list local branches:', err)
  }
  try {
    const remote = await git.listBranches({ fs, dir, remote: 'origin' })
    refs.push(...remote.map(b => `refs/remotes/origin/${b}`))
  } catch (err) {
    console.warn('[gitService] Failed to list remote branches:', err)
  }

  // Always include HEAD as fallback
  refs.push('HEAD')

  // Yield to let React paint progress updates between async steps
  const yieldToUI = () => new Promise<void>(r => setTimeout(r, 0))

  // Step 1: Resolve refs to OIDs in small batches so progress updates show.
  onProgress?.({ phase: 'Resolving branches', detail: `0 / ${refs.length}`, current: 0, total: refs.length })
  await yieldToUI()

  const tipToRefs = new Map<string, string>() // oid → first ref name
  const RESOLVE_BATCH = 50
  for (let i = 0; i < refs.length; i += RESOLVE_BATCH) {
    if (signal?.aborted) throw new DOMException('Aborted', 'AbortError')
    const batch = refs.slice(i, i + RESOLVE_BATCH)
    const results = await Promise.allSettled(
      batch.map(async (ref) => {
        const oid = await git.resolveRef({ fs, dir, ref })
        return { ref, oid }
      })
    )
    for (const r of results) {
      if (r.status !== 'fulfilled') continue
      if (!tipToRefs.has(r.value.oid)) {
        tipToRefs.set(r.value.oid, r.value.ref)
      }
    }
    onProgress?.({
      phase: 'Resolving branches',
      detail: `${Math.min(i + RESOLVE_BATCH, refs.length)} / ${refs.length} — ${tipToRefs.size} unique`,
      current: Math.min(i + RESOLVE_BATCH, refs.length),
      total: refs.length,
    })
    await yieldToUI()
  }

  const uniqueTips = Array.from(tipToRefs.entries()) // [oid, ref][]

  // Step 2: Sort so main/development branches come first (walk them deeper).
  const mainPatterns = ['refs/heads/main', 'refs/heads/master', 'refs/heads/development', 'refs/heads/develop', 'HEAD']
  uniqueTips.sort((a, b) => {
    const aMain = mainPatterns.includes(a[1]) ? 0 : 1
    const bMain = mainPatterns.includes(b[1]) ? 0 : 1
    return aMain - bMain
  })

  onProgress?.({
    phase: 'Walking history',
    detail: `0 / ${uniqueTips.length} branches (${refs.length - uniqueTips.length} duplicates skipped)`,
    current: 0,
    total: uniqueTips.length,
  })
  await yieldToUI()

  const seen = new Map<string, GitCommit>()

  const addLogEntries = (results: PromiseSettledResult<any>[]) => {
    for (const result of results) {
      if (result.status !== 'fulfilled') continue
      for (const entry of result.value) {
        if (seen.has(entry.oid)) continue
        seen.set(entry.oid, {
          oid: entry.oid,
          message: entry.commit.message,
          author: {
            name: entry.commit.author.name,
            email: entry.commit.author.email,
            timestamp: entry.commit.author.timestamp,
            timezoneOffset: entry.commit.author.timezoneOffset,
          },
          committer: {
            name: entry.commit.committer.name,
            email: entry.commit.committer.email,
            timestamp: entry.commit.committer.timestamp,
            timezoneOffset: entry.commit.committer.timezoneOffset,
          },
          parents: entry.commit.parent,
          tree: entry.commit.tree,
        })
      }
    }
  }

  // Step 3: Walk main branch FIRST, alone, so progress shows immediately.
  let tipsWalked = 0
  let mainWalkCount = 0
  if (uniqueTips.length > 0) {
    const [, mainRef] = uniqueTips[0]
    const mainResult = await Promise.allSettled([git.log({ fs, dir, ref: mainRef, depth: mainDepth, cache })])
    if (mainResult[0].status === 'fulfilled') mainWalkCount = mainResult[0].value.length
    addLogEntries(mainResult)
    tipsWalked = 1
    onProgress?.({
      phase: 'Walking history',
      detail: `${tipsWalked} / ${uniqueTips.length} branches — ${seen.size} commits`,
      current: tipsWalked,
      total: uniqueTips.length,
    })
    await yieldToUI()
  }

  // Fire partial result after main branch so graph appears immediately
  if (onPartialResult && seen.size > 0) {
    const partialCommits = Array.from(seen.values()).sort((a, b) => b.author.timestamp - a.author.timestamp)
    const visibleOids = new Set(partialCommits.map(c => c.oid))
    const safeCommits = partialCommits.map(c => ({
      ...c,
      parents: c.parents.filter(p => visibleOids.has(p)),
    }))
    onPartialResult({ commits: safeCommits, branches: [], tags: [], head: '' })
  }

  // Step 4: Walk remaining tips in small batches with shallow depth.
  // Shared history is already covered by the main branch walk above.
  const WALK_BATCH = 20
  for (let i = 1; i < uniqueTips.length; i += WALK_BATCH) {
    if (signal?.aborted) throw new DOMException('Aborted', 'AbortError')
    const batch = uniqueTips.slice(i, i + WALK_BATCH)
    const results = await Promise.allSettled(
      batch.map(([, ref]) => git.log({ fs, dir, ref, depth: branchDepth, cache }))
    )
    addLogEntries(results)
    tipsWalked += batch.length
    onProgress?.({
      phase: 'Walking history',
      detail: `${tipsWalked} / ${uniqueTips.length} branches — ${seen.size} commits`,
      current: tipsWalked,
      total: uniqueTips.length,
    })
    await yieldToUI()
  }

  if (seen.size === 0) {
    throw new Error('No commits found. The repository may be empty or the clone may have failed.')
  }

  onProgress?.({ phase: 'Building graph', detail: `${seen.size} commits`, current: refs.length, total: refs.length })

  const sorted = Array.from(seen.values()).sort((a, b) => b.author.timestamp - a.author.timestamp)

  // Remove parent references that point outside our visible set so edges don't dangle
  const visibleOids = new Set(sorted.map(c => c.oid))
  for (const commit of sorted) {
    commit.parents = commit.parents.filter(p => visibleOids.has(p))
  }

  // Honest "this is a subset" signal: shallow clone, or the main walk hit its cap.
  const shallowExists = await isShallowRepo(fs)
  const isPartial = historyTruncated(mainWalkCount, mainDepth ?? Infinity, shallowExists)

  return { commits: sorted, isPartial }
}

/**
 * Get all branches
 */
async function getBranches(fs: any, dir: string): Promise<GitBranch[]> {
  const branches: GitBranch[] = []

  // Local branches — resolve in parallel
  try {
    const local = await git.listBranches({ fs, dir })
    const localResults = await Promise.allSettled(
      local.map(name =>
        git.resolveRef({ fs, dir, ref: `refs/heads/${name}` }).then(oid => ({ name, oid }))
      )
    )
    for (const r of localResults) {
      if (r.status === 'fulfilled') branches.push(r.value)
    }
  } catch { /* no local branches */ }

  // Remote tracking branches — resolve in parallel
  try {
    const localNames = new Set(branches.map(b => b.name))
    const remote = await git.listBranches({ fs, dir, remote: 'origin' })
    const filtered = remote.filter(name => !localNames.has(name))

    const remoteResults = await Promise.allSettled(
      filtered.map(name =>
        git.resolveRef({ fs, dir, ref: `refs/remotes/origin/${name}` }).then(oid => ({ name: `origin/${name}`, oid }))
      )
    )
    for (const r of remoteResults) {
      if (r.status === 'fulfilled') branches.push(r.value)
    }
  } catch { /* no remote branches */ }

  return branches
}

/**
 * Get all tags
 */
async function getTags(fs: any, dir: string): Promise<GitTag[]> {
  try {
    const tagNames = await git.listTags({ fs, dir })

    // Resolve all tags in parallel instead of sequentially
    const results = await Promise.allSettled(
      tagNames.map(name =>
        git.resolveRef({ fs, dir, ref: `refs/tags/${name}` }).then(oid => ({ name, oid }))
      )
    )

    return results
      .filter((r): r is PromiseFulfilledResult<GitTag> => r.status === 'fulfilled')
      .map(r => r.value)
  } catch (error) {
    console.error('Error fetching tags:', error)
    return []
  }
}

/**
 * Get current HEAD
 */
async function getHead(fs: any, dir: string): Promise<string> {
  try {
    const head = await git.resolveRef({
      fs,
      dir,
      ref: 'HEAD',
    })

    return head
  } catch (error) {
    console.error('Error fetching HEAD:', error)
    return ''
  }
}

/**
 * Create a filesystem abstraction for isomorphic-git
 * This is a simplified version - in production, you'd want a more robust implementation
 */
export function createFS(dirHandle: FileSystemDirectoryHandle): any {
  // Cache .git/objects/ reads — git objects are immutable (content-addressed by SHA)
  const readCache = new Map<string, Uint8Array | string>()

  // Cache resolved directory handles by path prefix. The File System Access API
  // makes getDirectoryHandle() an async call per segment, so without this every
  // object read re-walks `.git/objects/xx/…` from the root. Only successful
  // lookups are cached, and the .git tree is stable during a read-only load, so
  // this is safe (newly created dirs simply aren't cached yet).
  const dirCache = new Map<string, FileSystemDirectoryHandle>()
  const getDir = async (segments: string[]): Promise<FileSystemDirectoryHandle> => {
    let handle: FileSystemDirectoryHandle = dirHandle
    let prefix = ''
    for (const seg of segments) {
      prefix = prefix ? `${prefix}/${seg}` : seg
      const cached = dirCache.get(prefix)
      if (cached) { handle = cached; continue }
      handle = await handle.getDirectoryHandle(seg)
      dirCache.set(prefix, handle)
    }
    return handle
  }

  const resolvePath = async (filepath: string) => {
    const parts = filepath.replace(/^\//, '').split('/').filter(Boolean)
    if (parts.length === 0) return dirHandle

    const handle = await getDir(parts.slice(0, -1))
    const last = parts[parts.length - 1]
    try {
      return await handle.getFileHandle(last)
    } catch {
      return await handle.getDirectoryHandle(last)
    }
  }

  const makeStatResult = (handle: FileSystemDirectoryHandle | FileSystemFileHandle) => ({
    isFile: () => handle.kind === 'file',
    isDirectory: () => handle.kind === 'directory',
    isSymbolicLink: () => false,
    size: 0,
    ctimeMs: 0,
    mtimeMs: 0,
    mode: handle.kind === 'directory' ? 0o040755 : 0o100644,
    uid: 0,
    gid: 0,
    ino: 0,
    dev: 0,
  })

  const toEnoent = (filepath: string, err: any): never => {
    // Translate FSAA NotFoundError / TypeMismatchError to ENOENT so that
    // isomorphic-git's FileSystem.exists() returns false instead of rethrowing
    if (err?.name === 'NotFoundError' || err?.name === 'TypeMismatchError') {
      const e: any = new Error(`ENOENT: no such file or directory, stat '${filepath}'`)
      e.code = 'ENOENT'
      throw e
    }
    throw err
  }

  /** Navigate to the parent directory of a path, creating intermediaries if requested */
  const resolveParent = async (filepath: string, create = false) => {
    const parts = filepath.replace(/^\//, '').split('/').filter(Boolean)
    let dir: FileSystemDirectoryHandle = dirHandle
    for (let i = 0; i < parts.length - 1; i++) {
      dir = await dir.getDirectoryHandle(parts[i], { create })
    }
    return { dir, name: parts[parts.length - 1] }
  }

  return {
    promises: {
      /**
       * readFile must honour the `encoding` option like Node.js does:
       * when encoding is 'utf8'/'utf-8' return a decoded string, otherwise
       * return Uint8Array. isomorphic-git passes { encoding: 'utf8' } for all
       * text files (HEAD, packed-refs, config, shallow, …) and then calls string
       * methods (.trim(), .split(), .startsWith()) directly on the result.
       * Returning a Uint8Array/Buffer instead causes a silent TypeError inside
       * isomorphic-git's fs.read() wrapper → null → "Could not find HEAD."
       */
      readFile: async (filepath: string, opts?: any) => {
        // isomorphic-git calls readFile() with no args to detect promise support;
        // return a rejected promise so it correctly identifies this as promise-based fs
        if (!filepath) throw new Error('No filepath provided')

        const encoding = typeof opts === 'string' ? opts : opts?.encoding
        const isGitObject = filepath.includes('.git/objects/')

        // Return cached git objects (immutable by SHA)
        if (isGitObject) {
          const cacheKey = encoding ? `${filepath}:${encoding}` : filepath
          const cached = readCache.get(cacheKey)
          if (cached !== undefined) return cached
        }

        try {
          const handle = await resolvePath(filepath)
          if (handle.kind !== 'file') throw new Error(`Not a file: ${filepath}`)
          const file = await (handle as FileSystemFileHandle).getFile()
          const bytes = new Uint8Array(await file.arrayBuffer())
          if (encoding === 'utf8' || encoding === 'utf-8') {
            const text = new TextDecoder('utf-8').decode(bytes)
            if (isGitObject) readCache.set(`${filepath}:${encoding}`, text)
            return text
          }
          if (isGitObject) readCache.set(filepath, bytes)
          return bytes
        } catch (err: any) {
          // NotFoundError is expected for loose object lookups (pack file fallback)
          if (err?.name !== 'NotFoundError') {
            console.error(`[gitService] readFile failed: "${filepath}"`, err)
          }
          throw err
        }
      },

      readdir: async (filepath: string) => {
        const parts = filepath.replace(/^\//, '').split('/').filter(Boolean)
        const handle = await getDir(parts)
        const entries: string[] = []
        // @ts-expect-error - handle.values() async iterator isn't in the lib types yet
        for await (const entry of handle.values()) {
          entries.push(entry.name)
        }
        return entries
      },

      stat: async (filepath: string) => {
        try {
          const handle = await resolvePath(filepath)
          return makeStatResult(handle)
        } catch (err) {
          toEnoent(filepath, err)
        }
      },

      lstat: async (filepath: string) => {
        // No symlinks in File System Access API — lstat is same as stat
        try {
          const handle = await resolvePath(filepath)
          return makeStatResult(handle)
        } catch (err) {
          toEnoent(filepath, err)
        }
      },

      writeFile: async (filepath: string, data: Uint8Array | string) => {
        const { dir, name } = await resolveParent(filepath, true)
        const fileHandle = await dir.getFileHandle(name, { create: true })
        const writable = await fileHandle.createWritable()
        const bytes = typeof data === 'string' ? new TextEncoder().encode(data) : data
        await writable.write(new Blob([bytes as BlobPart]))
        await writable.close()
      },

      mkdir: async (filepath: string) => {
        const { dir, name } = await resolveParent(filepath, true)
        await dir.getDirectoryHandle(name, { create: true })
      },

      rmdir: async (filepath: string) => {
        const { dir, name } = await resolveParent(filepath)
        await dir.removeEntry(name, { recursive: true })
      },

      unlink: async (filepath: string) => {
        const { dir, name } = await resolveParent(filepath)
        await dir.removeEntry(name)
      },

      symlink: async () => { /* no symlinks in browser */ },
      readlink: async () => { throw new Error('readlink not supported') },
      chmod: async () => { /* no-op in browser */ },
    },
  }
}

/**
 * Get changed files for a commit
 */
export async function getChangedFiles(
  dirHandle: FileSystemDirectoryHandle,
  commitOid: string
): Promise<FileChange[]> {
  const dir = '/'
  const fs = createFS(dirHandle)
  
  try {
    // Read the commit
    const commit = await git.readCommit({ fs, dir, oid: commitOid })
    
    // Get parent commit (for comparison)
    const parentOid = commit.commit.parent[0]
    if (!parentOid) {
      // Initial commit - all files are added
      const tree = commit.commit.tree
      const files = await listTreeFiles(fs, dir, tree)
      return files.map(path => ({ path, type: 'added' as const }))
    }
    
    // Compare with parent
    const changes: FileChange[] = []
    
    // Use git.walk to compare trees
    await git.walk({
      fs,
      dir,
      trees: [git.TREE({ ref: commitOid }), git.TREE({ ref: parentOid })],
      map: async function(filepath, [current, parent]) {
        // Skip root directory
        if (filepath === '.') return

        // Only report file (blob) changes. Directories (trees) get a new oid
        // whenever their contents change, but they aren't files — reporting them
        // lets the UI try to readBlob() a tree, which throws
        // "anticipated to be a blob but it is a tree".
        const currentType = current ? await current.type() : undefined
        const parentType = parent ? await parent.type() : undefined
        if (currentType === 'tree' || parentType === 'tree') return

        const currentOid = await current?.oid()
        const parentOid = await parent?.oid()

        if (currentOid && !parentOid) {
          changes.push({ path: filepath, type: 'added' })
        } else if (!currentOid && parentOid) {
          changes.push({ path: filepath, type: 'deleted' })
        } else if (currentOid !== parentOid) {
          changes.push({ path: filepath, type: 'modified' })
        }
      },
    })
    
    return changes
  } catch (error) {
    console.error('Error getting changed files:', error)
    return []
  }
}

export interface PathFilterProgress {
  current: number
  total: number
}

/**
 * Find commits that touched `path` (a file or directory prefix). A commit
 * "touched" the path when the oid of the entry at that path differs from the
 * same entry in its FIRST parent (covers add/delete/modify; a directory compares
 * its subtree oid, so any change underneath counts). Initial commits match if
 * the path exists. Progressive + abortable, like the repo loader.
 */
export async function findCommitsTouchingPath(
  dirHandle: FileSystemDirectoryHandle,
  commits: { oid: string; parents: string[]; tree?: string }[],
  path: string,
  opts: { onProgress?: (p: PathFilterProgress) => void; signal?: AbortSignal } = {},
): Promise<Set<string>> {
  const { onProgress, signal } = opts
  const segments = splitPath(path)
  const result = new Set<string>()
  if (segments.length === 0) return result

  const dir = '/'
  const fs = createFS(dirHandle)
  // Shared isomorphic-git cache: without it, every readTree/readCommit re-parses
  // the packfile index from scratch — the single biggest cost. Same pattern the
  // loader uses for git.log.
  const cache = {}
  const yieldToUI = () => new Promise<void>((r) => setTimeout(r, 0))

  // Most commits' root tree oid is already known from the loader (git.log), so we
  // can skip a readCommit per commit. Fall back to readCommit only for parents
  // that aren't in the loaded set (e.g. a shallow boundary).
  const treeByOid = new Map<string, string>()
  for (const c of commits) if (c.tree) treeByOid.set(c.oid, c.tree)

  // Content-addressed cache: trees are shared heavily across history, so caching
  // by oid collapses most of the work.
  const treeCache = new Map<string, TreeEntry[]>()
  const readTree = async (oid: string): Promise<TreeEntry[]> => {
    const hit = treeCache.get(oid)
    if (hit) return hit
    const { tree } = await git.readTree({ fs, dir, oid, cache })
    const entries: TreeEntry[] = tree.map((e) => ({ path: e.path, oid: e.oid, type: e.type as TreeEntry['type'] }))
    treeCache.set(oid, entries)
    return entries
  }

  const commitTreeOid = new Map<string, string | null>()
  const treeOidOf = async (commitOid: string): Promise<string | null> => {
    const known = treeByOid.get(commitOid)
    if (known) return known
    const hit = commitTreeOid.get(commitOid)
    if (hit !== undefined) return hit
    try {
      const { commit } = await git.readCommit({ fs, dir, oid: commitOid, cache })
      commitTreeOid.set(commitOid, commit.tree)
      return commit.tree
    } catch {
      commitTreeOid.set(commitOid, null) // not on disk (shallow/partial)
      return null
    }
  }

  // Memoize per-commit path resolution: each commit is resolved once as "cur"
  // and again as its children's "par" — compute it a single time.
  const pathOidCache = new Map<string, string | undefined>()
  const pathOidAt = async (commitOid: string): Promise<string | undefined> => {
    if (pathOidCache.has(commitOid)) return pathOidCache.get(commitOid)
    const treeOid = await treeOidOf(commitOid)
    const oid = treeOid ? await resolvePathOid(readTree, treeOid, segments) : undefined
    pathOidCache.set(commitOid, oid)
    return oid
  }

  for (let i = 0; i < commits.length; i++) {
    if (signal?.aborted) throw new DOMException('Aborted', 'AbortError')
    const c = commits[i]
    const cur = await pathOidAt(c.oid)
    const parent = c.parents[0]
    const par = parent ? await pathOidAt(parent) : undefined
    if (cur !== par) result.add(c.oid)
    if (i % 200 === 0) {
      onProgress?.({ current: i, total: commits.length })
      await yieldToUI()
    }
  }
  onProgress?.({ current: commits.length, total: commits.length })
  return result
}

/**
 * List all files in a tree
 */
async function listTreeFiles(fs: any, dir: string, treeOid: string): Promise<string[]> {
  const files: string[] = []
  
  async function walkTree(oid: string, prefix: string = '') {
    const { tree } = await git.readTree({ fs, dir, oid })
    
    for (const entry of tree) {
      const path = prefix ? `${prefix}/${entry.path}` : entry.path
      
      if (entry.type === 'tree') {
        await walkTree(entry.oid, path)
      } else {
        files.push(path)
      }
    }
  }
  
  await walkTree(treeOid)
  return files
}

export interface FileDiff {
  oldText: string | null
  newText: string | null
  binary: boolean
}

/** Heuristic: a NUL byte in the first chunk means binary. */
function looksBinary(bytes: Uint8Array | null): boolean {
  if (!bytes) return false
  const n = Math.min(bytes.length, 8000)
  for (let i = 0; i < n; i++) if (bytes[i] === 0) return true
  return false
}

/**
 * Read a file's content at a commit and at its first parent, for diffing.
 * Missing on the new side = deleted; missing on the old side = added.
 */
export async function getFileDiff(
  dirHandle: FileSystemDirectoryHandle,
  commitOid: string,
  filePath: string,
): Promise<FileDiff> {
  const dir = '/'
  const fs = createFS(dirHandle)

  const commit = await git.readCommit({ fs, dir, oid: commitOid })
  const parentOid = commit.commit.parent[0]

  const readBlob = async (oid?: string): Promise<Uint8Array | null> => {
    if (!oid) return null
    try {
      const { blob } = await git.readBlob({ fs, dir, oid, filepath: filePath })
      return blob
    } catch {
      return null // file doesn't exist on that side
    }
  }

  const newBlob = await readBlob(commitOid)
  const oldBlob = await readBlob(parentOid)
  const binary = looksBinary(newBlob) || looksBinary(oldBlob)
  const decoder = new TextDecoder('utf-8')

  return {
    oldText: oldBlob ? decoder.decode(oldBlob) : null,
    newText: newBlob ? decoder.decode(newBlob) : null,
    binary,
  }
}

/**
 * Clone a remote repository
 */
export interface CloneOptions {
  /** Fetch every branch (slower). Default: only the default branch. */
  allBranches?: boolean
  /** Shallow-clone depth. Default 200. */
  depth?: number
}

export async function cloneRepository(
  url: string,
  dirHandle: FileSystemDirectoryHandle,
  onProgress?: (phase: string, loaded: number, total: number) => void,
  opts?: CloneOptions,
): Promise<void> {
  const fs = createFS(dirHandle)
  const cache = {}

  try {
    await git.clone({
      fs,
      http,
      cache,
      dir: '/',
      url,
      corsProxy: 'https://cors.isomorphic-git.org',
      depth: opts?.depth ?? 200, // Shallow clone for performance
      // Default to a single branch: fetching every branch's history through the
      // public CORS proxy is the dominant cost on large repos.
      singleBranch: !opts?.allBranches,
      onProgress: (event) => {
        if (onProgress) {
          onProgress(event.phase, event.loaded, event.total)
        }
      },
    })
  } catch (error) {
    console.error('Clone error:', error)
    throw new Error(`Failed to clone repository: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}
