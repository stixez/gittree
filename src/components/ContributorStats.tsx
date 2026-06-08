import { useMemo } from 'react'
import { BarChart2, X, Trophy, Calendar, Clock } from 'lucide-react'
import { GitRepository } from '../types/git'
import { useEscapeKey } from '../hooks/useKeyboard'
import { authorLocalHour } from '../utils/commitTime'
import { PartialBadge } from './PartialBadge'

interface ContributorStatsProps {
  repository: GitRepository
  onClose: () => void
}

interface ContributorData {
  email: string
  name: string
  commits: number
  firstCommit: number
  lastCommit: number
}

interface DayOfWeekStats {
  [key: string]: number
}

interface HourStats {
  [hour: number]: number
}

export function ContributorStats({ repository, onClose }: ContributorStatsProps) {
  useEscapeKey(onClose)

  const stats = useMemo(() => {
    const contributorMap = new Map<string, ContributorData>()
    const dayOfWeekMap: DayOfWeekStats = {
      'Sunday': 0,
      'Monday': 0,
      'Tuesday': 0,
      'Wednesday': 0,
      'Thursday': 0,
      'Friday': 0,
      'Saturday': 0,
    }
    const hourMap: HourStats = {}

    for (let i = 0; i < 24; i++) {
      hourMap[i] = 0
    }

    for (const commit of repository.commits) {
      const email = commit.author.email

      if (!contributorMap.has(email)) {
        contributorMap.set(email, {
          email,
          name: commit.author.name,
          commits: 0,
          firstCommit: commit.author.timestamp,
          lastCommit: commit.author.timestamp,
        })
      }

      const contributor = contributorMap.get(email)!
      contributor.commits++
      contributor.firstCommit = Math.min(contributor.firstCommit, commit.author.timestamp)
      contributor.lastCommit = Math.max(contributor.lastCommit, commit.author.timestamp)

      const date = new Date(commit.author.timestamp * 1000)
      const dayName = date.toLocaleDateString('en-US', { weekday: 'long' })
      dayOfWeekMap[dayName]++

      // Author's local hour (not the viewer's timezone) so the histogram
      // reflects when people actually commit.
      hourMap[authorLocalHour(commit.author.timestamp, commit.author.timezoneOffset)]++
    }

    const contributors = Array.from(contributorMap.values())
      .sort((a, b) => b.commits - a.commits)

    return {
      contributors,
      dayOfWeek: dayOfWeekMap,
      hourly: hourMap,
      totalContributors: contributors.length,
      totalCommits: repository.commits.length,
    }
  }, [repository.commits])

  const formatDate = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  const topContributors = stats.contributors.slice(0, 10)
  const maxCommits = topContributors[0]?.commits || 1

  const maxDayCommits = Math.max(...Object.values(stats.dayOfWeek))
  const maxHourCommits = Math.max(...Object.values(stats.hourly))

  const dayOrder = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

  const getRankLabel = (index: number) => {
    if (index === 0) return '1st'
    if (index === 1) return '2nd'
    if (index === 2) return '3rd'
    return `#${index + 1}`
  }

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="bg-slate-900 border border-slate-800 rounded-xl shadow-2xl max-w-5xl w-full my-8 animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 compact:p-3 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <BarChart2 className="w-5 h-5 text-primary" />
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-semibold text-white font-sans">
                  Contributor Statistics
                </h2>
                {repository.isPartial && <PartialBadge count={repository.commits.length} />}
              </div>
              <p className="text-sm text-slate-400">
                {stats.totalContributors} contributors · {stats.totalCommits} commits
                <span className="text-slate-600"> · author local time</span>
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

        {/* Content */}
        <div className="p-6 compact:p-3 space-y-8 compact:space-y-4 max-h-[70vh] overflow-y-auto">
          {/* Top Contributors */}
          <div>
            <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2 font-sans">
              <Trophy className="w-4 h-4 text-primary" />
              Top Contributors
            </h3>
            <div className="space-y-3">
              {topContributors.map((contributor, index) => (
                <div
                  key={contributor.email}
                  className="bg-slate-800/50 rounded-lg p-4 compact:p-2 border border-slate-800"
                >
                  <div className="flex items-start justify-between gap-4 mb-2">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <span className="text-xs font-bold text-slate-400 w-8 flex-shrink-0 font-mono">
                        {getRankLabel(index)}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-white truncate font-sans">
                          {contributor.name}
                        </p>
                        <p className="text-xs text-slate-500 truncate font-mono">
                          {contributor.email}
                        </p>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-lg font-bold text-primary font-sans">
                        {contributor.commits}
                      </p>
                      <p className="text-xs text-slate-500">
                        commits
                      </p>
                    </div>
                  </div>

                  <div className="w-full bg-slate-900 rounded-full h-1.5">
                    <div
                      className="bg-primary h-1.5 rounded-full transition-all"
                      style={{ width: `${(contributor.commits / maxCommits) * 100}%` }}
                    />
                  </div>

                  <div className="mt-2 flex items-center gap-4 text-xs text-slate-500">
                    <span>First: {formatDate(contributor.firstCommit)}</span>
                    <span>·</span>
                    <span>Last: {formatDate(contributor.lastCommit)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Commits by Day of Week */}
          <div>
            <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2 font-sans">
              <Calendar className="w-4 h-4 text-primary" />
              Commits by Day of Week
            </h3>
            <div className="space-y-2">
              {dayOrder.map((day) => (
                <div key={day} className="flex items-center gap-3">
                  <div className="w-24 text-xs text-slate-400 font-sans">
                    {day}
                  </div>
                  <div className="flex-1 bg-slate-950 rounded-full h-7 relative overflow-hidden">
                    <div
                      className="bg-primary/70 h-full rounded-full transition-all flex items-center justify-end pr-2"
                      style={{ width: `${(stats.dayOfWeek[day] / maxDayCommits) * 100}%` }}
                    >
                      {stats.dayOfWeek[day] > 0 && (
                        <span className="text-xs font-medium text-white font-sans">
                          {stats.dayOfWeek[day]}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Commits by Hour */}
          <div>
            <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2 font-sans">
              <Clock className="w-4 h-4 text-primary" />
              Commits by Hour of Day
            </h3>
            <div className="grid grid-cols-24 gap-1">
              {Array.from({ length: 24 }, (_, i) => i).map((hour) => (
                <div key={hour} className="flex flex-col items-center">
                  <div
                    className="w-full bg-accent-green rounded-t transition-all"
                    style={{
                      height: `${Math.max((stats.hourly[hour] / maxHourCommits) * 100, 2)}px`,
                      opacity: stats.hourly[hour] > 0 ? 1 : 0.15,
                    }}
                    title={`${hour}:00 - ${stats.hourly[hour]} commits`}
                  />
                  {hour % 3 === 0 && (
                    <div className="text-[8px] text-slate-500 mt-1 font-mono">
                      {hour}
                    </div>
                  )}
                </div>
              ))}
            </div>
            <p className="text-xs text-slate-500 mt-2 text-center">
              Hover over bars to see commit counts
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-800 text-center">
          <p className="text-xs text-slate-500">
            Press <kbd className="px-1.5 py-0.5 bg-slate-800 border border-slate-700 rounded font-mono text-slate-400">ESC</kbd> to close
          </p>
        </div>
      </div>
    </div>
  )
}
