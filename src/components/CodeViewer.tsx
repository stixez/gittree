import { useState, useEffect } from 'react'
// Full highlight.js build: every language is registered, so we don't have to
// hand-maintain a per-language import list. Coverage matters here because the
// app browses arbitrary repositories.
import SyntaxHighlighter from 'react-syntax-highlighter'
import { atomOneDark } from 'react-syntax-highlighter/dist/esm/styles/hljs'
import * as git from 'isomorphic-git'
import { FileCode2, Copy, Download, X, AlertCircle, Loader2 } from 'lucide-react'
import { createFS } from '../services/gitService'
import { useEscapeKey } from '../hooks/useKeyboard'

interface CodeViewerProps {
  filePath: string
  commitOid: string
  dirHandle: FileSystemDirectoryHandle
  onClose: () => void
}

// Maps a file path to a highlight.js language id. The full build registers
// every language, so these ids just need to match highlight.js naming.
// Exported for unit testing (pure helper; not a component — HMR hint is moot).
// eslint-disable-next-line react-refresh/only-export-components
export function detectLanguage(filePath: string): string {
  const name = (filePath.split('/').pop() || filePath).toLowerCase()

  // A few files are recognised by full name rather than extension.
  const nameMap: Record<string, string> = {
    'dockerfile': 'dockerfile',
    'makefile': 'makefile',
    'cmakelists.txt': 'cmake',
    '.gitignore': 'plaintext',
    'go.mod': 'go',
    'go.sum': 'plaintext',
  }
  if (nameMap[name]) return nameMap[name]

  const ext = name.includes('.') ? name.split('.').pop()! : ''

  const langMap: Record<string, string> = {
    // JS / TS
    'js': 'javascript', 'jsx': 'javascript', 'mjs': 'javascript', 'cjs': 'javascript',
    'ts': 'typescript', 'tsx': 'typescript', 'mts': 'typescript', 'cts': 'typescript',
    // JVM
    'java': 'java', 'kt': 'kotlin', 'kts': 'kotlin', 'scala': 'scala', 'groovy': 'groovy',
    'gradle': 'groovy', 'clj': 'clojure', 'cljs': 'clojure',
    // C family
    'c': 'c', 'h': 'c', 'cpp': 'cpp', 'cc': 'cpp', 'cxx': 'cpp', 'hpp': 'cpp', 'hh': 'cpp',
    'cs': 'csharp', 'm': 'objectivec', 'mm': 'objectivec',
    // Systems / modern
    'go': 'go', 'rs': 'rust', 'swift': 'swift', 'dart': 'dart', 'zig': 'zig', 'nim': 'nim',
    // Scripting
    'py': 'python', 'pyw': 'python', 'rb': 'ruby', 'php': 'php', 'pl': 'perl', 'pm': 'perl',
    'lua': 'lua', 'r': 'r', 'jl': 'julia', 'ex': 'elixir', 'exs': 'elixir', 'erl': 'erlang',
    'hs': 'haskell',
    // Shell
    'sh': 'bash', 'bash': 'bash', 'zsh': 'bash', 'fish': 'bash', 'ps1': 'powershell',
    // Web / markup
    'html': 'xml', 'htm': 'xml', 'xml': 'xml', 'svg': 'xml', 'vue': 'xml',
    'css': 'css', 'scss': 'scss', 'sass': 'scss', 'less': 'less',
    'md': 'markdown', 'markdown': 'markdown', 'tex': 'latex',
    // Data / config
    'json': 'json', 'jsonc': 'json', 'json5': 'json',
    'yaml': 'yaml', 'yml': 'yaml', 'toml': 'toml', 'ini': 'ini', 'cfg': 'ini',
    'conf': 'ini', 'properties': 'properties', 'env': 'bash',
    'sql': 'sql', 'graphql': 'graphql', 'gql': 'graphql', 'proto': 'protobuf',
    'diff': 'diff', 'patch': 'diff', 'dockerfile': 'dockerfile', 'cmake': 'cmake',
  }

  return langMap[ext] || 'plaintext'
}

export function CodeViewer({ filePath, commitOid, dirHandle, onClose }: CodeViewerProps) {
  const [content, setContent] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEscapeKey(onClose)

  useEffect(() => {
    async function loadFile() {
      try {
        setLoading(true)
        setError(null)

        const { blob } = await git.readBlob({
          fs: createFS(dirHandle),
          dir: '/',
          oid: commitOid,
          filepath: filePath,
        })

        const decoder = new TextDecoder('utf-8')
        const text = decoder.decode(blob)

        setContent(text)
      } catch (err) {
        console.error('Failed to load file:', err)
        const msg = err instanceof Error ? err.message : 'Failed to load file'
        setError(/blob but it is a tree/i.test(msg) ? 'This path is a directory, not a file.' : msg)
      } finally {
        setLoading(false)
      }
    }

    loadFile()
  }, [filePath, commitOid, dirHandle])

  const language = detectLanguage(filePath)
  const fileName = filePath.split('/').pop() || filePath

  const copyToClipboard = () => {
    if (content) {
      navigator.clipboard.writeText(content)
    }
  }

  const downloadFile = () => {
    if (!content) return

    const blob = new Blob([content], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = fileName
    a.click()
    URL.revokeObjectURL(url)
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
          <div className="flex items-center gap-3">
            <FileCode2 className="w-5 h-5 text-primary flex-shrink-0" />
            <div>
              <h2 className="text-sm font-semibold text-white font-sans">
                {fileName}
              </h2>
              <p className="text-xs text-slate-500 font-mono">
                {filePath}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={copyToClipboard}
              disabled={!content}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-slate-300 hover:text-white border border-slate-800 hover:border-slate-700 rounded-lg transition-colors disabled:opacity-50 cursor-pointer font-sans"
              title="Copy code"
            >
              <Copy className="w-3.5 h-3.5" />
              Copy
            </button>
            <button
              onClick={downloadFile}
              disabled={!content}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-slate-300 hover:text-white border border-slate-800 hover:border-slate-700 rounded-lg transition-colors disabled:opacity-50 cursor-pointer font-sans"
              title="Download file"
            >
              <Download className="w-3.5 h-3.5" />
              Download
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
                <p className="text-sm text-slate-400">Loading file...</p>
              </div>
            </div>
          )}

          {error && (
            <div className="flex items-center justify-center h-64 p-6">
              <div className="flex items-start gap-3 max-w-md bg-red-950/40 border border-red-900/40 rounded-lg p-5">
                <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-red-300 mb-1">Failed to Load File</p>
                  <p className="text-xs text-red-400">{error}</p>
                </div>
              </div>
            </div>
          )}

          {content && !loading && !error && (
            <SyntaxHighlighter
              language={language}
              style={atomOneDark}
              showLineNumbers
              wrapLines
              customStyle={{
                margin: 0,
                padding: '1rem',
                fontSize: '0.8125rem',
                lineHeight: '1.6',
                background: 'transparent',
              }}
              lineNumberStyle={{
                minWidth: '3em',
                paddingRight: '1em',
                color: '#4b5563',
                userSelect: 'none',
              }}
            >
              {content}
            </SyntaxHighlighter>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-3 border-t border-slate-800 bg-slate-950 text-center">
          <p className="text-xs text-slate-500">
            {content && (
              <>
                {content.split('\n').length} lines · {content.length} chars · {language}
                {' · '}
              </>
            )}
            Press <kbd className="px-1.5 py-0.5 bg-slate-800 border border-slate-700 rounded font-mono text-slate-400">ESC</kbd> to close
          </p>
        </div>
      </div>
    </div>
  )
}
