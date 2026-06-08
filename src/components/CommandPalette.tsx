import { useEffect, useMemo, useRef, useState } from 'react'
import { Search, GitBranch, Tag, GitCommit, Zap } from 'lucide-react'
import { useEscapeKey } from '../hooks/useKeyboard'
import { rankItems } from '../utils/fuzzy'
import type { PaletteItem } from '../utils/paletteItems'

interface Props {
  refItems: PaletteItem[]      // branches + tags
  commitItems: PaletteItem[]   // all commits
  actions: PaletteItem[]
  onClose: () => void
  onSelectOid: (oid: string) => void
}

const ICONS = {
  branch: GitBranch,
  tag: Tag,
  commit: GitCommit,
  action: Zap,
} as const

export function CommandPalette({ refItems, commitItems, actions, onClose, onSelectOid }: Props) {
  useEscapeKey(onClose)
  const [query, setQuery] = useState('')
  const [active, setActive] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => { inputRef.current?.focus() }, [])

  // Flat, ranked result list. Commits only included once the user types (keeps
  // the empty state small and avoids ranking 50k items on an empty query).
  const results = useMemo(() => {
    const refs = rankItems(query, refItems, (i) => i.label, 20)
    const acts = rankItems(query, actions, (i) => i.label, 20)
    const commits = query
      ? rankItems(query, commitItems, (i) => `${i.label} ${i.kind === 'commit' ? i.sublabel ?? '' : ''}`, 30)
      : []
    return [...refs, ...commits, ...acts]
  }, [query, refItems, commitItems, actions])

  useEffect(() => { setActive(0) }, [query])

  const run = (item: PaletteItem) => {
    if (item.kind === 'action') item.run()
    else onSelectOid(item.oid)
    onClose()
  }

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive((a) => Math.min(a + 1, results.length - 1)) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive((a) => Math.max(a - 1, 0)) }
    else if (e.key === 'Enter') { e.preventDefault(); const it = results[active]; if (it) run(it) }
  }

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-start justify-center z-50 animate-fade-in pt-[12vh]"
      onClick={onClose}
    >
      <div
        className="bg-slate-900 border border-slate-800 rounded-xl shadow-2xl w-full max-w-xl mx-4 overflow-hidden animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 px-4 border-b border-slate-800">
          <Search className="w-4 h-4 text-slate-500 flex-shrink-0" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Jump to a branch, tag, commit, or run an action…"
            aria-label="Command palette"
            className="w-full py-3 bg-transparent text-white placeholder-slate-500 outline-none font-sans text-sm"
          />
        </div>

        <ul className="max-h-80 overflow-y-auto py-1" role="listbox">
          {results.length === 0 && (
            <li className="px-4 py-6 text-center text-sm text-slate-500">No matches</li>
          )}
          {results.map((item, i) => {
            const Icon = ICONS[item.kind]
            const sub = item.kind !== 'action' ? item.sublabel : undefined
            return (
              <li
                key={item.id}
                role="option"
                aria-selected={i === active}
                onMouseEnter={() => setActive(i)}
                onClick={() => run(item)}
                className={`flex items-center gap-3 px-4 py-2 cursor-pointer ${i === active ? 'bg-slate-800' : ''}`}
              >
                <Icon className="w-4 h-4 text-slate-500 flex-shrink-0" />
                <span className="flex-1 min-w-0 truncate text-sm text-slate-200">{item.label}</span>
                {sub && <span className="flex-shrink-0 text-xs font-mono text-slate-500">{sub}</span>}
              </li>
            )
          })}
        </ul>
      </div>
    </div>
  )
}
