import { describe, it, expect, vi } from 'vitest'
import { buildRefItems, buildCommitItems, buildActions } from './paletteItems'
import type { GitRepository } from '../types/git'

const repo = {
  branches: [{ name: 'main', oid: 'oidA' }, { name: 'dev', oid: 'oidB' }],
  tags: [{ name: 'v1.0.0', oid: 'oidA' }],
  commits: [
    { oid: 'abcdef1234567890', message: 'feat: thing\n\nbody', parents: [], author: { name: 'x', email: 'x', timestamp: 1 }, committer: { name: 'x', email: 'x', timestamp: 1 } },
  ],
  head: 'abcdef1234567890',
} as unknown as GitRepository

describe('buildRefItems', () => {
  it('builds branch and tag items with their tip oid', () => {
    const items = buildRefItems(repo.branches, repo.tags)
    expect(items).toContainEqual({ kind: 'branch', id: 'branch:main', label: 'main', oid: 'oidA' })
    expect(items).toContainEqual({ kind: 'tag', id: 'tag:v1.0.0', label: 'v1.0.0', oid: 'oidA' })
  })
})

describe('buildCommitItems', () => {
  it('uses the first message line as label and short hash as sublabel', () => {
    const items = buildCommitItems(repo.commits)
    expect(items[0]).toEqual({ kind: 'commit', id: 'commit:abcdef1234567890', label: 'feat: thing', sublabel: 'abcdef1', oid: 'abcdef1234567890' })
  })
})

describe('buildActions', () => {
  it('omits inapplicable actions', () => {
    const handlers = {
      openRepo: vi.fn(), clearFilters: vi.fn(), copyShareLink: vi.fn(),
      openExport: vi.fn(), openCompare: vi.fn(), openStats: vi.fn(),
      openHeatmap: vi.fn(), openHealth: vi.fn(), openSettings: vi.fn(), openKeyboardHelp: vi.fn(),
    }
    const noRepo = buildActions(handlers, { hasRepo: false, branchCount: 0 })
    expect(noRepo.map((a) => a.id)).toEqual(['action:openRepo', 'action:openSettings', 'action:openKeyboardHelp'])

    const withRepo = buildActions(handlers, { hasRepo: true, branchCount: 1 })
    const ids = withRepo.map((a) => a.id)
    expect(ids).toContain('action:openExport')
    expect(ids).not.toContain('action:openCompare') // needs >= 2 branches
    expect(ids).toContain('action:clearFilters')

    const multiBranch = buildActions(handlers, { hasRepo: true, branchCount: 2 })
    expect(multiBranch.map((a) => a.id)).toContain('action:openCompare')
  })

  it('wires run() to the handler', () => {
    const handlers = {
      openRepo: vi.fn(), clearFilters: vi.fn(), copyShareLink: vi.fn(),
      openExport: vi.fn(), openCompare: vi.fn(), openStats: vi.fn(),
      openHeatmap: vi.fn(), openHealth: vi.fn(), openSettings: vi.fn(), openKeyboardHelp: vi.fn(),
    }
    const actions = buildActions(handlers, { hasRepo: true, branchCount: 2 })
    const exportAction = actions.find((a) => a.id === 'action:openExport')!
    if (exportAction.kind === 'action') exportAction.run()
    expect(handlers.openExport).toHaveBeenCalledOnce()
  })
})
