import { AlertTriangle } from 'lucide-react'

interface PartialBadgeProps {
  /** Number of commits the stats are based on. */
  count: number
}

/**
 * Shown in analytics headers when the repository is only partially loaded
 * (shallow clone or depth-capped), so totals aren't mistaken for the whole
 * history. Use the "Load full history" button to fetch the rest.
 */
export function PartialBadge({ count }: PartialBadgeProps) {
  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/40 text-amber-300 text-[11px] font-medium"
      title={`Based on ${count.toLocaleString()} loaded commits. History is truncated, so totals may be incomplete — use "Load full history" to fetch the rest.`}
    >
      <AlertTriangle className="w-3 h-3" />
      partial
    </span>
  )
}
