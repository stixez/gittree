import { GitBranch as GitBranchIcon } from 'lucide-react'
import { GitBranch } from '../types/git'

interface FiltersProps {
  branches: GitBranch[]
  selectedBranch: string
  onBranchChange: (branch: string) => void
  authors: string[]
  selectedAuthor: string
  onAuthorChange: (author: string) => void
  dateFrom: string
  dateTo: string
  onDateFromChange: (date: string) => void
  onDateToChange: (date: string) => void
  onClearFilters: () => void
  pathFilter: string
  onPathChange: (path: string) => void
  pathStatus: { computing: boolean; current: number; total: number }
}

export function Filters({
  branches,
  selectedBranch,
  onBranchChange,
  authors,
  selectedAuthor,
  onAuthorChange,
  dateFrom,
  dateTo,
  onDateFromChange,
  onDateToChange,
  onClearFilters,
  pathFilter,
  onPathChange,
  pathStatus,
}: FiltersProps) {
  const hasActiveFilters = selectedBranch !== 'all' || selectedAuthor !== 'all' || dateFrom || dateTo || pathFilter

  const inputClass = "w-full px-3 py-2 border border-slate-800 rounded-lg bg-slate-950 text-white text-sm focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all font-sans [color-scheme:dark]"
  const labelClass = "block text-xs font-medium text-slate-400 mb-2"

  return (
    <div className="bg-slate-900 rounded-xl border border-slate-800 p-4 compact:p-2">
      <div className="flex items-center justify-between mb-4 compact:mb-2">
        <h3 className="text-sm font-semibold text-white font-sans flex items-center gap-2">
          <GitBranchIcon className="w-4 h-4 text-slate-400" />
          Filters
        </h3>
        {hasActiveFilters && (
          <button
            onClick={onClearFilters}
            className="text-xs text-primary hover:text-primary-hover transition-colors cursor-pointer"
          >
            Clear all
          </button>
        )}
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4 compact:gap-2">
        <div>
          <label className={labelClass}>Branch</label>
          <select
            value={selectedBranch}
            onChange={(e) => onBranchChange(e.target.value)}
            className={inputClass}
          >
            <option value="all">All branches</option>
            {branches.map((branch) => (
              <option key={branch.name} value={branch.name}>
                {branch.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className={labelClass}>Author</label>
          <select
            value={selectedAuthor}
            onChange={(e) => onAuthorChange(e.target.value)}
            className={inputClass}
          >
            <option value="all">All authors</option>
            {authors.map((author) => (
              <option key={author} value={author}>
                {author}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className={labelClass}>From Date</label>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => onDateFromChange(e.target.value)}
            className={inputClass}
          />
        </div>

        <div>
          <label className={labelClass}>To Date</label>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => onDateToChange(e.target.value)}
            className={inputClass}
          />
        </div>

        <div className="md:col-span-2 lg:col-span-4">
          <label className={labelClass}>Path (file or directory)</label>
          <div className="relative">
            <input
              type="text"
              value={pathFilter}
              onChange={(e) => onPathChange(e.target.value)}
              placeholder="e.g. src/renderer/ or src/App.tsx"
              className={inputClass}
            />
            {pathFilter && (
              <button
                onClick={() => onPathChange('')}
                aria-label="Clear path filter"
                title="Clear path filter"
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-500 hover:text-slate-300 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded"
              >
                ✕
              </button>
            )}
          </div>
          {pathStatus.computing && (
            <p className="mt-1 text-xs text-slate-500">
              Scanning history… {pathStatus.current}/{pathStatus.total}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
