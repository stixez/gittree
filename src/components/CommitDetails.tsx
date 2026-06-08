import { useEffect, useMemo } from 'react'
import { X, Copy, GitBranch, Tag, ExternalLink } from 'lucide-react'
import { GitCommit, GitBranch as GitBranchType, GitTag } from '../types/git'
import { FileChanges } from './FileChanges'
import { useEscapeKey } from '../hooks/useKeyboard'
import { parseRemoteUrl, getCommitLink, parseIssueReferences, getIssueLink, getPlatformName } from '../utils/remoteLinks'

interface CommitDetailsProps {
  commit: GitCommit
  branches: GitBranchType[]
  tags: GitTag[]
  dirHandle: FileSystemDirectoryHandle | null
  remoteUrl?: string
  onClose: () => void
  /** Navigate to another commit (e.g. a parent). No-op if it isn't in the graph. */
  onSelectCommit?: (oid: string) => void
  /** Filter the graph to a given author name. */
  onFilterAuthor?: (name: string) => void
  /** Filter the graph to commits touching a path. */
  onFilterPath?: (path: string) => void
}

export function CommitDetails({ commit, branches, tags, dirHandle, remoteUrl, onClose, onSelectCommit, onFilterAuthor, onFilterPath }: CommitDetailsProps) {
  useEscapeKey(onClose)

  const remoteInfo = remoteUrl ? parseRemoteUrl(remoteUrl) : null
  const commitLink = remoteUrl ? getCommitLink(remoteUrl, commit.oid) : null
  const issueNumbers = parseIssueReferences(commit.message)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const panel = document.getElementById('commit-details-panel')
      if (panel && !panel.contains(event.target as Node)) {
        onClose()
      }
    }

    const timer = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside)
    }, 100)

    return () => {
      clearTimeout(timer)
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [onClose])

  const commitBranches = branches.filter(b => b.oid === commit.oid)
  const commitTags = tags.filter(t => t.oid === commit.oid)

  const formatDate = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
  }

  const renderedMessage = useMemo(() => {
    if (!remoteUrl || issueNumbers.length === 0) {
      return <p className="text-sm text-slate-300 whitespace-pre-wrap font-sans">{commit.message}</p>
    }

    const parts: (string | JSX.Element)[] = []
    let lastIndex = 0
    const pattern = /#(\d+)|GH-(\d+)|\b(fixes?|closes?|resolves?)\s+#(\d+)/gi
    let match

    pattern.lastIndex = 0

    while ((match = pattern.exec(commit.message)) !== null) {
      if (match.index > lastIndex) {
        parts.push(commit.message.substring(lastIndex, match.index))
      }

      const issueNum = parseInt(match[1] || match[2] || match[4], 10)
      const issueLink = getIssueLink(remoteUrl, issueNum)

      if (issueLink) {
        parts.push(
          <a
            key={`issue-${match.index}`}
            href={issueLink}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline font-medium"
          >
            {match[0]}
          </a>
        )
      } else {
        parts.push(match[0])
      }

      lastIndex = pattern.lastIndex
    }

    if (lastIndex < commit.message.length) {
      parts.push(commit.message.substring(lastIndex))
    }

    return (
      <p className="text-sm text-slate-300 whitespace-pre-wrap font-sans">
        {parts.map((part, i) => (
          typeof part === 'string' ? <span key={i}>{part}</span> : part
        ))}
      </p>
    )
  }, [commit.message, remoteUrl, issueNumbers.length])

  return (
    <div
      id="commit-details-panel"
      className="fixed inset-y-0 right-0 w-full md:w-96 bg-slate-900 border-l border-slate-800 shadow-2xl overflow-y-auto z-50 animate-slide-in-right"
    >
      {/* Header */}
      <div className="sticky top-0 bg-slate-900 border-b border-slate-800 p-4 compact:p-2 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-white font-sans">
          Commit Details
        </h2>
        <button
          onClick={onClose}
          className="p-1.5 text-slate-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          aria-label="Close"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Content */}
      <div className="p-4 compact:p-2 space-y-5 compact:space-y-3">
        {/* Commit Hash */}
        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1 font-sans">
            Commit Hash
          </label>
          <div className="flex items-center gap-2">
            <code className="flex-1 px-3 py-2 bg-slate-950 text-slate-300 rounded-lg font-mono text-xs break-all border border-slate-800">
              {commit.oid}
            </code>
            <button
              onClick={() => copyToClipboard(commit.oid)}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary flex-shrink-0"
              aria-label="Copy hash"
            >
              <Copy className="w-4 h-4" />
            </button>
          </div>
          <div className="mt-1 text-xs text-slate-500">
            Short: <code className="font-mono text-slate-400">{commit.oid.substring(0, 7)}</code>
          </div>
        </div>

        {/* View on Remote */}
        {commitLink && remoteInfo && (
          <div>
            <a
              href={commitLink}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 px-4 py-2 bg-primary hover:bg-primary-hover text-white rounded-lg transition-colors font-sans text-sm cursor-pointer"
            >
              <ExternalLink className="w-4 h-4" />
              <span>View on {getPlatformName(remoteInfo.platform)}</span>
            </a>
          </div>
        )}

        {/* Message */}
        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1 font-sans">
            Message
            {issueNumbers.length > 0 && (
              <span className="ml-2 text-primary">
                ({issueNumbers.length} issue{issueNumbers.length > 1 ? 's' : ''})
              </span>
            )}
          </label>
          <div className="px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg">
            {renderedMessage}
          </div>
        </div>

        {/* Author */}
        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1 font-sans">
            Author
          </label>
          <div className="px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg space-y-1">
            <button
              onClick={() => onFilterAuthor?.(commit.author.name)}
              disabled={!onFilterAuthor}
              title="Filter by this author"
              className="text-sm font-medium text-white font-sans text-left enabled:hover:text-primary enabled:cursor-pointer transition-colors rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              {commit.author.name}
            </button>
            <div className="flex items-center gap-1.5">
              <p className="text-xs text-slate-400 font-mono truncate">
                {commit.author.email}
              </p>
              <button
                onClick={() => copyToClipboard(commit.author.email)}
                aria-label="Copy author email"
                title="Copy email"
                className="flex-shrink-0 p-1 text-slate-500 hover:text-white hover:bg-white/5 rounded transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                <Copy className="w-3 h-3" />
              </button>
            </div>
            <p className="text-xs text-slate-500">
              {formatDate(commit.author.timestamp)}
            </p>
          </div>
        </div>

        {/* Committer (if different from author) */}
        {commit.committer.email !== commit.author.email && (
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1 font-sans">
              Committer
            </label>
            <div className="px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg space-y-1">
              <p className="text-sm font-medium text-white font-sans">
                {commit.committer.name}
              </p>
              <div className="flex items-center gap-1.5">
                <p className="text-xs text-slate-400 font-mono truncate">
                  {commit.committer.email}
                </p>
                <button
                  onClick={() => copyToClipboard(commit.committer.email)}
                  aria-label="Copy committer email"
                  title="Copy email"
                  className="flex-shrink-0 p-1 text-slate-500 hover:text-white hover:bg-white/5 rounded transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                >
                  <Copy className="w-3 h-3" />
                </button>
              </div>
              <p className="text-xs text-slate-500">
                {formatDate(commit.committer.timestamp)}
              </p>
            </div>
          </div>
        )}

        {/* Parents */}
        {commit.parents.length > 0 && (
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1 font-sans">
              Parent{commit.parents.length > 1 ? 's' : ''} ({commit.parents.length})
            </label>
            <div className="space-y-1">
              {commit.parents.map((parentOid) => (
                <button
                  key={parentOid}
                  onClick={() => onSelectCommit?.(parentOid)}
                  disabled={!onSelectCommit}
                  title="Go to parent commit"
                  className="w-full text-left px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg enabled:hover:border-slate-700 enabled:hover:bg-slate-900 enabled:cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                >
                  <code className="text-xs font-mono text-slate-400">
                    {parentOid.substring(0, 7)}
                  </code>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Branches */}
        {commitBranches.length > 0 && (
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1 font-sans">
              Branches
            </label>
            <div className="flex flex-wrap gap-2">
              {commitBranches.map((branch) => (
                <div
                  key={branch.name}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-primary/10 border border-primary/20 text-primary rounded-full text-xs font-medium font-sans"
                >
                  <GitBranch className="w-3 h-3" />
                  {branch.name}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tags */}
        {commitTags.length > 0 && (
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1 font-sans">
              Tags
            </label>
            <div className="flex flex-wrap gap-2">
              {commitTags.map((tag) => (
                <div
                  key={tag.name}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-amber-950/40 border border-amber-900/30 text-amber-400 rounded-full text-xs font-medium font-sans"
                >
                  <Tag className="w-3 h-3" />
                  {tag.name}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* File Changes */}
        <div>
          <label className="block text-xs font-medium text-slate-500 mb-2 font-sans">
            Changed Files
          </label>
          <FileChanges commitOid={commit.oid} dirHandle={dirHandle} onFilterPath={onFilterPath} />
        </div>
      </div>
    </div>
  )
}
