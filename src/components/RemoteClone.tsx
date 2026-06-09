import { useEffect, useState } from 'react'
import { Globe, X, BookOpen, Trash2, Folder, ChevronLeft, AlertTriangle, Loader2 } from 'lucide-react'
import { cloneRepository } from '../services/gitService'
import {
  extractRepoName,
  getClonedRepoHandle,
  addClonedRepo,
  listClonedRepos,
  removeClonedRepo,
  ClonedRepo,
  isOPFSSupported,
} from '../services/storageService'

interface RemoteCloneProps {
  onCloned: (dirHandle: FileSystemDirectoryHandle, name: string, remoteUrl?: string) => void
  onClose: () => void
}

// isomorphic-git's raw phase strings → friendlier labels. The remote does
// "Counting/Compressing objects" before it streams a byte (the long opening
// pause), then we download and index the packfile locally.
const PHASE_LABELS: Record<string, string> = {
  'Counting objects': 'Counting objects on the remote',
  'Compressing objects': 'Compressing objects on the remote',
  'Receiving objects': 'Downloading objects',
  'Resolving deltas': 'Reconstructing history',
  'Analyzing workdir': 'Writing files',
  'Updating workdir': 'Writing files',
}

function prettyPhase(phase: string): string {
  return PHASE_LABELS[phase] ?? phase
}

// Small, public repos that actually clone in-browser. (Giant repos like the
// Linux kernel exceed what the CORS proxy + browser memory can handle, so they
// don't belong here as suggestions.)
const EXAMPLE_REPOS = [
  { label: 'stixez/gittree', url: 'https://github.com/stixez/gittree.git' },
  { label: 'sindresorhus/slugify', url: 'https://github.com/sindresorhus/slugify.git' },
]

