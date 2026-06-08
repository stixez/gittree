import { Component, ReactNode, ErrorInfo } from 'react'
import { AlertTriangle, RefreshCw, ExternalLink } from 'lucide-react'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
  errorInfo: ErrorInfo | null
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null, errorInfo: null }
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo)
    this.setState({ errorInfo })
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null })
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback

      return (
        <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl max-w-2xl w-full p-8">
            <div className="text-center mb-6">
              <AlertTriangle className="w-16 h-16 text-red-400 mx-auto mb-4" />
              <h1 className="text-2xl font-bold text-white mb-2 font-sans">
                Something went wrong
              </h1>
              <p className="text-slate-400">
                GitTree encountered an unexpected error. This might be a bug.
              </p>
            </div>

            {this.state.error && (
              <div className="bg-red-950/40 border border-red-900/40 rounded-lg p-4 mb-6">
                <h3 className="text-xs font-semibold text-red-300 mb-2 font-sans">Error Details</h3>
                <pre className="text-xs text-red-400 overflow-x-auto font-mono">
                  {this.state.error.toString()}
                </pre>
                {this.state.errorInfo && (
                  <details className="mt-2">
                    <summary className="text-xs text-red-400/70 cursor-pointer hover:text-red-400 transition-colors">
                      Stack Trace
                    </summary>
                    <pre className="text-xs text-red-400/70 mt-2 overflow-x-auto font-mono">
                      {this.state.errorInfo.componentStack}
                    </pre>
                  </details>
                )}
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={this.handleReset}
                className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-primary hover:bg-primary-hover text-white font-medium rounded-lg transition-colors cursor-pointer font-sans"
              >
                <RefreshCw className="w-4 h-4" />
                Try Again
              </button>
              <button
                onClick={() => window.location.reload()}
                className="flex-1 px-6 py-3 bg-slate-800 hover:bg-slate-700 text-white font-medium rounded-lg transition-colors cursor-pointer font-sans"
              >
                Reload Page
              </button>
            </div>

            <div className="mt-6 p-4 bg-slate-800/50 rounded-lg">
              <h3 className="text-sm font-semibold text-slate-300 mb-2 font-sans">What you can do</h3>
              <ul className="text-xs text-slate-400 space-y-1">
                <li>&bull; Try reloading the page</li>
                <li>&bull; Check the browser console for more details</li>
                <li>&bull; Report this issue on GitHub if it persists</li>
                <li>&bull; Try using a different repository</li>
              </ul>
            </div>

            <div className="mt-4 text-center">
              <a
                href="https://github.com/stixez/gittree/issues"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-sm text-primary hover:text-primary-hover transition-colors"
              >
                Report this bug on GitHub
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
