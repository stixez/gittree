/**
 * Turn a raw clone failure into an actionable, human-readable message.
 *
 * Browsers collapse every network-layer failure — CORS, offline, proxy down,
 * connection dropped because the response was too big — into a single opaque
 * "Failed to fetch" (Chrome), "NetworkError…" (Firefox) or "Load failed"
 * (Safari). For an in-browser clone the most common real cause is the repo
 * simply being too large to pull through the public CORS proxy, so we say so.
 */
export function describeCloneError(error: unknown): string {
  const raw = error instanceof Error ? error.message : String(error)

  if (/failed to fetch|networkerror|load failed|network ?request failed/i.test(raw)) {
    return (
      'Could not reach the repository. Cloning runs through a public CORS proxy ' +
      '(browsers can’t fetch git data from GitHub directly), and that proxy may be ' +
      'down, rate-limited, or blocked right now. Check that you’re online and the ' +
      'URL is correct and public; very large repositories can also exceed browser limits.'
    )
  }

  if (/401|403|authenticat|unauthor/i.test(raw)) {
    return 'Could not access the repository — it may be private. Only public repositories can be cloned.'
  }

  if (/404|not found|repository not found/i.test(raw)) {
    return 'Repository not found. Double-check the URL.'
  }

  return `Failed to clone repository: ${raw}`
}
