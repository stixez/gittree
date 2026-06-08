/**
 * Performance monitoring utilities
 */

export interface PerformanceMetrics {
  loadTime: number
  renderTime: number
  memoryUsage?: number
}

/**
 * Measure page load performance
 */
export function measurePageLoad(): PerformanceMetrics | null {
  if (!window.performance || !window.performance.timing) {
    return null
  }

  const timing = window.performance.timing
  const loadTime = timing.loadEventEnd - timing.navigationStart
  const renderTime = timing.domComplete - timing.domLoading

  const metrics: PerformanceMetrics = {
    loadTime,
    renderTime,
  }

  // Add memory usage if available
  if ('memory' in performance && (performance as any).memory) {
    metrics.memoryUsage = (performance as any).memory.usedJSHeapSize / 1048576 // Convert to MB
  }

  return metrics
}

/**
 * Log performance metrics
 */
export function logPerformance(): void {
  window.addEventListener('load', () => {
    setTimeout(() => {
      const metrics = measurePageLoad()
      if (metrics) {
        console.log('[Performance] Metrics:', {
          loadTime: `${(metrics.loadTime / 1000).toFixed(2)}s`,
          renderTime: `${(metrics.renderTime / 1000).toFixed(2)}s`,
          memoryUsage: metrics.memoryUsage ? `${metrics.memoryUsage.toFixed(2)}MB` : 'N/A',
        })
      }
    }, 0)
  })
}

/**
 * Debounce function for performance optimization
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: number | null = null

  return function executedFunction(...args: Parameters<T>) {
    const later = () => {
      timeout = null
      func(...args)
    }

    if (timeout) {
      clearTimeout(timeout)
    }
    timeout = setTimeout(later, wait)
  }
}

/**
 * Throttle function for performance optimization
 */
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean = false

  return function executedFunction(...args: Parameters<T>) {
    if (!inThrottle) {
      func(...args)
      inThrottle = true
      setTimeout(() => {
        inThrottle = false
      }, limit)
    }
  }
}

/**
 * Lazy load images for performance
 */
export function lazyLoadImages(): void {
  if ('IntersectionObserver' in window) {
    const imageObserver = new IntersectionObserver((entries, observer) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const img = entry.target as HTMLImageElement
          if (img.dataset.src) {
            img.src = img.dataset.src
            img.removeAttribute('data-src')
            observer.unobserve(img)
          }
        }
      })
    })

    document.querySelectorAll('img[data-src]').forEach((img) => {
      imageObserver.observe(img)
    })
  }
}

/**
 * Prefetch resources for better performance
 */
export function prefetchResource(url: string, type: 'script' | 'style' | 'fetch'): void {
  const link = document.createElement('link')
  link.rel = 'prefetch'
  link.href = url
  link.as = type
  document.head.appendChild(link)
}

/**
 * Check if browser supports modern features
 */
export function checkBrowserSupport(): {
  fileSystemAccess: boolean
  opfs: boolean
  webWorkers: boolean
} {
  return {
    fileSystemAccess: 'showDirectoryPicker' in window,
    opfs: 'storage' in navigator && 'getDirectory' in navigator.storage,
    webWorkers: typeof Worker !== 'undefined',
  }
}
