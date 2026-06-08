import { useState } from 'react'
import { Upload, X, FileCode2, Image, ArrowRight, Loader2, CheckCircle2, AlertCircle } from 'lucide-react'
import { exportToSVG, exportToPNG } from '../utils/export'
import { buildScene } from '../renderer/scene'
import { GitRepository } from '../types/git'
import { useEscapeKey } from '../hooks/useKeyboard'

interface ExportMenuProps {
  onClose: () => void
  repository: GitRepository | null
}

export function ExportMenu({ onClose, repository }: ExportMenuProps) {
  const [exporting, setExporting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  useEscapeKey(onClose)

  const handleExportSVG = async () => {
    try {
      setExporting(true)
      setError(null)
      setSuccess(null)

      if (!repository) throw new Error('No repository loaded')
      exportToSVG(buildScene(repository), 'gittree.svg')
      setSuccess('SVG exported successfully!')

      setTimeout(() => {
        onClose()
      }, 2000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Export failed')
    } finally {
      setExporting(false)
    }
  }

  const handleExportPNG = async () => {
    try {
      setExporting(true)
      setError(null)
      setSuccess(null)

      if (!repository) throw new Error('No repository loaded')
      await exportToPNG(buildScene(repository), 'gittree.png')
      setSuccess('PNG exported successfully!')

      setTimeout(() => {
        onClose()
      }, 2000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'PNG export failed')
    } finally {
      setExporting(false)
    }
  }

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in"
      onClick={onClose}
    >
      <div
        className="bg-slate-900 border border-slate-800 rounded-xl shadow-2xl max-w-md w-full mx-4 p-6 animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Upload className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-semibold text-white font-sans">
              Export Visualization
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-3">
          {/* SVG Export */}
          <button
            onClick={handleExportSVG}
            disabled={exporting}
            className="w-full flex items-center justify-between p-4 border border-slate-800 rounded-lg hover:border-primary hover:bg-primary/5 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-slate-800 flex items-center justify-center">
                <FileCode2 className="w-5 h-5 text-primary" />
              </div>
              <div className="text-left">
                <div className="font-medium text-white font-sans">
                  Export as SVG
                </div>
                <div className="text-xs text-slate-400">
                  Vector format, perfect quality
                </div>
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-slate-600" />
          </button>

          {/* PNG Export */}
          <button
            onClick={handleExportPNG}
            disabled={exporting}
            className="w-full flex items-center justify-between p-4 border border-slate-800 rounded-lg hover:border-primary hover:bg-primary/5 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-slate-800 flex items-center justify-center">
                <Image className="w-5 h-5 text-primary" />
              </div>
              <div className="text-left">
                <div className="font-medium text-white font-sans">
                  Export as PNG
                </div>
                <div className="text-xs text-slate-400">
                  High-resolution image (2x scale)
                </div>
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-slate-600" />
          </button>

          {/* Status Messages */}
          {exporting && (
            <div className="flex items-center justify-center gap-2 p-3 bg-slate-800/50 border border-slate-700 rounded-lg">
              <Loader2 className="w-4 h-4 text-primary animate-spin" />
              <span className="text-sm text-slate-300">
                Exporting...
              </span>
            </div>
          )}

          {error && (
            <div className="flex items-start gap-2 p-3 bg-red-950/40 border border-red-900/40 rounded-lg">
              <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-300">
                {error}
              </p>
            </div>
          )}

          {success && (
            <div className="flex items-center gap-2 p-3 bg-green-950/40 border border-green-900/40 rounded-lg">
              <CheckCircle2 className="w-4 h-4 text-green-400 flex-shrink-0" />
              <p className="text-sm text-green-300">
                {success}
              </p>
            </div>
          )}
        </div>

        <div className="mt-6 text-center">
          <p className="text-xs text-slate-500">
            Press <kbd className="px-1.5 py-0.5 bg-slate-800 border border-slate-700 rounded font-mono text-slate-400">ESC</kbd> to close
          </p>
        </div>
      </div>
    </div>
  )
}
