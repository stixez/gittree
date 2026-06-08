import { useState, useEffect } from 'react'
import * as git from 'isomorphic-git'
import { History, X, AlertCircle, User, Calendar, Inbox } from 'lucide-react'
import { GitCommit } from '../types/git'
import { createFS } from '../services/gitService'
import { useEscapeKey } from '../hooks/useKeyboard'
import { LoadingSkeleton } from './LoadingSkeleton'

interface FileHistoryProps {
  filePath: string
  dirHandle: FileSystemDirectoryHandle
  onClose: () => void
  onCommitClick?: (commit: GitCommit) => void
}

export function FileHistory({ filePath, dirHandle, onClose, onCommitClick }: FileHistoryProps) {
  const [commits, setCommits] = useState<GitCommit[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEscapeKey(onClose)

  useEffect(() => {
    async function loadHistory() {
      try {
        setLoading(true)
        setError(null)

        const log = await git.log({
          fs: createFS(dirHandle),
          dir: '/',
          filepath: filePath,
          ref: 'HEAD',
        })

        const fileCommits: GitCommit[] = log.map((entry) => ({
          oid: entry.oid,
          message: entry.commit.message,
          author: {
            name: entry.commit.author.name,
            email: entry.commit.author.email,
            timestamp: entry.commit.author.timestamp,
          },
          committer: {
            name: entry.commit.committer.name,
            email: entry.commit.committer.email,
            timestamp: entry.commit.committer.timestamp,
          },
          parents: entry.commit.parent || [],
        }))

        setCommits(fileCommits)
      } catch (err) {
        console.error('Failed to load file history:', err)
        setError(err instanceof Error ? err.message : 'Failed to load file history')
      } finally {
        setLoading(false)
      }
    }

    loadHistory()
  }, [filePath, dirHandle])

  const formatDate = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const fileName = filePath.split('/').pop() || filePath

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in"
      onClick={onClose}
    >
      <div
        className="bg-slate-900 border border-slate-800 rounded-xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-slate-950">
          <div className="flex items-center gap-3">
            <History className="w-5 h-5 text-primary flex-shrink-0" />
            <div>
              <h2 className="text-sm font-semibold text-white font-sans">
                File History
              </h2>
              <p className="text-xs text-slate-500 font-mono">
                {filePath}
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
        <div className="flex-1 overflow-y-auto p-4">
          {loading && <LoadingSkeleton type="card" count={5} />}

          {error && (
            <div className="flex items-start gap-3 p-4 bg-red-950/40 border border-red-900/40 rounded-lg">
              <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-red-300 mb-1">Failed to Load History</p>
                <p className="text-xs text-red-400">{error}</p>
              </div>
            </div>
          )}

          {!loading && !error && commits.length === 0 && (
            <div className="flex items-center justify-center h-40">
              <div className="text-center">
                <Inbox className="w-10 h-10 text-slate-700 mx-auto mb-3" />
                <p className="text-sm text-slate-400">
                  No commits found for this file
                </p>
              </div>
            </div>
          )}

          {!loading && !error && commits.length > 0 && (
            <div className="space-y-3">
              {/* Summary */}
              <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-800">
                <p className="text-xs text-slate-400">
                  <span className="font-semibold text-white">
                    {commits.length}
                  </span>{' '}
                  {commits.length === 1 ? 'commit' : 'commits'} modified{' '}
                  <span className="font-mono text-primary">
                    {fileName}
                  </span>
                </p>
              </div>

              {/* Timeline */}
              <div className="relative">
                <div className="absolute left-6 top-0 bottom-0 w-px bg-slate-800" />

                <div className="space-y-4">
                  {commits.map((commit, index) => (
                    <div
                      key={commit.oid}
                      className="relative pl-14 group"
                    >
                      {/* Timeline dot */}
                      <div className="absolute left-4 top-2 w-4 h-4 rounded-full bg-primary border-2 border-slate-900 group-hover:scale-125 transition-transform" />

                      {/* Commit card */}
                      <div
                        className="bg-slate-800/50 hover:bg-slate-800 rounded-lg p-3 border border-slate-800 transition-colors cursor-pointer"
                        onClick={() => onCommitClick?.(commit)}
                      >
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <p className="text-sm font-medium text-white flex-1 font-sans">
                            {commit.message.split('\n')[0]}
                          </p>
                          {index === 0 && (
                            <span className="flex-shrink-0 px-2 py-0.5 text-xs bg-primary/10 border border-primary/20 text-primary rounded font-sans">
                              Latest
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-4 text-xs text-slate-500">
                          <span className="flex items-center gap-1">
                            <User className="w-3 h-3" />
                            {commit.author.name}
                          </span>
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {formatDate(commit.author.timestamp)}
                          </span>
                          <code className="font-mono text-slate-400">{commit.oid.substring(0, 7)}</code>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-3 border-t border-slate-800 bg-slate-950 text-center">
          <p className="text-xs text-slate-500">
            {commits.length > 0 && (
              <>
                First commit: {formatDate(commits[commits.length - 1]?.author.timestamp)} ·{' '}
              </>
            )}
            Press <kbd className="px-1.5 py-0.5 bg-slate-800 border border-slate-700 rounded font-mono text-slate-400">ESC</kbd> to close
          </p>
        </div>
      </div>
    </div>
  )
}
