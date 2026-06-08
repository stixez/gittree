import { useState, useEffect } from 'react'
import * as git from 'isomorphic-git'
import { Plus, Pencil, Minus, File, Eye, History, Download, AlertCircle, GitCompare, Filter } from 'lucide-react'
import { FileChange, getChangedFiles, createFS } from '../services/gitService'
import { LoadingSkeleton } from './LoadingSkeleton'
import { CodeViewer } from './CodeViewer'
import { DiffViewer } from './DiffViewer'
import { FileHistory } from './FileHistory'

interface FileChangesProps {
  commitOid: string
  dirHandle: FileSystemDirectoryHandle | null
  onFilterPath?: (path: string) => void
}

export function FileChanges({ commitOid, dirHandle, onFilterPath }: FileChangesProps) {
  const [files, setFiles] = useState<FileChange[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [viewingFile, setViewingFile] = useState<string | null>(null)
  const [diffFile, setDiffFile] = useState<string | null>(null)
  const [historyFile, setHistoryFile] = useState<string | null>(null)

  useEffect(() => {
    async function loadFiles() {
      if (!dirHandle) {
        setError('No directory handle available')
        setLoading(false)
        return
      }

      try {
        setLoading(true)
        setError(null)
        const changes = await getChangedFiles(dirHandle, commitOid)
        setFiles(changes)
      } catch (err) {
        console.error('Error loading file changes:', err)
        setError(err instanceof Error ? err.message : 'Failed to load file changes')
      } finally {
        setLoading(false)
      }
    }

    loadFiles()
  }, [commitOid, dirHandle])

  const handleDownload = async (filePath: string) => {
    if (!dirHandle) return

    try {
      const { blob } = await git.readBlob({
        fs: createFS(dirHandle),
        dir: '/',
        oid: commitOid,
        filepath: filePath,
      })

      const fileName = filePath.split('/').pop() || 'file'
      const blobObj = new Blob([new Uint8Array(blob)], { type: 'application/octet-stream' })
      const url = URL.createObjectURL(blobObj)
      const a = document.createElement('a')
      a.href = url
      a.download = fileName
      a.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      console.error('Failed to download file:', err)
    }
  }

  if (loading) {
    return <LoadingSkeleton type="file" count={5} />
  }

  if (error) {
    return (
      <div className="flex items-start gap-2 p-3 bg-red-950/40 border border-red-900/40 rounded-lg">
        <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
        <p className="text-xs text-red-300">
          {error}
        </p>
      </div>
    )
  }

  if (files.length === 0) {
    return (
      <div className="p-4 bg-slate-950 border border-slate-800 rounded-lg text-center">
        <p className="text-xs text-slate-500">
          No file changes detected
        </p>
      </div>
    )
  }

  const getFileIcon = (type: FileChange['type']) => {
    switch (type) {
      case 'added':
        return <Plus className="w-3.5 h-3.5" />
      case 'modified':
        return <Pencil className="w-3.5 h-3.5" />
      case 'deleted':
        return <Minus className="w-3.5 h-3.5" />
      default:
        return <File className="w-3.5 h-3.5" />
    }
  }

  const getFileColor = (type: FileChange['type']) => {
    switch (type) {
      case 'added':
        return 'text-accent-green'
      case 'modified':
        return 'text-amber-400'
      case 'deleted':
        return 'text-red-400'
      default:
        return 'text-slate-400'
    }
  }

  const getTypeLabel = (type: FileChange['type']) => {
    switch (type) {
      case 'added':
        return 'Added'
      case 'modified':
        return 'Modified'
      case 'deleted':
        return 'Deleted'
      default:
        return 'Changed'
    }
  }

  const grouped = files.reduce((acc, file) => {
    if (!acc[file.type]) {
      acc[file.type] = []
    }
    acc[file.type].push(file)
    return acc
  }, {} as Record<string, FileChange[]>)

  return (
    <div className="space-y-3 compact:space-y-1.5">
      {/* Summary */}
      <div className="flex items-center gap-3 text-xs">
        {grouped.added && (
          <span className="flex items-center gap-1 text-accent-green">
            <Plus className="w-3 h-3" />
            {grouped.added.length} added
          </span>
        )}
        {grouped.modified && (
          <span className="flex items-center gap-1 text-amber-400">
            <Pencil className="w-3 h-3" />
            {grouped.modified.length} modified
          </span>
        )}
        {grouped.deleted && (
          <span className="flex items-center gap-1 text-red-400">
            <Minus className="w-3 h-3" />
            {grouped.deleted.length} deleted
          </span>
        )}
      </div>

      {/* File List */}
      <div className="space-y-1 max-h-96 overflow-y-auto">
        {files.map((file, index) => (
          <div
            key={`${file.path}-${index}`}
            className="flex items-start gap-2 p-2 compact:p-1 rounded-lg hover:bg-slate-800/50 transition-colors group"
          >
            <span className={`flex-shrink-0 mt-0.5 ${getFileColor(file.type)}`}>
              {getFileIcon(file.type)}
            </span>
            <div className="flex-1 min-w-0">
              <p className={`text-xs font-mono truncate ${getFileColor(file.type)}`}>
                {file.path}
              </p>
              <p className="text-xs text-slate-600">
                {getTypeLabel(file.type)}
              </p>
            </div>
            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              {onFilterPath && (
                <button
                  onClick={() => onFilterPath(file.path)}
                  className="p-1 text-slate-400 hover:text-white hover:bg-white/5 rounded transition-colors cursor-pointer"
                  title="Filter graph by this path"
                  aria-label="Filter graph by this path"
                >
                  <Filter className="w-3.5 h-3.5" />
                </button>
              )}
              <button
                onClick={() => setDiffFile(file.path)}
                className="p-1 text-slate-400 hover:text-white hover:bg-white/5 rounded transition-colors cursor-pointer"
                title="View diff"
              >
                <GitCompare className="w-3.5 h-3.5" />
              </button>
              {file.type !== 'deleted' && (
                <>
                  <button
                    onClick={() => setViewingFile(file.path)}
                    className="p-1 text-slate-400 hover:text-white hover:bg-white/5 rounded transition-colors cursor-pointer"
                    title="View code"
                  >
                    <Eye className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => setHistoryFile(file.path)}
                    className="p-1 text-slate-400 hover:text-white hover:bg-white/5 rounded transition-colors cursor-pointer"
                    title="View history"
                  >
                    <History className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleDownload(file.path)}
                    className="p-1 text-slate-400 hover:text-white hover:bg-white/5 rounded transition-colors cursor-pointer"
                    title="Download file"
                  >
                    <Download className="w-3.5 h-3.5" />
                  </button>
                </>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Code Viewer Modal */}
      {viewingFile && dirHandle && (
        <CodeViewer
          filePath={viewingFile}
          commitOid={commitOid}
          dirHandle={dirHandle}
          onClose={() => setViewingFile(null)}
        />
      )}

      {/* Diff Viewer Modal */}
      {diffFile && dirHandle && (
        <DiffViewer
          filePath={diffFile}
          commitOid={commitOid}
          dirHandle={dirHandle}
          onClose={() => setDiffFile(null)}
        />
      )}

      {/* File History Modal */}
      {historyFile && dirHandle && (
        <FileHistory
          filePath={historyFile}
          dirHandle={dirHandle}
          onClose={() => setHistoryFile(null)}
          onCommitClick={(commit) => {
            console.log('Navigate to commit:', commit.oid)
          }}
        />
      )}
    </div>
  )
}
