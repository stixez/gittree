// Polyfill Node.js Buffer for isomorphic-git in the browser
import { Buffer } from 'buffer'
;(globalThis as any).Buffer = Buffer

import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { ErrorBoundary } from './components/ErrorBoundary'
import { logPerformance } from './utils/performance'
import { applyCompact } from './utils/preferences'

// Apply the saved UI-density preference before first paint.
applyCompact()

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>,
)

// Log performance metrics (development only)
if (import.meta.env && import.meta.env.DEV) {
  logPerformance()
}

