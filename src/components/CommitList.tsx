import { FixedSizeList, type ListChildComponentProps } from 'react-window'
import type { GitCommit } from '../types/git'

interface CommitListProps {
  commits: GitCommit[]
  /** Select a commit (focuses + centers it in the graph and opens its details). */
  onSelect?: (oid: string) => void
}

interface RowData {
  commits: GitCommit[]
  onSelect?: (oid: string) => void
}

// Fixed row height for windowing. Content is ~54px (py-2 = 16 + text-sm line 20
// + mt-0.5 = 2 + text-xs line 16); 58 leaves slack. Both text lines are
// truncated to one line — if you add a line or change leading, bump this or
// rows will clip.
const ROW_HEIGHT = 58
const MAX_HEIGHT = 384 // matches the previous max-h-96 scroll box

function Row({ index, style, data }: ListChildComponentProps<RowData>) {
  const commit = data.commits[index]
  const select = data.onSelect ? () => data.onSelect!(commit.oid) : undefined
  return (
    <div
      style={style}
      onClick={select}
      onKeyDown={select ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); select() } } : undefined}
      role={select ? 'button' : undefined}
      tabIndex={select ? 0 : undefined}
      className={`flex items-start gap-3 px-3 py-2 rounded-lg hover:bg-slate-800/60 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${select ? 'cursor-pointer' : ''}`}
    >
      <div className="flex-shrink-0 w-2 h-2 mt-2 rounded-full bg-primary" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-white truncate">
          {commit.message.split('\n')[0]}
        </p>
        <p className="text-xs text-slate-400 mt-0.5 truncate">
          {commit.author.name} &bull; {new Date(commit.author.timestamp * 1000).toLocaleString()}
        </p>
      </div>
      <div className="flex-shrink-0 text-xs font-mono text-slate-500">
        {commit.oid.substring(0, 7)}
      </div>
    </div>
  )
}

/**
 * Windowed commit list: only the visible rows are mounted, so the full filtered
 * set renders smoothly even on very large repositories.
 */
export function CommitList({ commits, onSelect }: CommitListProps) {
  const height = Math.min(MAX_HEIGHT, commits.length * ROW_HEIGHT)
  return (
    <FixedSizeList
      height={height}
      itemCount={commits.length}
      itemSize={ROW_HEIGHT}
      width="100%"
      itemData={{ commits, onSelect }}
      itemKey={(index, data) => data.commits[index].oid}
    >
      {Row}
    </FixedSizeList>
  )
}
