interface LoadingSkeletonProps {
  type?: 'text' | 'card' | 'list' | 'file'
  count?: number
}

export function LoadingSkeleton({ type = 'text', count = 1 }: LoadingSkeletonProps) {
  const items = Array.from({ length: count }, (_, i) => i)
  const shimmer = 'bg-slate-800'

  if (type === 'text') {
    return (
      <div className="animate-pulse space-y-2">
        {items.map((i) => (
          <div key={i} className={`h-4 ${shimmer} rounded w-3/4`} />
        ))}
      </div>
    )
  }

  if (type === 'card') {
    return (
      <div className="animate-pulse space-y-4">
        {items.map((i) => (
          <div key={i} className={`p-4 border border-slate-800 rounded-lg space-y-3`}>
            <div className={`h-4 ${shimmer} rounded w-1/2`} />
            <div className={`h-3 ${shimmer} rounded w-3/4`} />
            <div className={`h-3 ${shimmer} rounded w-2/3`} />
          </div>
        ))}
      </div>
    )
  }

  if (type === 'list') {
    return (
      <div className="animate-pulse space-y-3">
        {items.map((i) => (
          <div key={i} className="flex items-center gap-3">
            <div className={`w-2 h-2 ${shimmer} rounded-full`} />
            <div className="flex-1 space-y-2">
              <div className={`h-3 ${shimmer} rounded w-3/4`} />
              <div className={`h-2 ${shimmer} rounded w-1/2`} />
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (type === 'file') {
    return (
      <div className="animate-pulse space-y-2">
        {items.map((i) => (
          <div key={i} className="flex items-center gap-2 p-2 rounded">
            <div className={`w-4 h-4 ${shimmer} rounded`} />
            <div className="flex-1">
              <div className={`h-3 ${shimmer} rounded w-2/3`} />
            </div>
          </div>
        ))}
      </div>
    )
  }

  return null
}
