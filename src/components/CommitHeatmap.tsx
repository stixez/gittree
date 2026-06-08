import { useMemo } from 'react'
import { CalendarDays, X } from 'lucide-react'
import { GitRepository } from '../types/git'
import { useEscapeKey } from '../hooks/useKeyboard'
import { PartialBadge } from './PartialBadge'

interface CommitHeatmapProps {
  repository: GitRepository
  onClose: () => void
}

interface DayData {
  date: string
  count: number
  dayOfWeek: number
  weekOfYear: number
}

export function CommitHeatmap({ repository, onClose }: CommitHeatmapProps) {
  useEscapeKey(onClose)

  const heatmapData = useMemo(() => {
    const now = new Date()
    const oneYearAgo = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000)

    const dateMap = new Map<string, number>()

    for (const commit of repository.commits) {
      const commitDate = new Date(commit.author.timestamp * 1000)
      if (commitDate >= oneYearAgo) {
        const dateKey = commitDate.toISOString().split('T')[0]
        dateMap.set(dateKey, (dateMap.get(dateKey) || 0) + 1)
      }
    }

    const grid: DayData[][] = []
    const currentDate = new Date(oneYearAgo)

    currentDate.setDate(currentDate.getDate() - currentDate.getDay())

    for (let week = 0; week < 53; week++) {
      const weekData: DayData[] = []
      for (let day = 0; day < 7; day++) {
        const dateKey = currentDate.toISOString().split('T')[0]
        const count = dateMap.get(dateKey) || 0

        weekData.push({
          date: dateKey,
          count,
          dayOfWeek: day,
          weekOfYear: week,
        })

        currentDate.setDate(currentDate.getDate() + 1)
      }
      grid.push(weekData)
    }

    return grid
  }, [repository.commits])

  const getColorClass = (count: number): string => {
    if (count === 0) return 'bg-slate-800'
    if (count === 1) return 'bg-green-900'
    if (count <= 3) return 'bg-green-700'
    if (count <= 5) return 'bg-green-600'
    return 'bg-green-500'
  }

  const totalCommits = useMemo(() => {
    return heatmapData.flat().reduce((sum, day) => sum + day.count, 0)
  }, [heatmapData])

  const streakData = useMemo(() => {
    const flatData = heatmapData.flat().reverse()
    let currentStreak = 0
    let longestStreak = 0
    let tempStreak = 0

    for (const day of flatData) {
      if (day.count > 0) {
        tempStreak++
        if (currentStreak === 0 || currentStreak === tempStreak) {
          currentStreak = tempStreak
        }
        longestStreak = Math.max(longestStreak, tempStreak)
      } else {
        if (currentStreak === tempStreak) {
          currentStreak = tempStreak
        }
        tempStreak = 0
      }
    }

    return { current: currentStreak, longest: longestStreak }
  }, [heatmapData])

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in p-4"
      onClick={onClose}
    >
      <div
        className="bg-slate-900 border border-slate-800 rounded-xl shadow-2xl max-w-5xl w-full max-h-[90vh] overflow-y-auto animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 bg-slate-900 border-b border-slate-800 p-6 compact:p-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <CalendarDays className="w-5 h-5 text-primary" />
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-semibold text-white font-sans">
                  Commit Activity Heatmap
                </h2>
                {repository.isPartial && <PartialBadge count={repository.commits.length} />}
              </div>
              <p className="text-sm text-slate-400">
                Last 365 days of commit activity
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

        {/* Stats Summary */}
        <div className="p-6 compact:p-3 border-b border-slate-800">
          <div className="grid grid-cols-3 gap-6 compact:gap-3">
            <div className="text-center">
              <div className="text-3xl font-bold text-white font-sans">
                {totalCommits}
              </div>
              <div className="text-xs text-slate-400 mt-1">
                Commits this year
              </div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-accent-green font-sans">
                {streakData.current}
              </div>
              <div className="text-xs text-slate-400 mt-1">
                Current streak (days)
              </div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-primary font-sans">
                {streakData.longest}
              </div>
              <div className="text-xs text-slate-400 mt-1">
                Longest streak (days)
              </div>
            </div>
          </div>
        </div>

        {/* Heatmap */}
        <div className="p-6 compact:p-3">
          <div className="overflow-x-auto">
            <div className="inline-block min-w-full">
              {/* Day labels */}
              <div className="flex mb-2">
                <div className="w-8"></div>
                <div className="flex-1">
                  <div className="grid grid-cols-7 gap-1 text-xs text-slate-500">
                    <div>Sun</div>
                    <div>Mon</div>
                    <div>Tue</div>
                    <div>Wed</div>
                    <div>Thu</div>
                    <div>Fri</div>
                    <div>Sat</div>
                  </div>
                </div>
              </div>

              {/* Heatmap grid */}
              <div className="flex gap-1">
                {/* Month labels */}
                <div className="w-8 flex flex-col justify-around text-xs text-slate-500">
                  <div>Jan</div>
                  <div>Apr</div>
                  <div>Jul</div>
                  <div>Oct</div>
                </div>

                {/* Grid */}
                <div className="flex gap-1">
                  {heatmapData.map((week, weekIndex) => (
                    <div key={weekIndex} className="flex flex-col gap-1">
                      {week.map((day) => (
                        <div
                          key={day.date}
                          className={`w-3 h-3 rounded-sm ${getColorClass(day.count)} transition-colors cursor-pointer hover:ring-1 hover:ring-slate-400`}
                          title={`${day.date}: ${day.count} commit${day.count !== 1 ? 's' : ''}`}
                        />
                      ))}
                    </div>
                  ))}
                </div>
              </div>

              {/* Legend */}
              <div className="mt-6 flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <span>Less</span>
                  <div className="flex gap-1">
                    <div className="w-3 h-3 rounded-sm bg-slate-800"></div>
                    <div className="w-3 h-3 rounded-sm bg-green-900"></div>
                    <div className="w-3 h-3 rounded-sm bg-green-700"></div>
                    <div className="w-3 h-3 rounded-sm bg-green-600"></div>
                    <div className="w-3 h-3 rounded-sm bg-green-500"></div>
                  </div>
                  <span>More</span>
                </div>
                <div className="text-xs text-slate-500">
                  Hover over squares for details
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-slate-800 text-center">
          <p className="text-xs text-slate-500">
            Press <kbd className="px-1.5 py-0.5 bg-slate-800 border border-slate-700 rounded font-mono text-slate-400">ESC</kbd> to close
          </p>
        </div>
      </div>
    </div>
  )
}
