import { X } from 'lucide-react'
import { useEscapeKey } from '../hooks/useKeyboard'

interface KeyboardHelpProps {
  onClose: () => void
}

export function KeyboardHelp({ onClose }: KeyboardHelpProps) {
  useEscapeKey(onClose)

  const shortcuts = [
    { keys: ['↑', '↓', '←', '→'], description: 'Navigate commits' },
    { keys: ['H', 'J', 'K', 'L'], description: 'Navigate commits (Vim keys)' },
    { keys: ['Enter'], description: 'Open commit details' },
    { keys: ['F'], description: 'Toggle fullscreen' },
    { keys: ['Ctrl/⌘', 'K'], description: 'Command palette' },
    { keys: ['/'], description: 'Focus search' },
    { keys: ['C'], description: 'Clear filters' },
    { keys: ['ESC'], description: 'Clear focus · close panels · exit fullscreen' },
    { keys: ['?'], description: 'Show keyboard shortcuts' },
  ]

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in"
      onClick={onClose}
    >
      <div
        className="bg-slate-900 border border-slate-800 rounded-xl shadow-2xl max-w-md w-full mx-4 p-6 animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold text-white font-sans">Keyboard Shortcuts</h2>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-1">
          {shortcuts.map((shortcut, index) => (
            <div
              key={index}
              className="flex items-center justify-between py-2.5 border-b border-slate-800 last:border-0"
            >
              <span className="text-sm text-slate-400">{shortcut.description}</span>
              <div className="flex gap-1">
                {shortcut.keys.map((key, i) => (
                  <kbd
                    key={i}
                    className="px-2 py-1 text-xs font-mono bg-slate-800 text-slate-300 border border-slate-700 rounded"
                  >
                    {key}
                  </kbd>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-5 text-center">
          <p className="text-xs text-slate-500">
            Press{' '}
            <kbd className="px-1.5 py-0.5 bg-slate-800 border border-slate-700 rounded text-xs font-mono">
              ESC
            </kbd>{' '}
            to close
          </p>
        </div>
      </div>
    </div>
  )
}
