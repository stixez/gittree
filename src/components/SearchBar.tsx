import { useState, useRef, useCallback, useEffect, type Ref } from 'react'
import { Search, X } from 'lucide-react'

interface SearchBarProps {
  onSearch: (query: string) => void
  placeholder?: string
  /** External value — keeps the input in sync when search is cleared/restored elsewhere. */
  value?: string
  /** Forwarded to the underlying input so a shortcut (Cmd/Ctrl+K) can focus it. */
  inputRef?: Ref<HTMLInputElement>
}

export function SearchBar({ onSearch, placeholder = 'Search commits...', value, inputRef }: SearchBarProps) {
  const [query, setQuery] = useState(value ?? '')
  const debounceRef = useRef<ReturnType<typeof setTimeout>>()

  // Debounce search to avoid recalculating filters on every keystroke
  const debouncedSearch = useCallback((value: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => onSearch(value), 200)
  }, [onSearch])

  // Reflect external changes (e.g. Clear Filters / URL restore). Display-only —
  // doesn't re-fire onSearch. Debounce settles before this lands, so it never
  // fights live typing.
  useEffect(() => {
    if (value !== undefined) setQuery(value)
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
    onSearch('')
  }

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
        placeholder={placeholder}
        aria-label="Search commits"
        className="w-full pl-10 pr-10 py-2.5 compact:py-1.5 border border-slate-800 rounded-lg bg-slate-900 text-white placeholder-slate-500 focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all font-sans"
      />
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
