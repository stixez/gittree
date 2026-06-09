/**
 * Utilities for managing application state in URL parameters
 * Enables sharing specific views (commit, filters, search, etc.)
 */

export interface UrlState {
  // Repository identification
  repo?: string           // Repository name (for cloned repos)
  
  // Filters
  branch?: string         // Selected branch
  author?: string         // Selected author name
  search?: string         // Search query
  dateFrom?: string       // Date range start (YYYY-MM-DD)
  dateTo?: string         // Date range end (YYYY-MM-DD)
  path?: string           // Path filter (file or directory prefix)

  // Selection
  commit?: string         // Selected commit hash (short or full)
  
  // View state
  compare?: string        // Branch comparison mode ("branch1...branch2")
}

/**
 * Parse URL parameters into state object
 */
export function parseUrlState(): UrlState {
  const params = new URLSearchParams(window.location.hash.slice(1))
  
  return {
    repo: params.get('repo') || undefined,
    branch: params.get('branch') || undefined,
    author: params.get('author') || undefined,
    search: params.get('search') || undefined,
    dateFrom: params.get('dateFrom') || undefined,
    dateTo: params.get('dateTo') || undefined,
    path: params.get('path') || undefined,
    commit: params.get('commit') || undefined,
    compare: params.get('compare') || undefined,
  }
}

/**
 * Update URL with current state (without page reload)
 */
export function updateUrlState(state: Partial<UrlState>): void {
  const current = parseUrlState()
  const merged = { ...current, ...state }
  
  // Remove undefined values
  const cleaned = Object.fromEntries(
    Object.entries(merged).filter(([_, v]) => v !== undefined && v !== null && v !== '')
  )
  
  const params = new URLSearchParams(cleaned as Record<string, string>)
  const hash = params.toString()
  
  // Update URL without reload
  if (hash) {
    window.history.replaceState(null, '', `#${hash}`)
  } else {
    window.history.replaceState(null, '', window.location.pathname)
  }
}

/**
 * Clear specific state keys from URL
 */
export function clearUrlState(...keys: (keyof UrlState)[]): void {
  const current = parseUrlState()
  
  for (const key of keys) {
    delete current[key]
  }
  
  const params = new URLSearchParams(
    Object.fromEntries(
      // Same filter as updateUrlState so an empty-string value doesn't survive a
      // clear and reappear as "?key=" in the URL.
      Object.entries(current).filter(([_, v]) => v !== undefined && v !== null && v !== '')
    ) as Record<string, string>
  )
  
  const hash = params.toString()
  if (hash) {
    window.history.replaceState(null, '', `#${hash}`)
  } else {
    window.history.replaceState(null, '', window.location.pathname)
  }
}

/**
 * Generate a shareable URL for current state
 */
export function generateShareUrl(state: UrlState): string {
  const cleaned = Object.fromEntries(
    Object.entries(state).filter(([_, v]) => v !== undefined && v !== null && v !== '')
  )
  
  const params = new URLSearchParams(cleaned as Record<string, string>)
  const hash = params.toString()
  
  const baseUrl = window.location.origin + window.location.pathname
  return hash ? `${baseUrl}#${hash}` : baseUrl
}

/**
 * Copy shareable URL to clipboard
 */
export async function copyShareUrl(state: UrlState): Promise<void> {
  const url = generateShareUrl(state)
  await navigator.clipboard.writeText(url)
}

/**
 * Listen for hash changes (back/forward navigation)
 */
export function onUrlStateChange(callback: (state: UrlState) => void): () => void {
  const handler = () => {
    callback(parseUrlState())
  }
  
  window.addEventListener('hashchange', handler)
  
  // Return cleanup function
  return () => window.removeEventListener('hashchange', handler)
}
