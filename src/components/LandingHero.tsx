import { GitBranch, Folder, Globe, Loader2 } from 'lucide-react'
import { ErrorMessage } from './ErrorMessage'

interface LandingHeroProps {
  onOpenLocal: () => void
  onCloneRemote: () => void
  loading: boolean
  error: string | null
  onRetry: () => void
  onDismiss: () => void
}

export function LandingHero({ onOpenLocal, onCloneRemote, loading, error, onRetry, onDismiss }: LandingHeroProps) {
  return (
    <section className="relative z-10" style={{ minHeight: 'calc(100vh - 3.5rem)' }}>
      {/* Foreground (the animated graph is a page-level backdrop behind this) */}
      <div
        className="flex min-h-[inherit] flex-col items-center justify-center px-6 py-20 text-center"
        style={{ textShadow: '0 2px 24px rgba(0,0,0,0.75)' }}
      >
        <div className="mb-6 inline-flex items-center justify-center rounded-2xl border border-primary/30 bg-primary/10 p-3 shadow-[0_0_40px_-8px_rgba(210,75,75,0.6)]">
          <GitBranch className="h-7 w-7 text-primary" />
        </div>

        <h1 className="font-sans text-5xl font-bold tracking-tight text-white sm:text-6xl">
          git<span className="text-primary">tree</span>
        </h1>

        <p className="mt-4 max-w-xl text-balance text-lg text-slate-300">
          Your repository's history, rendered as a living graph.
        </p>
        <p className="mt-2 max-w-xl text-sm text-slate-500">
          Open a local repo or clone a public one — pan, zoom, search, and trace every branch. Entirely in your browser.
        </p>

        <div className="mt-9 flex flex-col items-center gap-3 sm:flex-row">
          <button
            onClick={onOpenLocal}
            disabled={loading}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-7 py-3.5 font-medium text-white shadow-[0_0_30px_-6px_rgba(210,75,75,0.7)] transition-colors hover:bg-primary-hover disabled:opacity-50 cursor-pointer font-sans"
          >
            {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Folder className="h-5 w-5" />}
            {loading ? 'Loading…' : 'Open Local Folder'}
          </button>
          <button
            onClick={onCloneRemote}
            disabled={loading}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-700 bg-slate-900/70 px-7 py-3.5 font-medium text-slate-200 backdrop-blur-sm transition-colors hover:border-slate-600 hover:bg-slate-800 disabled:opacity-50 cursor-pointer font-sans"
          >
            <Globe className="h-5 w-5" />
            Clone Remote
          </button>
        </div>

        {error && (
          <div className="mt-6 w-full max-w-md text-left">
            <ErrorMessage title="Failed to open repository" message={error} onRetry={onRetry} onDismiss={onDismiss} />
          </div>
        )}

        <p className="mt-10 font-mono text-xs text-slate-600">
          No backend · no tracking · nothing leaves your machine · Chrome &amp; Edge
        </p>
      </div>
    </section>
  )
}
