import { useState, useMemo, useCallback, useEffect, useRef } from 'react'
import './App.css'
import { GitVisualization } from './components/GitVisualization'
import { SearchBar } from './components/SearchBar'
import { Filters } from './components/Filters'
import { KeyboardHelp } from './components/KeyboardHelp'
import { Settings } from './components/Settings'
import { ExportMenu } from './components/ExportMenu'
import { EmptyState } from './components/EmptyState'
import { LandingHero } from './components/LandingHero'
import { LandingBackdrop } from './components/LandingBackdrop'
import { CommitList } from './components/CommitList'
import { CommandPalette } from './components/CommandPalette'
import { RemoteClone } from './components/RemoteClone'
import { BranchComparison } from './components/BranchComparison'
import { ContributorStats } from './components/ContributorStats'
import { CommitHeatmap } from './components/CommitHeatmap'
import { RepositoryHealth } from './components/RepositoryHealth'
import { parseLocalRepository, loadFullRepository, findCommitsTouchingPath, LoadProgress } from './services/gitService'
import { GitRepository } from './types/git'
import { useKeyboard } from './hooks/useKeyboard'
import { useDragDrop } from './hooks/useDragDrop'
import { useDebouncedValue } from './hooks/useDebouncedValue'
import { parseUrlState, updateUrlState, copyShareUrl } from './utils/urlState'
import { uniqueAuthors } from './utils/authors'
import { buildRefItems, buildCommitItems, buildActions } from './utils/paletteItems'
import {
  GitBranch,
  Folder,
  Settings2,
  Keyboard,
  Github,
  BarChart2,
  CalendarDays,
  HeartPulse,
  Upload,
  Link,
  Check,
  GitMerge,
  X,
  Plus,
  History,
  ArrowLeft,
} from 'lucide-react'

interface RepositoryTab {
  id: string
  name: string
  repository: GitRepository
  dirHandle: FileSystemDirectoryHandle
  remoteUrl?: string
}

