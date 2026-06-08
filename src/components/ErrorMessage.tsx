import { AlertCircle } from 'lucide-react'

interface ErrorMessageProps {
  title?: string
  message: string
  onRetry?: () => void
  onDismiss?: () => void
}

export function ErrorMessage({
  title = 'Something went wrong',
  message,
  onRetry,
  onDismiss,
}: ErrorMessageProps) {
  return (
    <div className="p-4 bg-red-950/50 border border-red-900/50 rounded-xl animate-scale-in">
      <div className="flex items-start gap-3">
        <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-red-300 mb-1 font-sans">{title}</h3>
          <p className="text-sm text-red-400 mb-3">{message}</p>
          <div className="flex gap-2">
            {onRetry && (
              <button
                onClick={onRetry}
                className="px-3 py-1.5 text-xs bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors cursor-pointer font-medium"
              >
                Try Again
              </button>
            )}
            {onDismiss && (
              <button
                onClick={onDismiss}
                className="px-3 py-1.5 text-xs text-red-400 hover:text-red-300 hover:bg-red-950 rounded-lg transition-colors cursor-pointer"
              >
                Dismiss
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
