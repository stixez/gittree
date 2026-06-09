import { useState, useRef, useCallback, useEffect, type Ref, type KeyboardEvent } from 'react'
import { Search, X } from 'lucide-react'

interface SearchBarProps {
  onSearch: (query: string) => void
  placeholder?: string
  /** External value — keeps the input in sync when search is cleared/restored elsewhere. */
  value?: string
  /** Forwarded to the underlying input so a shortcut (Cmd/Ctrl+K) can focus it. */
  inputRef?: Ref<HTMLInputElement>
  /** Enter → next match; Shift+Enter → previous match (camera steps to each). */
  onNext?: () => void
  onPrev?: () => void
  /** Total matches for the active query; undefined hides the counter. */
  matchCount?: number
  /** 1-based position of the match the camera is on; 0 before the first step. */
  matchPosition?: number
}

export function SearchBar({ onSearch, placeholder = 'Search commits...', value, inputRef, onNext, onPrev, matchCount, matchPosition = 0 }: SearchBarProps) {
  const [query, setQuery] = useState(value ?? '')
  const debounceRef = useRef<ReturnType<typeof setTimeout>>()
  // The query the parent has actually searched (and thus has matches for).
  // Navigation only fires when the input matches it, so Enter never steps
  // against a stale match set.
  const committedRef = useRef(value ?? '')

  const commit = useCallback((v: string) => {
    committedRef.current = v
    onSearch(v)
  }, [onSearch])

  // Debounce search to avoid recalculating filters on every keystroke
  const debouncedSearch = useCallback((value: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => commit(value), 200)
  }, [commit])

  // Reflect external changes (e.g. Clear Filters / URL restore). Display-only —
  // doesn't re-fire onSearch. Debounce settles before this lands, so it never
  // fights live typing.
  useEffect(() => {
    if (value !== undefined) { setQuery(value); committedRef.current = value }
  }, [value])

  useEffect(() => {
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [])

  const handleChange = (value: string) => {
    setQuery(value)
    debouncedSearch(value)
  }

  const handleClear = () => {
    setQuery('')
    if (debounceRef.current) clearTimeout(debounceRef.current)
    commit('')
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== 'Enter') return
    e.preventDefault()
    // If the typed query hasn't been searched yet, commit it now and let the
    // matches settle; the next Enter navigates against the fresh set. Only step
    // when the input already reflects the active match set.
    if (query !== committedRef.current) {
      if (debounceRef.current) clearTimeout(debounceRef.current)
      commit(query)
      return
    }
    if (e.shiftKey) onPrev?.()
    else onNext?.()
  }

  const showCounter = matchCount !== undefined && query.trim() !== ''

  return (
    <div className="relative">
      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
        <Search className="w-4 h-4 text-slate-500" />
      </div>
      <input
        ref={inputRef}
        type="text"
        value={query}
        onChange={(e) => handleChange(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        aria-label="Search commits"
        className={`w-full pl-10 ${showCounter ? 'pr-28' : 'pr-10'} py-2.5 compact:py-1.5 border border-slate-800 rounded-lg bg-slate-900 text-white placeholder-slate-500 focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all font-sans`}
      />
      {showCounter && (
        <span
          className="absolute inset-y-0 right-10 flex items-center text-xs font-mono text-slate-500 tabular-nums pointer-events-none"
          title="Press Enter for next match, Shift+Enter for previous"
        >
          {matchCount === 0 ? 'No matches' : `${matchPosition > 0 ? matchPosition : '–'} / ${matchCount}`}
        </span>
      )}
      {query && (
        <button
          onClick={handleClear}
          className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-500 hover:text-slate-300 cursor-pointer transition-colors"
          aria-label="Clear search"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  )
}
