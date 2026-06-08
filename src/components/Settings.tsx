import { useState, useEffect } from 'react'
import { X, Sun, Moon, Monitor } from 'lucide-react'
import { useEscapeKey } from '../hooks/useKeyboard'
import { getCompact, setCompact } from '../utils/preferences'

interface SettingsProps {
  onClose: () => void
}

export function Settings({ onClose }: SettingsProps) {
  useEscapeKey(onClose)

  const [theme, setTheme] = useState<'light' | 'dark' | 'system'>('system')
  const [compactMode, setCompactMode] = useState(false)

  useEffect(() => {
    const savedTheme = localStorage.getItem('gittree-theme') as 'light' | 'dark' | 'system' || 'system'
    setTheme(savedTheme)
    setCompactMode(getCompact())
  }, [])

  const handleThemeChange = (newTheme: 'light' | 'dark' | 'system') => {
    setTheme(newTheme)
    localStorage.setItem('gittree-theme', newTheme)
    if (newTheme === 'dark') {
      document.documentElement.classList.add('dark')
    } else if (newTheme === 'light') {
      document.documentElement.classList.remove('dark')
    } else {
      const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches
      if (isDark) document.documentElement.classList.add('dark')
      else document.documentElement.classList.remove('dark')
    }
  }

  const handleCompactModeChange = (enabled: boolean) => {
    setCompactMode(enabled)
    setCompact(enabled)
  }

  const themeOptions = [
    { value: 'light' as const, label: 'Light', icon: <Sun className="w-4 h-4" /> },
    { value: 'dark' as const, label: 'Dark', icon: <Moon className="w-4 h-4" /> },
    { value: 'system' as const, label: 'System', icon: <Monitor className="w-4 h-4" /> },
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
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-white font-sans">Settings</h2>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-6">
          {/* Theme */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-3 font-sans">
              Theme
            </label>
            <div className="grid grid-cols-3 gap-2">
              {themeOptions.map(({ value, label, icon }) => (
                <button
                  key={value}
                  onClick={() => handleThemeChange(value)}
                  className={`flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
                    theme === value
                      ? 'bg-primary text-white'
                      : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white'
                  }`}
                >
                  {icon}
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Compact Mode */}
          <div>
            <div className="flex items-center justify-between">
              <div>
                <label className="block text-sm font-medium text-slate-300 font-sans">
                  Compact Mode
                </label>
                <p className="text-xs text-slate-500 mt-1">Reduce spacing and padding</p>
              </div>
              <button
                onClick={() => handleCompactModeChange(!compactMode)}
                role="switch"
                aria-checked={compactMode}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900 ${
                  compactMode ? 'bg-primary' : 'bg-slate-700'
                }`}
                aria-label="Toggle compact mode"
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    compactMode ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          </div>

          {/* About */}
          <div className="pt-4 border-t border-slate-800">
            <p className="text-xs text-slate-500 text-center">
              GitTree &bull; Open source git visualization
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
