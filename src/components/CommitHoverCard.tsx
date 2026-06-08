import { GitCommit } from '../types/git'

interface Props { commit: GitCommit; x: number; y: number }

function rel(ts: number): string {
  const s = Math.floor(Date.now() / 1000 - ts)
  if (s < 3600) return `${Math.max(1, Math.floor(s / 60))}m`
  if (s < 86400) return `${Math.floor(s / 3600)}h`
  if (s < 2592000) return `${Math.floor(s / 86400)}d`
  return `${Math.floor(s / 2592000)}mo`
}

export function CommitHoverCard({ commit, x, y }: Props) {
  return (
    <div
      className="pointer-events-none fixed z-50 w-60 rounded-lg border p-2.5 shadow-xl"
      style={{ left: x + 14, top: y + 14, background: '#0b111a', borderColor: '#9a3535' }}
    >
      <p className="mb-1 font-mono text-[10px]" style={{ color: '#d24b4b' }}>
        {commit.oid.slice(0, 7)}{commit.parents.length > 1 ? ' · merge' : ''}
      </p>
      <p className="mb-1.5 text-[11px] font-medium leading-snug text-white">
        {commit.message.split('\n')[0]}
      </p>
      <div className="flex items-center justify-between text-[10px]">
        <span className="text-slate-400">{commit.author.name}</span>
        <span className="text-slate-500">{rel(commit.author.timestamp)}</span>
      </div>
    </div>
  )
}