export function RemoteClone({ onCloned, onClose }: RemoteCloneProps) {
  const [url, setUrl] = useState('')
  const [cloning, setCloning] = useState(false)
  const [progress, setProgress] = useState<{ phase: string; loaded: number; total: number } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [clonedRepos, setClonedRepos] = useState<ClonedRepo[]>([])
  const [showCloned, setShowCloned] = useState(false)
  const [allBranches, setAllBranches] = useState(false)
  // Reassurance shown when a phase sits long enough to look stuck (the opening
  // remote count and the local indexing step can both pause without events).
  const [slow, setSlow] = useState(false)

  useEffect(() => {
    if (!cloning) { setSlow(false); return }
    setSlow(false)
    const id = setTimeout(() => setSlow(true), 8000)
    return () => clearTimeout(id)
  }, [cloning, progress?.phase])

  if (!isOPFSSupported()) {
    return (
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
        <div className="bg-slate-900 border border-slate-800 rounded-xl shadow-2xl max-w-md w-full p-8 animate-scale-in">
          <div className="flex items-center gap-3 mb-4">
            <AlertTriangle className="w-5 h-5 text-yellow-400" />
            <h2 className="text-lg font-semibold text-white font-sans">
              Not Supported
            </h2>
          </div>
          <p className="text-sm text-slate-400 mb-6">
            Your browser doesn't support Origin Private File System (OPFS), which is required for cloning remote repositories.
            Please use Chrome 102+ or Edge 102+.
          </p>
          <button
            onClick={onClose}
            className="w-full px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg transition-colors cursor-pointer font-sans"
          >
            Close
          </button>
        </div>
      </div>
    )
  }

  const handleClone = async () => {
    if (!url.trim()) {
      setError('Please enter a repository URL')
      return
    }

    setCloning(true)
    setError(null)
    // Show feedback immediately — isomorphic-git's first progress event only
    // fires after the remote finishes counting/compressing, which can be many
    // seconds; without this the dialog looks frozen on "Cloning…".
    setProgress({ phase: 'Connecting to remote', loaded: 0, total: 0 })

    try {
      const repoName = extractRepoName(url)
      const dirHandle = await getClonedRepoHandle(repoName)

      await cloneRepository(url, dirHandle, (phase, loaded, total) => {
        setProgress({ phase, loaded, total })
      }, { allBranches })

      await addClonedRepo(repoName, url)
      onCloned(dirHandle, repoName, url)
      onClose()
    } catch (err) {
      // Clear progress so the error shows cleanly (no spinner/bar lingering
      // above it) and a retry starts fresh.
      setProgress(null)
      if (err instanceof Error) {
        setError(err.message)
      } else {
        setError('Failed to clone repository')
      }
    } finally {
      setCloning(false)
    }
  }

  const handleShowCloned = async () => {
    const repos = await listClonedRepos()
    setClonedRepos(repos)
    setShowCloned(true)
  }

  const handleOpenCloned = async (repo: ClonedRepo) => {
    try {
      const dirHandle = await getClonedRepoHandle(repo.name)
      onCloned(dirHandle, repo.name, repo.url)
      onClose()
    } catch (err) {
      setError(`Failed to open ${repo.name}`)
    }
  }

  const handleDeleteCloned = async (repo: ClonedRepo, e: React.MouseEvent) => {
    e.stopPropagation()

    if (!confirm(`Delete "${repo.name}"? This cannot be undone.`)) {
      return
    }

    try {
      await removeClonedRepo(repo.name)
      const repos = await listClonedRepos()
      setClonedRepos(repos)
    } catch (err) {
      setError(`Failed to delete ${repo.name}`)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto animate-scale-in">
        {!showCloned ? (
          <div className="p-8">
            <div className="flex justify-between items-start mb-6">
              <div className="flex items-start gap-3">
                <Globe className="w-5 h-5 text-primary mt-0.5" />
                <div>
                  <h2 className="text-lg font-semibold text-white font-sans">
                    Clone Remote Repository
                  </h2>
                  <p className="text-sm text-slate-400">
                    Clone a public git repository from GitHub, GitLab, or any git server
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-1.5 text-slate-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                disabled={cloning}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* URL Input */}
            <div className="mb-6">
              <label className="block text-xs font-medium text-slate-400 mb-2 font-sans">
                Repository URL
              </label>
              <input
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://github.com/user/repository.git"
                className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-lg text-white placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary text-sm"
                disabled={cloning}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !cloning) {
                    handleClone()
                  }
                }}
              />
              <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                <span>Try:</span>
                {EXAMPLE_REPOS.map((ex) => (
                  <button
                    key={ex.url}
                    type="button"
                    onClick={() => setUrl(ex.url)}
                    disabled={cloning}
                    className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed text-slate-300 font-mono cursor-pointer transition-colors"
                  >
                    {ex.label}
                  </button>
                ))}
              </div>

              <label className="mt-3 flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={allBranches}
                  onChange={(e) => setAllBranches(e.target.checked)}
                  disabled={cloning}
                  className="accent-primary w-3.5 h-3.5"
                />
                <span className="text-xs text-slate-400">
                  Fetch all branches <span className="text-slate-600">(slower — off by default, clones the default branch only)</span>
                </span>
              </label>
            </div>

            {/* Progress */}
            {progress && (
              <div className="mb-6 p-4 bg-primary/10 border border-primary/20 rounded-lg">
                <div className="flex items-center justify-between gap-3 mb-2">
                  <div className="flex items-center gap-3 min-w-0">
                    <Loader2 className="w-4 h-4 text-primary animate-spin flex-shrink-0" />
                    {/* Only the phase label is a live region — it changes a
                        handful of times, unlike the per-tick percentage. */}
                    <span className="text-sm font-medium text-white font-sans truncate" aria-live="polite">
                      {prettyPhase(progress.phase)}…
                    </span>
                  </div>
                  {progress.total > 0 && (
                    <span className="text-xs text-slate-400 font-mono tabular-nums flex-shrink-0">
                      {progress.loaded.toLocaleString()}/{progress.total.toLocaleString()}
                      {' '}({Math.round((progress.loaded / progress.total) * 100)}%)
                    </span>
                  )}
                </div>
                {/* Determinate when the phase reports a total; otherwise an
                    indeterminate sweep so a no-progress phase never looks frozen. */}
                <div
                  className="relative w-full bg-slate-900 rounded-full h-1.5 overflow-hidden"
                  role="progressbar"
                  aria-label="Clone progress"
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={progress.total > 0 ? Math.round((progress.loaded / progress.total) * 100) : undefined}
                >
                  {progress.total > 0 ? (
                    <div
                      className="bg-primary h-1.5 rounded-full transition-all duration-300"
                      style={{ width: `${(progress.loaded / progress.total) * 100}%` }}
                    />
                  ) : (
                    <div className="animate-indeterminate bg-primary rounded-full" />
                  )}
                </div>
                {/* Reassurance only while there's genuinely no movement (no total
                    reported) — a moving determinate bar speaks for itself. */}
                {slow && progress.total === 0 && (
                  <p className="mt-2 text-xs text-slate-400">
                    Large repositories can take a while over the public proxy — still working…
                  </p>
                )}
              </div>
            )}

            {/* Error */}
            {error && (
              <div className="mb-6 p-4 bg-red-950/40 border border-red-900/40 rounded-lg">
                <p className="text-sm text-red-300">{error}</p>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3">
              <button
                onClick={handleClone}
                disabled={cloning || !url.trim()}
                className="flex-1 px-6 py-3 bg-primary hover:bg-primary-hover disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors cursor-pointer font-sans"
              >
                {cloning ? 'Cloning...' : 'Clone Repository'}
              </button>
              <button
                onClick={handleShowCloned}
                disabled={cloning}
                className="px-6 py-3 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors cursor-pointer font-sans"
              >
                Cloned Repos
              </button>
            </div>

            {/* Info */}
            <div className="mt-6 p-4 bg-slate-800/50 rounded-lg">
              <h3 className="text-xs font-semibold text-slate-300 mb-2 font-sans">
                How it works
              </h3>
              <ul className="text-xs text-slate-500 space-y-1">
                <li>· Repositories are cloned to your browser's private storage (OPFS)</li>
                <li>· Shallow clone (last 200 commits) of the default branch for fast downloads</li>
                <li>· Only public repositories are supported</li>
                <li>· Cloned repos persist until you delete them</li>
              </ul>
            </div>
          </div>
        ) : (
          <div className="p-8">
            <div className="flex justify-between items-start mb-6">
              <div className="flex items-start gap-3">
                <BookOpen className="w-5 h-5 text-primary mt-0.5" />
                <div>
                  <h2 className="text-lg font-semibold text-white font-sans">
                    Cloned Repositories
                  </h2>
                  <p className="text-sm text-slate-400">
                    Repositories stored in your browser
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-1.5 text-slate-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {clonedRepos.length === 0 ? (
              <div className="text-center py-12">
                <Folder className="w-12 h-12 text-slate-700 mx-auto mb-4" />
                <p className="text-slate-400 mb-4 font-sans">
                  No cloned repositories yet
                </p>
                <button
                  onClick={() => setShowCloned(false)}
                  className="px-6 py-2 bg-primary hover:bg-primary-hover text-white font-medium rounded-lg transition-colors cursor-pointer font-sans"
                >
                  Clone a Repository
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {clonedRepos.map((repo) => (
                  <div
                    key={repo.name}
                    onClick={() => handleOpenCloned(repo)}
                    className="group p-4 bg-slate-800/50 hover:bg-slate-800 rounded-lg cursor-pointer transition-colors border border-slate-800 hover:border-primary/40"
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <h3 className="font-medium text-white mb-1 font-sans">
                          {repo.name}
                        </h3>
                        <p className="text-xs text-slate-500 mb-2 truncate font-mono">
                          {repo.url}
                        </p>
                        <p className="text-xs text-slate-600">
                          Cloned {new Date(repo.clonedAt).toLocaleDateString()}
                        </p>
                      </div>
                      <button
                        onClick={(e) => handleDeleteCloned(repo, e)}
                        className="opacity-0 group-hover:opacity-100 p-1.5 text-red-500 hover:bg-red-950/40 rounded-lg transition-all cursor-pointer"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="mt-6">
              <button
                onClick={() => setShowCloned(false)}
                className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white font-medium rounded-lg transition-colors cursor-pointer font-sans"
              >
                <ChevronLeft className="w-4 h-4" />
                Back
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
