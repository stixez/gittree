import { useMemo } from 'react'
import { Activity, X, Calendar, Users, GitMerge, ArrowRight } from 'lucide-react'
import { GitRepository } from '../types/git'
import { useEscapeKey } from '../hooks/useKeyboard'
import { PartialBadge } from './PartialBadge'

interface RepositoryHealthProps {
  repository: GitRepository
  onClose: () => void
}

export function RepositoryHealth({ repository, onClose }: RepositoryHealthProps) {
  useEscapeKey(onClose)

  const healthMetrics = useMemo(() => {
    if (repository.commits.length === 0) {
      return null
    }

    const sortedCommits = [...repository.commits].sort((a, b) => a.author.timestamp - b.author.timestamp)

    const firstCommit = new Date(sortedCommits[0].author.timestamp * 1000)
    const lastCommit = new Date(sortedCommits[sortedCommits.length - 1].author.timestamp * 1000)
    const ageInDays = Math.floor((lastCommit.getTime() - firstCommit.getTime()) / (1000 * 60 * 60 * 24))
    const ageInYears = (ageInDays / 365).toFixed(1)

    const commitsPerDay = ageInDays > 0 ? (repository.commits.length / ageInDays).toFixed(2) : '0'

    const activeDays = new Set(
      repository.commits.map(c => new Date(c.author.timestamp * 1000).toISOString().split('T')[0])
    ).size
    const activeDaysPercentage = ageInDays > 0 ? ((activeDays / ageInDays) * 100).toFixed(1) : '0'

    const contributorMap = new Map<string, number>()
    for (const commit of repository.commits) {
      const key = `${commit.author.name} <${commit.author.email}>`
      contributorMap.set(key, (contributorMap.get(key) || 0) + 1)
    }
    const topContributor = Array.from(contributorMap.entries()).sort((a, b) => b[1] - a[1])[0]

    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    const recentCommits = repository.commits.filter(
      c => new Date(c.author.timestamp * 1000) >= thirtyDaysAgo
    ).length

    const mergeCommits = repository.commits.filter(c => c.parents.length > 1).length
    const mergePercentage = ((mergeCommits / repository.commits.length) * 100).toFixed(1)

    const avgMessageLength = Math.floor(
      repository.commits.reduce((sum, c) => sum + c.message.length, 0) / repository.commits.length
    )

    let healthScore = 0
    healthScore += Math.min(30, parseFloat(activeDaysPercentage) * 0.3)
    healthScore += Math.min(25, (recentCommits / 30) * 25)
    const frequency = parseFloat(commitsPerDay)
    healthScore += Math.min(20, frequency * 4)
    const contributorCount = contributorMap.size
    healthScore += Math.min(15, contributorCount * 3)
    healthScore += Math.min(5, repository.branches.length)
    healthScore += Math.min(5, repository.tags.length)

    const finalScore = Math.min(100, Math.floor(healthScore))

    return {
      ageInDays,
      ageInYears,
      commitsPerDay,
      activeDays,
      activeDaysPercentage,
      topContributor: topContributor ? {
        name: topContributor[0].split(' <')[0],
        commits: topContributor[1],
        percentage: ((topContributor[1] / repository.commits.length) * 100).toFixed(1),
      } : null,
      recentCommits,
      mergeCommits,
      mergePercentage,
      avgMessageLength,
      contributorCount,
      healthScore: finalScore,
      firstCommitDate: firstCommit.toLocaleDateString(),
      lastCommitDate: lastCommit.toLocaleDateString(),
    }
  }, [repository])

  if (!healthMetrics) {
    return null
  }

  const getHealthColor = (score: number): string => {
    if (score >= 80) return 'text-accent-green'
    if (score >= 60) return 'text-blue-400'
    if (score >= 40) return 'text-yellow-400'
    if (score >= 20) return 'text-orange-400'
    return 'text-red-400'
  }

  const getHealthLabel = (score: number): string => {
    if (score >= 80) return 'Excellent'
    if (score >= 60) return 'Good'
    if (score >= 40) return 'Fair'
    if (score >= 20) return 'Poor'
    return 'Inactive'
  }

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in p-4"
      onClick={onClose}
    >
      <div
        className="bg-slate-900 border border-slate-800 rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 bg-slate-900 border-b border-slate-800 p-6 compact:p-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Activity className="w-5 h-5 text-primary" />
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-semibold text-white font-sans">
                  Repository Health
                </h2>
                {repository.isPartial && <PartialBadge count={repository.commits.length} />}
              </div>
              <p className="text-sm text-slate-400">
                Overall health metrics and activity indicators
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

        {/* Health Score */}
        <div className="p-6 compact:p-3 border-b border-slate-800">
          <div className="text-center">
            <div className={`text-6xl font-bold ${getHealthColor(healthMetrics.healthScore)} mb-2 font-sans`}>
              {healthMetrics.healthScore}
            </div>
            <div className="text-lg font-semibold text-white font-sans">
              {getHealthLabel(healthMetrics.healthScore)}
            </div>
            <p className="text-xs text-slate-400 mt-2">
              Repository health score out of 100
            </p>
          </div>
        </div>

        {/* Metrics Grid */}
        <div className="p-6 compact:p-3 space-y-6 compact:space-y-3">
          {/* Age & Activity */}
          <div>
            <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2 font-sans">
              <Calendar className="w-4 h-4 text-primary" />
              Age &amp; Activity
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-slate-800/50 rounded-lg p-4">
                <div className="text-2xl font-bold text-white font-sans">
                  {healthMetrics.ageInYears}
                </div>
                <div className="text-xs text-slate-400 mt-1">
                  Years old ({healthMetrics.ageInDays} days)
                </div>
              </div>
              <div className="bg-slate-800/50 rounded-lg p-4">
                <div className="text-2xl font-bold text-white font-sans">
                  {healthMetrics.commitsPerDay}
                </div>
                <div className="text-xs text-slate-400 mt-1">
                  Commits per day
                </div>
              </div>
              <div className="bg-slate-800/50 rounded-lg p-4">
                <div className="text-2xl font-bold text-white font-sans">
                  {healthMetrics.activeDays}
                </div>
                <div className="text-xs text-slate-400 mt-1">
                  Active days ({healthMetrics.activeDaysPercentage}%)
                </div>
              </div>
              <div className="bg-slate-800/50 rounded-lg p-4">
                <div className="text-2xl font-bold text-white font-sans">
                  {healthMetrics.recentCommits}
                </div>
                <div className="text-xs text-slate-400 mt-1">
                  Commits (last 30 days)
                </div>
              </div>
            </div>
          </div>

          {/* Contributors */}
          <div>
            <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2 font-sans">
              <Users className="w-4 h-4 text-primary" />
              Contributors
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-slate-800/50 rounded-lg p-4">
                <div className="text-xs text-slate-400 mb-2">
                  Total Contributors
                </div>
                <div className="text-3xl font-bold text-white font-sans">
                  {healthMetrics.contributorCount}
                </div>
              </div>
              {healthMetrics.topContributor && (
                <div className="bg-slate-800/50 rounded-lg p-4">
                  <div className="text-xs text-slate-400 mb-2">
                    Most Active Contributor
                  </div>
                  <div className="text-lg font-semibold text-white truncate font-sans">
                    {healthMetrics.topContributor.name}
                  </div>
                  <div className="text-xs text-slate-400 mt-1">
                    {healthMetrics.topContributor.commits} commits ({healthMetrics.topContributor.percentage}%)
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Commit Patterns */}
          <div>
            <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2 font-sans">
              <GitMerge className="w-4 h-4 text-primary" />
              Commit Patterns
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div className="bg-slate-800/50 rounded-lg p-4">
                <div className="text-2xl font-bold text-white font-sans">
                  {healthMetrics.mergeCommits}
                </div>
                <div className="text-xs text-slate-400 mt-1">
                  Merge commits ({healthMetrics.mergePercentage}%)
                </div>
              </div>
              <div className="bg-slate-800/50 rounded-lg p-4">
                <div className="text-2xl font-bold text-white font-sans">
                  {healthMetrics.avgMessageLength}
                </div>
                <div className="text-xs text-slate-400 mt-1">
                  Avg. message length (chars)
                </div>
              </div>
              <div className="bg-slate-800/50 rounded-lg p-4">
                <div className="text-2xl font-bold text-white font-sans">
                  {repository.branches.length} / {repository.tags.length}
                </div>
                <div className="text-xs text-slate-400 mt-1">
                  Branches / Tags
                </div>
              </div>
            </div>
          </div>

          {/* Timeline */}
          <div>
            <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2 font-sans">
              <Calendar className="w-4 h-4 text-primary" />
              Timeline
            </h3>
            <div className="bg-slate-800/50 rounded-lg p-4">
              <div className="flex justify-between items-center">
                <div>
                  <div className="text-xs text-slate-400">First Commit</div>
                  <div className="text-base font-semibold text-white mt-1 font-sans">
                    {healthMetrics.firstCommitDate}
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-600" />
                <div className="text-right">
                  <div className="text-xs text-slate-400">Last Commit</div>
                  <div className="text-base font-semibold text-white mt-1 font-sans">
                    {healthMetrics.lastCommitDate}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-slate-800 text-center">
          <p className="text-xs text-slate-500">
            Health score based on activity, frequency, contributors, and code health indicators
          </p>
          <p className="text-xs text-slate-500 mt-2">
            Press <kbd className="px-1.5 py-0.5 bg-slate-800 border border-slate-700 rounded font-mono text-slate-400">ESC</kbd> to close
          </p>
        </div>
      </div>
    </div>
  )
}
