import { describe, it, expect } from 'vitest'
import { splitPath, resolvePathOid, type TreeEntry } from './treePath'

// In-memory tree store: oid -> entries. Mirrors git's content-addressed trees.
const trees: Record<string, TreeEntry[]> = {
  root: [
    { path: 'README.md', oid: 'readme1', type: 'blob' },
    { path: 'src', oid: 'srcTree1', type: 'tree' },
  ],
  srcTree1: [
    { path: 'App.tsx', oid: 'app1', type: 'blob' },
    { path: 'renderer', oid: 'rendTree1', type: 'tree' },
  ],
  rendTree1: [{ path: 'draw.ts', oid: 'draw1', type: 'blob' }],
}
const readTree = async (oid: string) => trees[oid] ?? []

describe('splitPath', () => {
  it('normalizes leading/trailing slashes and blanks', () => {
    expect(splitPath('/src/renderer/')).toEqual(['src', 'renderer'])
    expect(splitPath('src//draw.ts')).toEqual(['src', 'draw.ts'])
    expect(splitPath('   ')).toEqual([])
  })
})

describe('resolvePathOid', () => {
  it('resolves a nested blob oid', async () => {
    expect(await resolvePathOid(readTree, 'root', ['src', 'App.tsx'])).toBe('app1')
    expect(await resolvePathOid(readTree, 'root', ['src', 'renderer', 'draw.ts'])).toBe('draw1')
  })
  it('resolves a directory to its subtree oid', async () => {
    expect(await resolvePathOid(readTree, 'root', ['src'])).toBe('srcTree1')
    expect(await resolvePathOid(readTree, 'root', ['src', 'renderer'])).toBe('rendTree1')
  })
  it('returns undefined for a missing path', async () => {
    expect(await resolvePathOid(readTree, 'root', ['nope.txt'])).toBeUndefined()
    expect(await resolvePathOid(readTree, 'root', ['src', 'missing'])).toBeUndefined()
  })
  it('returns undefined when a non-final segment is a blob', async () => {
    expect(await resolvePathOid(readTree, 'root', ['README.md', 'x'])).toBeUndefined()
  })
})
