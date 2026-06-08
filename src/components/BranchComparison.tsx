import { useState, useMemo } from 'react'
import { GitMerge, X } from 'lucide-react'
import { GitRepository, GitCommit } from '../types/git'

interface BranchComparisonProps {
  repository: GitRepository
  onClose: () => void
}

interface ComparisonResult {
  baseCommits: GitCommit[]
  compareCommits: GitCommit[]
  commonAncestor: GitCommit | null
  divergencePoint: string | null
}

export function BranchComparison({ repository, onClose }: BranchComparisonProps) {
  const [baseBranch, setBaseBranch] = useState<string>(repository.branches[0]?.name || '')
  const [compareBranch, setCompareBranch] = useState<string>(repository.branches[1]?.name || '')

  const comparison = useMemo((): ComparisonResult | null => {
    if (!baseBranch || !compareBranch || baseBranch === compareBranch) {
      return null
    }

    const baseRef = repository.branches.find(b => b.name === baseBranch)
    const compareRef = repository.branches.find(b => b.name === compareBranch)

    if (!baseRef || !compareRef) {
      return null
    }

    // Build O(1) commit lookup map
    const commitMap = new Map<string, GitCommit>()
    repository.commits.forEach(c => commitMap.set(c.oid, c))

    const baseAncestors = new Set<string>()
    const compareAncestors = new Set<string>()

    const buildAncestors = (startOid: string, ancestorSet: Set<string>) => {
      const queue = [startOid]

      while (queue.length > 0) {
        const oid = queue.shift()!
        if (ancestorSet.has(oid)) continue

        ancestorSet.add(oid)
        const commit = commitMap.get(oid)
        if (commit) {
          queue.push(...commit.parents)
        }
      }
    }

    buildAncestors(baseRef.oid, baseAncestors)
    buildAncestors(compareRef.oid, compareAncestors)

    const commonAncestors = Array.from(baseAncestors).filter(oid => compareAncestors.has(oid))

    let commonAncestor: GitCommit | null = null
    let divergencePoint: string | null = null

    if (commonAncestors.length > 0) {
      const baseHistory: string[] = []
      let current = baseRef.oid
      const visited = new Set<string>()

      while (current && !visited.has(current)) {
        visited.add(current)
        baseHistory.push(current)
        const commit = commitMap.get(current)
        if (commit && commit.parents.length > 0) {
          current = commit.parents[0]
        } else {
          break
        }
      }

      for (const oid of baseHistory) {
        if (compareAncestors.has(oid)) {
          commonAncestor = commitMap.get(oid) || null
          divergencePoint = oid
          break
        }
      }
    }

    const baseCommits = repository.commits.filter(commit =>
      baseAncestors.has(commit.oid) && !compareAncestors.has(commit.oid)
    )

    const compareCommits = repository.commits.filter(commit =>
      compareAncestors.has(commit.oid) && !baseAncestors.has(commit.oid)
    )

    return {
      baseCommits,
      compareCommits,
      commonAncestor,
      divergencePoint,
    }
  }, [repository, baseBranch, compareBranch])

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden animate-scale-in flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-slate-800">
          <div className="flex justify-between items-start">
            <div className="flex items-center gap-3">
              <GitMerge className="w-5 h-5 text-primary" />
              <div>
                <h2 className="text-lg font-semibold text-white font-sans">
                  Branch Comparison
                </h2>
                <p className="text-sm text-slate-400">
                  Compare two branches to see their differences
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Branch Selectors */}
        <div className="p-6 border-b border-slate-800 bg-slate-950/50">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-2 font-sans">
                Base Branch
              </label>
              <select
                value={baseBranch}
                onChange={(e) => setBaseBranch(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white text-sm focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary [color-scheme:dark] cursor-pointer"
              >
                {repository.branches.map((branch) => (
                  <option key={branch.name} value={branch.name}>
                    {branch.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-400 mb-2 font-sans">
                Compare Branch
              </label>
              <select
                value={compareBranch}
                onChange={(e) => setCompareBranch(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white text-sm focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary [color-scheme:dark] cursor-pointer"
              >
                {repository.branches.map((branch) => (
                  <option key={branch.name} value={branch.name}>
                    {branch.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Results */}
        <div className="flex-1 overflow-y-auto p-6">
          {!comparison ? (
            <div className="text-center py-12">
              <GitMerge className="w-12 h-12 text-slate-700 mx-auto mb-4" />
              <p className="text-slate-400">
                {baseBranch === compareBranch
                  ? 'Select two different branches to compare'
                  : 'Select two branches to see their differences'}
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Summary */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-primary/10 border border-primary/20 rounded-lg p-4">
                  <div className="text-xs font-medium text-primary mb-1 truncate font-sans">
                    {baseBranch}
                  </div>
                  <div className="text-2xl font-bold text-white font-sans">
                    {comparison.baseCommits.length}
                  </div>
                  <div className="text-xs text-slate-400">
                    unique commits
                  </div>
                </div>

                <div className="bg-slate-800/50 rounded-lg p-4">
                  <div className="text-xs font-medium text-slate-300 mb-1 font-sans">
                    Common Ancestor
                  </div>
                  <div className="text-sm font-mono text-slate-400">
                    {comparison.commonAncestor
                      ? comparison.commonAncestor.oid.substring(0, 7)
                      : 'None'}
                  </div>
                  <div className="text-xs text-slate-500 mt-1">
                    {comparison.commonAncestor
                      ? comparison.commonAncestor.message.split('\n')[0].substring(0, 40)
                      : 'No common history'}
                  </div>
                </div>

                <div className="bg-blue-950/30 border border-blue-900/30 rounded-lg p-4">
                  <div className="text-xs font-medium text-blue-400 mb-1 truncate font-sans">
                    {compareBranch}
                  </div>
                  <div className="text-2xl font-bold text-white font-sans">
                    {comparison.compareCommits.length}
                  </div>
                  <div className="text-xs text-slate-400">
                    unique commits
                  </div>
                </div>
              </div>

              {/* Commits Comparison */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Base Branch Commits */}
                <div>
                  <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2 font-sans">
                    <span className="w-2 h-2 rounded-full bg-primary inline-block"></span>
                    Commits in {baseBranch}
                  </h3>
                  {comparison.baseCommits.length === 0 ? (
                    <p className="text-sm text-slate-500 italic">
                      No unique commits
                    </p>
                  ) : (
                    <div className="space-y-2 max-h-96 overflow-y-auto">
                      {comparison.baseCommits.slice(0, 20).map((commit) => (
                        <div
                          key={commit.oid}
                          className="bg-slate-800/50 rounded-lg p-3 border border-primary/20"
                        >
                          <div className="text-xs font-mono text-primary mb-1">
                            {commit.oid.substring(0, 7)}
                          </div>
                          <div className="text-sm text-white mb-1">
                            {commit.message.split('\n')[0].substring(0, 60)}
                          </div>
                          <div className="text-xs text-slate-500">
                            {commit.author.name} · {new Date(commit.author.timestamp * 1000).toLocaleDateString()}
                          </div>
                        </div>
                      ))}
                      {comparison.baseCommits.length > 20 && (
                        <p className="text-xs text-slate-500 text-center italic">
                          ... and {comparison.baseCommits.length - 20} more commits
                        </p>
                      )}
                    </div>
                  )}
                </div>

                {/* Compare Branch Commits */}
                <div>
                  <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2 font-sans">
                    <span className="w-2 h-2 rounded-full bg-blue-400 inline-block"></span>
                    Commits in {compareBranch}
                  </h3>
                  {comparison.compareCommits.length === 0 ? (
                    <p className="text-sm text-slate-500 italic">
                      No unique commits
                    </p>
                  ) : (
                    <div className="space-y-2 max-h-96 overflow-y-auto">
                      {comparison.compareCommits.slice(0, 20).map((commit) => (
                        <div
                          key={commit.oid}
                          className="bg-slate-800/50 rounded-lg p-3 border border-blue-900/40"
                        >
                          <div className="text-xs font-mono text-blue-400 mb-1">
                            {commit.oid.substring(0, 7)}
                          </div>
                          <div className="text-sm text-white mb-1">
                            {commit.message.split('\n')[0].substring(0, 60)}
                          </div>
                          <div className="text-xs text-slate-500">
                            {commit.author.name} · {new Date(commit.author.timestamp * 1000).toLocaleDateString()}
                          </div>
                        </div>
                      ))}
                      {comparison.compareCommits.length > 20 && (
                        <p className="text-xs text-slate-500 text-center italic">
                          ... and {comparison.compareCommits.length - 20} more commits
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800">
          <button
            onClick={onClose}
            className="w-full px-6 py-2 bg-slate-800 hover:bg-slate-700 text-white font-medium rounded-lg transition-colors cursor-pointer font-sans"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