function App() {
  const [tabs, setTabs] = useState<RepositoryTab[]>([])
  const [activeTabId, setActiveTabId] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [loadProgress, setLoadProgress] = useState<LoadProgress | null>(null)
  const abortRef = useRef<AbortController | null>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedBranch, setSelectedBranch] = useState('all')
  const [selectedAuthor, setSelectedAuthor] = useState('all')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [showKeyboardHelp, setShowKeyboardHelp] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [showExportMenu, setShowExportMenu] = useState(false)
  const [showRemoteClone, setShowRemoteClone] = useState(false)
  const [showBranchComparison, setShowBranchComparison] = useState(false)
  const [showContributorStats, setShowContributorStats] = useState(false)
  const [showCommitHeatmap, setShowCommitHeatmap] = useState(false)
  const [showRepositoryHealth, setShowRepositoryHealth] = useState(false)
  const [shareLinkCopied, setShareLinkCopied] = useState(false)
  const [selectedCommitOidForUrl, setSelectedCommitOidForUrl] = useState<string | undefined>(undefined)
  // Bumped (new object identity) each time something outside the graph asks to
  // select a commit — e.g. clicking a row in the commit list below.
  const [selectRequest, setSelectRequest] = useState<{ oid: string } | null>(null)
  const [paletteOpen, setPaletteOpen] = useState(false)
  // Path filter: async (commits touching a file/dir prefix), computed off the
  // synchronous filter path. See the compute effect below. The input updates
  // pathFilter on every keystroke, but the (expensive, full-history) scan keys
  // off a debounced copy so it only runs once the user pauses typing.
  const [pathFilter, setPathFilter] = useState('')
  const debouncedPathFilter = useDebouncedValue(pathFilter, 300)
  const [pathMatchOids, setPathMatchOids] = useState<Set<string> | null>(null)
  const [pathStatus, setPathStatus] = useState<{ computing: boolean; current: number; total: number }>({ computing: false, current: 0, total: 0 })
  const pathAbortRef = useRef<AbortController | null>(null)
  const pathCacheRef = useRef<Map<string, Set<string>>>(new Map())

  const activeTab = tabs.find(t => t.id === activeTabId)
  const repository = activeTab?.repository || null
  const dirHandle = activeTab?.dirHandle || null

  useEffect(() => {
    const urlState = parseUrlState()
    if (urlState.search) setSearchQuery(urlState.search)
    if (urlState.branch) setSelectedBranch(urlState.branch)
    if (urlState.author) setSelectedAuthor(urlState.author)
    if (urlState.dateFrom) setDateFrom(urlState.dateFrom)
    if (urlState.dateTo) setDateTo(urlState.dateTo)
    if (urlState.commit) setSelectedCommitOidForUrl(urlState.commit)
    if (urlState.path) setPathFilter(urlState.path)
  }, [])

  useEffect(() => {
    if (tabs.length === 0) return
    updateUrlState({
      repo: activeTab?.name,
      search: searchQuery || undefined,
      branch: selectedBranch !== 'all' ? selectedBranch : undefined,
      author: selectedAuthor !== 'all' ? selectedAuthor : undefined,
      dateFrom: dateFrom || undefined,
      dateTo: dateTo || undefined,
      commit: selectedCommitOidForUrl || undefined,
      path: pathFilter || undefined,
    })
  }, [searchQuery, selectedBranch, selectedAuthor, dateFrom, dateTo, activeTab?.name, tabs.length, selectedCommitOidForUrl, pathFilter])

  const handleCancelLoad = useCallback(() => {
    abortRef.current?.abort()
  }, [])

  const handleOpenRepository = useCallback(async (handle: FileSystemDirectoryHandle, name?: string, remoteUrl?: string) => {
    let earlyTabId: string | null = null
    try {
      abortRef.current?.abort()
      const controller = new AbortController()
      abortRef.current = controller
      setLoading(true)
      setLoadProgress(null)
      setError(null)

      const tabName = name || handle.name || 'Repository'

      const repo = await parseLocalRepository(handle, {
        onProgress: (progress) => setLoadProgress(progress),
        signal: controller.signal,
        onPartialResult: (partialRepo) => {
          // Create tab early so graph renders behind the loading overlay
          if (!earlyTabId) {
            earlyTabId = Date.now().toString()
            const newTab: RepositoryTab = {
              id: earlyTabId,
              name: tabName,
              repository: partialRepo,
              dirHandle: handle,
              remoteUrl,
            }
            setTabs(prev => [...prev, newTab])
            setActiveTabId(earlyTabId)
          } else {
            // Update existing tab with more complete data
            const id = earlyTabId
            setTabs(prev => prev.map(t => t.id === id ? { ...t, repository: partialRepo } : t))
          }
        },
      })

      // Final update with complete repository (branches, tags, HEAD resolved)
      if (earlyTabId) {
        const id = earlyTabId
        setTabs(prev => prev.map(t => t.id === id ? { ...t, repository: repo } : t))
      } else {
        // Fallback if onPartialResult never fired
        const tabId = Date.now().toString()
        const newTab: RepositoryTab = {
          id: tabId,
          name: tabName,
          repository: repo,
          dirHandle: handle,
          remoteUrl,
        }
        setTabs(prev => [...prev, newTab])
        setActiveTabId(tabId)
      }
    } catch (err) {
      if (err instanceof Error) {
        if (err.name === 'AbortError') return
        setError(err.message)
      } else {
        setError('An unexpected error occurred')
      }
      console.error('Error opening repository:', err)
    } finally {
      setLoading(false)
      setLoadProgress(null)
    }
  }, [])

  const handleLoadFullHistory = useCallback(async () => {
    const tab = tabs.find(t => t.id === activeTabId)
    if (!tab?.dirHandle) return
    try {
      abortRef.current?.abort()
      const controller = new AbortController()
      abortRef.current = controller
      setLoading(true)
      setLoadProgress(null)
      setError(null)

      const repo = await loadFullRepository(tab.dirHandle, {
        onProgress: (progress) => setLoadProgress(progress),
        signal: controller.signal,
      })

      const id = tab.id
      setTabs(prev => prev.map(t => (t.id === id ? { ...t, repository: repo } : t)))
    } catch (err) {
      if (err instanceof Error) {
        if (err.name === 'AbortError') return
        setError(err.message)
      } else {
        setError('Failed to load full history')
      }
      console.error('Error loading full history:', err)
    } finally {
      setLoading(false)
      setLoadProgress(null)
    }
  }, [tabs, activeTabId])

  const { isDragging } = useDragDrop({
    onDrop: (handle) => handleOpenRepository(handle),
    enabled: !loading,
  })

  // Pre-lowercased searchable text per commit, built once per repository. A
  // keystroke then does a single `includes` per commit instead of re-lowercasing
  // message/name/email/oid every time. (The full oid contains its short prefix,
  // so prefix matches still work.)
  const searchIndex = useMemo(() => {
    const idx = new Map<string, string>()
    repository?.commits.forEach((c) =>
      idx.set(c.oid, `${c.message}\n${c.author.name}\n${c.author.email}\n${c.oid}`.toLowerCase())
    )
    return idx
  }, [repository])

  const matchesSearch = useCallback(
    (oid: string, query: string) => searchIndex.get(oid)?.includes(query) ?? false,
    [searchIndex]
  )

  // Branch + date filters subset the graph; search does NOT (it highlights).
  const graphRepository = useMemo(() => {
    if (!repository) return repository

    let filteredCommits = repository.commits

    if (selectedBranch !== 'all') {
      const branch = repository.branches.find(b => b.name === selectedBranch)
      if (branch) {
        const commitMap = new Map<string, typeof filteredCommits[0]>()
        repository.commits.forEach(c => commitMap.set(c.oid, c))

        const ancestorOids = new Set<string>()
        const queue = [branch.oid]
        while (queue.length > 0) {
          const oid = queue.shift()!
          if (ancestorOids.has(oid)) continue
          ancestorOids.add(oid)
          const commit = commitMap.get(oid)
          if (commit) queue.push(...commit.parents)
        }
        filteredCommits = filteredCommits.filter((commit) => ancestorOids.has(commit.oid))
      }
    }

    if (selectedAuthor !== 'all') {
      filteredCommits = filteredCommits.filter((commit) => commit.author.name === selectedAuthor)
    }

    if (dateFrom || dateTo) {
      const fromTimestamp = dateFrom ? new Date(dateFrom).getTime() / 1000 : 0
      const toTimestamp = dateTo ? new Date(dateTo + 'T23:59:59').getTime() / 1000 : Infinity
      filteredCommits = filteredCommits.filter((commit) => {
        const commitTimestamp = commit.author.timestamp
        return commitTimestamp >= fromTimestamp && commitTimestamp <= toTimestamp
      })
    }

    if (pathMatchOids) {
      filteredCommits = filteredCommits.filter((commit) => pathMatchOids.has(commit.oid))
    }

    return { ...repository, commits: filteredCommits }
  }, [repository, selectedBranch, selectedAuthor, dateFrom, dateTo, pathMatchOids])

  // Distinct author names for the author filter dropdown.
  const authors = useMemo(() => (repository ? uniqueAuthors(repository.commits) : []), [repository])

  // Search matches within the (branch/date-filtered) graph — highlighted in context.
  const highlightOids = useMemo(() => {
    if (!graphRepository || !searchQuery.trim()) return null
    const query = searchQuery.toLowerCase()
    const set = new Set<string>()
    graphRepository.commits.forEach((c) => { if (matchesSearch(c.oid, query)) set.add(c.oid) })
    return set
  }, [graphRepository, searchQuery, matchesSearch])

  // The side commit list still narrows to search matches.
  const filteredRepository = useMemo(() => {
    if (!graphRepository) return graphRepository
    if (!searchQuery.trim()) return graphRepository
    const query = searchQuery.toLowerCase()
    return { ...graphRepository, commits: graphRepository.commits.filter((c) => matchesSearch(c.oid, query)) }
  }, [graphRepository, searchQuery, matchesSearch])

  // Reset the per-path session cache when the repository changes.
  useEffect(() => { pathCacheRef.current = new Map() }, [repository])

  // Clearing the filter must feel instant — don't wait out the scan's debounce
  // window. Abort any in-flight scan and drop the match set the moment the input
  // is emptied (e.g. the ✕ button or "clear filters").
  useEffect(() => {
    if (pathFilter.trim()) return
    pathAbortRef.current?.abort()
    setPathMatchOids(null)
    setPathStatus({ computing: false, current: 0, total: 0 })
  }, [pathFilter])

  // Compute which commits touched the path filter. Async + abortable (mirrors the
  // loader); results cached per path for the session.
  useEffect(() => {
    pathAbortRef.current?.abort()
    const path = debouncedPathFilter.trim()
    if (!repository || !dirHandle || !path) {
      setPathMatchOids(null)
      setPathStatus({ computing: false, current: 0, total: 0 })
      return
    }
    const cached = pathCacheRef.current.get(path)
    if (cached) {
      setPathMatchOids(cached)
      setPathStatus({ computing: false, current: 0, total: 0 })
      return
    }

    const controller = new AbortController()
    pathAbortRef.current = controller
    setPathStatus({ computing: true, current: 0, total: repository.commits.length })
    findCommitsTouchingPath(dirHandle, repository.commits, path, {
      signal: controller.signal,
      onProgress: (p) => setPathStatus({ computing: true, current: p.current, total: p.total }),
    })
      .then((set) => {
        pathCacheRef.current.set(path, set)
        setPathMatchOids(set)
        setPathStatus({ computing: false, current: 0, total: 0 })
      })
      .catch((err) => {
        if (err instanceof Error && err.name === 'AbortError') return
        console.error('Path filter failed:', err)
        setPathMatchOids(new Set())
        setPathStatus({ computing: false, current: 0, total: 0 })
      })
    return () => controller.abort()
  }, [repository, dirHandle, debouncedPathFilter])

  const handleClearFilters = useCallback(() => {
    setSearchQuery('')
    setSelectedBranch('all')
    setSelectedAuthor('all')
    setDateFrom('')
    setDateTo('')
    setPathFilter('')
  }, [])

  const shortcuts = useMemo(() => [
    { key: '?', shift: true, callback: () => setShowKeyboardHelp(true) },
    { key: 'k', ctrl: true, callback: () => setPaletteOpen(true) },
    { key: '/', callback: () => { searchInputRef.current?.focus(); searchInputRef.current?.select() } },
    { key: 'c', callback: handleClearFilters },
  ], [handleClearFilters])
  useKeyboard(shortcuts)

  const handleCopyShareLink = async () => {
    try {
      await copyShareUrl({
        repo: activeTab?.name,
        search: searchQuery || undefined,
        branch: selectedBranch !== 'all' ? selectedBranch : undefined,
        author: selectedAuthor !== 'all' ? selectedAuthor : undefined,
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
        commit: selectedCommitOidForUrl || undefined,
        path: pathFilter || undefined,
      })
      setShareLinkCopied(true)
      setTimeout(() => setShareLinkCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy share link:', err)
    }
  }

  const handleOpenFolder = async () => {
    if (!('showDirectoryPicker' in window)) {
      setError('File System Access API is not supported in this browser. Please use Chrome, Edge, or another Chromium-based browser.')
      return
    }
    try {
      const handle = await (window as any).showDirectoryPicker({ mode: 'read' })
      await handleOpenRepository(handle)
    } catch (err) {
      if (err instanceof Error && err.name !== 'AbortError') {
        setError(err.message)
      }
    }
  }

  const handleCloseTab = (tabId: string) => {
    setTabs(prev => {
      const newTabs = prev.filter(t => t.id !== tabId)
      if (tabId === activeTabId) {
        setActiveTabId(newTabs.length > 0 ? newTabs[newTabs.length - 1].id : null)
      }
      return newTabs
    })
  }

  const handleGoHome = () => {
    setTabs([])
    setActiveTabId(null)
    setError(null)
    setSearchQuery('')
    setSelectedBranch('all')
    setDateFrom('')
    setDateTo('')
    setPathFilter('')
  }

  // Command palette items + actions (actions reuse the existing toolbar handlers).
  const refItems = useMemo(
    () => (repository ? buildRefItems(repository.branches, repository.tags) : []),
    [repository],
  )
  const commitItems = useMemo(
    () => (repository ? buildCommitItems(repository.commits) : []),
    [repository],
  )
  // Built every render (cheap) so the action handlers capture current state —
  // e.g. "Copy share link" reflects the live filters, not a stale snapshot.
  const paletteActions = buildActions(
    {
      openRepo: handleOpenFolder,
      clearFilters: handleClearFilters,
      copyShareLink: handleCopyShareLink,
      openExport: () => setShowExportMenu(true),
      openCompare: () => setShowBranchComparison(true),
      openStats: () => setShowContributorStats(true),
      openHeatmap: () => setShowCommitHeatmap(true),
      openHealth: () => setShowRepositoryHealth(true),
      openSettings: () => setShowSettings(true),
      openKeyboardHelp: () => setShowKeyboardHelp(true),
    },
    { hasRepo: !!repository, branchCount: repository?.branches.length ?? 0 },
  )

  return (
    <div className="min-h-screen bg-slate-950 dark:bg-slate-950 text-slate-100">
      {/* Full-page animated graph backdrop (landing only) */}
      {!repository && <LandingBackdrop />}

      {/* Loading Progress Overlay */}
      {loading && loadProgress && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="bg-slate-900 rounded-2xl border border-slate-800 shadow-2xl p-8 max-w-md w-full mx-4">
            <div className="text-center mb-6">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/20 mb-4">
                <GitBranch className="w-6 h-6 text-primary animate-pulse" />
              </div>
              <h3 className="text-lg font-semibold text-white">{loadProgress.phase}</h3>
              {loadProgress.detail && (
                <p className="text-sm text-slate-400 mt-1">{loadProgress.detail}</p>
              )}
            </div>
            {loadProgress.total > 0 && (
              <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-primary h-full rounded-full transition-all duration-300"
                  style={{ width: `${Math.min(100, (loadProgress.current / loadProgress.total) * 100)}%` }}
                />
              </div>
            )}
            <button
              onClick={handleCancelLoad}
              className="mt-4 px-4 py-2 text-sm text-slate-400 hover:text-white hover:bg-slate-800
                rounded-lg transition-colors border border-slate-700 cursor-pointer w-full"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Drag & Drop Overlay */}
      {isDragging && (
        <div className="fixed inset-0 bg-primary/10 backdrop-blur-sm z-50 flex items-center justify-center animate-fade-in">
          <div className="bg-slate-900 rounded-2xl shadow-2xl p-12 border-2 border-dashed border-primary">
            <div className="text-center">
              <Folder className="w-16 h-16 text-primary mx-auto mb-4" />
              <h2 className="text-2xl font-semibold text-white mb-2">
                Drop repository folder here
              </h2>
              <p className="text-slate-400">
                Release to open the git repository
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="border-b border-white/5 bg-slate-900/90 backdrop-blur-sm sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-14 compact:h-10">
            <div className="flex items-center gap-3">
              <button
                onClick={handleGoHome}
                className="flex items-center gap-2 hover:opacity-80 transition-opacity cursor-pointer"
                title="Back to home"
              >
                <GitBranch className="w-5 h-5 text-primary" />
                <span className="text-base font-semibold text-white font-sans">GitTree</span>
              </button>
              {repository ? (
                <button
                  onClick={handleGoHome}
                  className="flex items-center gap-1.5 px-2.5 py-1 text-xs text-slate-400 hover:text-white
                    bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors cursor-pointer"
                  title="Back to home"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  Home
                </button>
              ) : null}
            </div>
            <nav className="flex items-center gap-1">
              <button
                onClick={() => setShowSettings(true)}
                className="p-2 text-slate-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                title="Settings"
                aria-label="Settings"
              >
                <Settings2 className="w-4 h-4" />
              </button>
              <button
                onClick={() => setShowKeyboardHelp(true)}
                className="p-2 text-slate-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                title="Keyboard shortcuts (Shift + ?)"
                aria-label="Keyboard shortcuts"
              >
                <Keyboard className="w-4 h-4" />
              </button>
              <a
                href="https://github.com/stixez/gittree"
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 text-slate-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                aria-label="View on GitHub"
                title="View on GitHub"
              >
                <Github className="w-4 h-4" />
              </a>
            </nav>
          </div>
        </div>
      </header>

      {/* Main Content */}
      {!repository ? (
        <LandingHero
          onOpenLocal={handleOpenFolder}
          onCloneRemote={() => setShowRemoteClone(true)}
          loading={loading}
          error={error}
          onRetry={handleOpenFolder}
          onDismiss={() => setError(null)}
        />
      ) : (
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 compact:py-6">
          <div>
            {/* Tabs */}
            {tabs.length > 1 && (
              <div className="mb-4 flex items-center gap-2 overflow-x-auto">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTabId(tab.id)}
                    className={`group flex items-center gap-2 px-4 py-2 rounded-lg transition-colors cursor-pointer ${
                      tab.id === activeTabId
                        ? 'bg-primary text-white'
                        : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                    }`}
                  >
                    <span className="font-medium truncate max-w-[200px]">{tab.name}</span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        handleCloseTab(tab.id)
                      }}
                      className="hover:bg-black/20 rounded p-0.5 transition-colors cursor-pointer"
                      aria-label="Close tab"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </button>
                ))}
                <button
                  onClick={handleOpenFolder}
                  className="flex items-center gap-1 px-3 py-2 text-sm text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                  title="Open another repository"
                >
                  <Plus className="w-4 h-4" />
                  New
                </button>
              </div>
            )}

            {/* Repository Info + Toolbar */}
            <div className="mb-6 flex items-center justify-between flex-wrap gap-4">
              <div>
                <h2 className="text-2xl font-bold text-white mb-1 font-sans">
                  Repository Visualization
                </h2>
                <div className="flex gap-4 text-sm text-slate-400 font-mono">
                  <span>{repository.commits.length} commits</span>
                  {searchQuery && filteredRepository && (
                    <span className="text-primary">
                      ({filteredRepository.commits.length} filtered)
                    </span>
                  )}
                  <span>{repository.branches.length} branches</span>
                  <span>{repository.tags.length} tags</span>
                </div>
                {repository.isPartial && (
                  <div className="mt-2 flex items-center gap-2">
                    <span className="text-xs text-amber-300/90">
                      Partial history loaded — analytics may be incomplete.
                    </span>
                    <button
                      onClick={handleLoadFullHistory}
                      disabled={loading}
                      title="Load the full commit history (re-reads on disk, or fetches more for shallow clones)"
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-white bg-primary hover:bg-primary-hover disabled:opacity-50 rounded-lg transition-colors cursor-pointer font-sans"
                    >
                      <History className="w-3.5 h-3.5" />
                      Load full history
                    </button>
                  </div>
                )}
              </div>

              {/* Toolbar */}
              <div className="flex items-center gap-1 bg-slate-900 border border-slate-800 rounded-xl p-1">
                {repository.branches.length >= 2 && (
                  <button
                    onClick={() => setShowBranchComparison(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                    title="Compare branches"
                    aria-label="Compare branches"
                  >
                    <GitMerge className="w-4 h-4" />
                    <span className="hidden sm:inline">Compare</span>
                  </button>
                )}
                <button
                  onClick={() => setShowContributorStats(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  title="Contributor statistics"
                  aria-label="Contributor statistics"
                >
                  <BarChart2 className="w-4 h-4" />
                  <span className="hidden sm:inline">Stats</span>
                </button>
                <button
                  onClick={() => setShowCommitHeatmap(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  title="Commit activity heatmap"
                  aria-label="Commit activity heatmap"
                >
                  <CalendarDays className="w-4 h-4" />
                  <span className="hidden sm:inline">Heatmap</span>
                </button>
                <button
                  onClick={() => setShowRepositoryHealth(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  title="Repository health metrics"
                  aria-label="Repository health metrics"
                >
                  <HeartPulse className="w-4 h-4" />
                  <span className="hidden sm:inline">Health</span>
                </button>
                <div className="w-px h-5 bg-slate-700 mx-1" />
                <button
                  onClick={() => setShowExportMenu(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  title="Export visualization"
                  aria-label="Export visualization"
                >
                  <Upload className="w-4 h-4" />
                  <span className="hidden sm:inline">Export</span>
                </button>
                <button
                  onClick={handleCopyShareLink}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  title="Copy shareable link"
                  aria-label="Copy shareable link"
                >
                  {shareLinkCopied
                    ? <Check className="w-4 h-4 text-accent-green" />
                    : <Link className="w-4 h-4" />}
                  <span className="hidden sm:inline">{shareLinkCopied ? 'Copied!' : 'Share'}</span>
                </button>
                <div className="w-px h-5 bg-slate-700 mx-1" />
                <button
                  onClick={handleOpenFolder}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  title="Open another repository"
                  aria-label="Open another repository"
                >
                  <Plus className="w-4 h-4" />
                  <span className="hidden sm:inline">Open</span>
                </button>
                {tabs.length > 0 && (
                  <button
                    onClick={() => activeTabId && handleCloseTab(activeTabId)}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-red-400 hover:text-red-300 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                    title="Close current repository"
                    aria-label="Close current repository"
                  >
                    <X className="w-4 h-4" />
                    <span className="hidden sm:inline">Close</span>
                  </button>
                )}
              </div>
            </div>

            {/* Search Bar */}
            <div className="mb-4">
              <SearchBar
                onSearch={setSearchQuery}
                value={searchQuery}
                inputRef={searchInputRef}
                placeholder="Search commits by message, author, email, or hash..."
              />
            </div>

            {/* Filters */}
            {repository && (
              <div className="mb-6">
                <Filters
                  branches={repository.branches}
                  selectedBranch={selectedBranch}
                  onBranchChange={setSelectedBranch}
                  authors={authors}
                  selectedAuthor={selectedAuthor}
                  onAuthorChange={setSelectedAuthor}
                  dateFrom={dateFrom}
                  dateTo={dateTo}
                  onDateFromChange={setDateFrom}
                  onDateToChange={setDateTo}
                  onClearFilters={handleClearFilters}
                  pathFilter={pathFilter}
                  onPathChange={setPathFilter}
                  pathStatus={pathStatus}
                />
              </div>
            )}

            {/* Visualization */}
            {graphRepository && (
              <div id="visualization-container">
                <GitVisualization
                  repository={graphRepository}
                  dirHandle={dirHandle}
                  remoteUrl={activeTab?.remoteUrl}
                  highlightOids={highlightOids}
                  initialCommitOid={selectedCommitOidForUrl}
                  onSelectionChange={(oid) => setSelectedCommitOidForUrl(oid ?? undefined)}
                  selectRequest={selectRequest}
                  onFilterAuthor={setSelectedAuthor}
                  onFilterPath={setPathFilter}
                />
              </div>
            )}

            {/* Commit List */}
            <div className="mt-6 bg-slate-900 rounded-xl border border-slate-800 p-6">
              <h3 className="text-lg font-semibold text-white mb-4 font-sans">
                {searchQuery ? 'Filtered Commits' : 'Recent Commits'}
              </h3>
              {filteredRepository && filteredRepository.commits.length === 0 ? (
                <EmptyState
                  title="No commits found"
                  description="Try adjusting your search or filters to see more results."
                  action={{ label: 'Clear Filters', onClick: handleClearFilters }}
                />
              ) : (
                filteredRepository && <CommitList commits={filteredRepository.commits} onSelect={(oid) => setSelectRequest({ oid })} />
              )}
            </div>
          </div>
        </main>
      )}

      {/* Footer */}
      <footer className="relative z-10 border-t border-white/5 mt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <p className="text-center text-sm text-slate-400">
            Open source under MIT License
            <span className="mx-2 text-slate-700">·</span>
            <a
              href="https://buymeacoffee.com/stixe"
              target="_blank"
              rel="noopener noreferrer"
              className="text-slate-400 hover:text-primary transition-colors"
            >
              Buy me a coffee ☕
            </a>
          </p>
        </div>
      </footer>

      {paletteOpen && (
        <CommandPalette
          refItems={refItems}
          commitItems={commitItems}
          actions={paletteActions}
          onClose={() => setPaletteOpen(false)}
          onSelectOid={(oid) => {
            // The palette indexes the whole repo, but active filters may exclude
            // the target from the graph. Clear filters so the jump can land.
            if (graphRepository && !graphRepository.commits.some((c) => c.oid === oid)) {
              handleClearFilters()
            }
            setSelectRequest({ oid })
          }}
        />
      )}
      {showKeyboardHelp && <KeyboardHelp onClose={() => setShowKeyboardHelp(false)} />}
      {showSettings && <Settings onClose={() => setShowSettings(false)} />}
      {showExportMenu && <ExportMenu onClose={() => setShowExportMenu(false)} repository={repository} />}
      {showRemoteClone && (
        <RemoteClone onCloned={handleOpenRepository} onClose={() => setShowRemoteClone(false)} />
      )}
      {showBranchComparison && repository && (
        <BranchComparison repository={repository} onClose={() => setShowBranchComparison(false)} />
      )}
      {showContributorStats && repository && (
        <ContributorStats repository={repository} onClose={() => setShowContributorStats(false)} />
      )}
      {showCommitHeatmap && repository && (
        <CommitHeatmap repository={repository} onClose={() => setShowCommitHeatmap(false)} />
      )}
      {showRepositoryHealth && repository && (
        <RepositoryHealth repository={repository} onClose={() => setShowRepositoryHealth(false)} />
      )}
    </div>
  )
}

export default App
