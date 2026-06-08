import { useState, useEffect, useMemo } from 'react'
import { GitCompare, Copy, X, AlertCircle, Loader2, FileX2 } from 'lucide-react'
import { getFileDiff, FileDiff } from '../services/gitService'
import { diffLines, collapseContext } from '../utils/lineDiff'
import { useEscapeKey } from '../hooks/useKeyboard'

interface DiffViewerProps {
  filePath: string
  commitOid: string
  dirHandle: FileSystemDirectoryHandle
  onClose: () => void
}

export function DiffViewer({ filePath, commitOid, dirHandle, onClose }: DiffViewerProps) {
  const [diff, setDiff] = useState<FileDiff | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEscapeKey(onClose)

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        setLoading(true)
        setError(null)
        const result = await getFileDiff(dirHandle, commitOid, filePath)
        if (!cancelled) setDiff(result)
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load diff')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [filePath, commitOid, dirHandle])

  const rows = useMemo(() => {
    if (!diff || diff.binary) return []
    return collapseContext(diffLines(diff.oldText ?? '', diff.newText ?? ''))
  }, [diff])

  const { adds, dels } = useMemo(() => {
    let adds = 0, dels = 0
    for (const r of rows) {
      if (r.type === 'add') adds++
      else if (r.type === 'del') dels++
    }
    return { adds, dels }
  }, [rows])

  const fileName = filePath.split('/').pop() || filePath

  const copyDiff = () => {
    const text = rows
      .map((r) => (r.type === 'add' ? '+' : r.type === 'del' ? '-' : r.type === 'sep' ? '…' : ' ') + ('text' in r ? r.text : ` ${r.count} unchanged lines`))
      .join('\n')
    navigator.clipboard.writeText(text)
  }

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in"
      onClick={onClose}
    >
      <div
        className="bg-slate-900 border border-slate-800 rounded-xl shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-slate-950">
          <div className="flex items-center gap-3 min-w-0">
            <GitCompare className="w-5 h-5 text-primary flex-shrink-0" />
            <div className="min-w-0">
              <h2 className="text-sm font-semibold text-white font-sans truncate">{fileName}</h2>
              <p className="text-xs text-slate-500 font-mono truncate">{filePath}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 flex-shrink-0">
            {diff && !diff.binary && (
              <span className="text-xs font-mono">
                <span className="text-accent-green">+{adds}</span>{' '}
                <span className="text-red-400">−{dels}</span>
              </span>
            )}
            <button
              onClick={copyDiff}
              disabled={!rows.length}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-slate-300 hover:text-white border border-slate-800 hover:border-slate-700 rounded-lg transition-colors disabled:opacity-50 cursor-pointer font-sans"
              title="Copy diff"
            >
              <Copy className="w-3.5 h-3.5" />
              Copy
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto bg-slate-950">
          {loading && (
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <Loader2 className="w-8 h-8 text-primary animate-spin mx-auto mb-3" />
                <p className="text-sm text-slate-400">Computing diff…</p>
              </div>
            </div>
          )}

          {error && (
            <div className="flex items-center justify-center h-64 p-6">
              <div className="flex items-start gap-3 max-w-md bg-red-950/40 border border-red-900/40 rounded-lg p-5">
                <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-red-300 mb-1">Failed to Load Diff</p>
                  <p className="text-xs text-red-400">{error}</p>
                </div>
              </div>
            </div>
          )}

          {diff && !loading && !error && diff.binary && (
            <div className="flex items-center justify-center h-64 text-center">
              <div>
                <FileX2 className="w-8 h-8 text-slate-600 mx-auto mb-3" />
                <p className="text-sm text-slate-400">Binary file — diff not shown.</p>
              </div>
            </div>
          )}

          {diff && !loading && !error && !diff.binary && (
            rows.length === 0 ? (
              <div className="flex items-center justify-center h-64">
                <p className="text-sm text-slate-500">No changes to display.</p>
              </div>
            ) : (
              <div className="font-mono text-[0.8125rem] leading-6 min-w-max">
                {rows.map((r, i) => {
                  if (r.type === 'sep') {
                    return (
                      <div key={i} className="flex items-center px-3 py-1 bg-slate-900/60 text-slate-600 text-xs select-none">
                        <span className="w-[6.5em] flex-shrink-0" />
                        ⋯ {r.count} unchanged line{r.count === 1 ? '' : 's'}
                      </div>
                    )
                  }
                  const bg = r.type === 'add' ? 'bg-accent-green/10' : r.type === 'del' ? 'bg-red-500/10' : ''
                  const sign = r.type === 'add' ? '+' : r.type === 'del' ? '−' : ' '
                  const signColor = r.type === 'add' ? 'text-accent-green' : r.type === 'del' ? 'text-red-400' : 'text-slate-600'
                  return (
                    <div key={i} className={`flex ${bg}`}>
                      <span className="w-[3.25em] flex-shrink-0 px-1 text-right text-slate-600 select-none border-r border-slate-800/60">{r.oldNo ?? ''}</span>
                      <span className="w-[3.25em] flex-shrink-0 px-1 text-right text-slate-600 select-none border-r border-slate-800/60">{r.newNo ?? ''}</span>
                      <span className={`w-[1.5em] flex-shrink-0 text-center select-none ${signColor}`}>{sign}</span>
                      <span className="whitespace-pre px-2 text-slate-200">{r.text || ' '}</span>
                    </div>
                  )
                })}
              </div>
            )
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-3 border-t border-slate-800 bg-slate-950 text-center">
          <p className="text-xs text-slate-500">
            Diff against parent commit · Press{' '}
            <kbd className="px-1.5 py-0.5 bg-slate-800 border border-slate-700 rounded font-mono text-slate-400">ESC</kbd> to close
          </p>
        </div>
      </div>
    </div>
  )
}
