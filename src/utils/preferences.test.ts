import { describe, it, expect, beforeEach } from 'vitest'
import { getCompact, setCompact, applyCompact, COMPACT_CLASS } from './preferences'

// Minimal fakes so the util is testable under the `node` vitest environment.
function fakeStorage() {
  const map = new Map<string, string>()
  return {
    getItem: (k: string) => (map.has(k) ? map.get(k)! : null),
    setItem: (k: string, v: string) => void map.set(k, v),
  }
}

function fakeRoot() {
  const classes = new Set<string>()
  return {
    classList: {
      toggle: (cls: string, force?: boolean) => {
        const on = force === undefined ? !classes.has(cls) : force
        if (on) classes.add(cls)
        else classes.delete(cls)
        return on
      },
      contains: (cls: string) => classes.has(cls),
    },
  }
}

describe('preferences: compact mode', () => {
  let storage: ReturnType<typeof fakeStorage>
  let root: ReturnType<typeof fakeRoot>

  beforeEach(() => {
    storage = fakeStorage()
    root = fakeRoot()
  })

  it('defaults to false when nothing stored', () => {
    expect(getCompact(storage)).toBe(false)
  })

  it('setCompact(true) writes storage and adds the root class', () => {
    setCompact(true, { storage, root: root as any })
    expect(storage.getItem('gittree-compact')).toBe('true')
    expect(root.classList.contains(COMPACT_CLASS)).toBe(true)
    expect(getCompact(storage)).toBe(true)
  })

  it('setCompact(false) writes storage and removes the root class', () => {
    setCompact(true, { storage, root: root as any })
    setCompact(false, { storage, root: root as any })
    expect(storage.getItem('gittree-compact')).toBe('false')
    expect(root.classList.contains(COMPACT_CLASS)).toBe(false)
    expect(getCompact(storage)).toBe(false)
  })

  it('applyCompact() applies the class from storage without rewriting it', () => {
    storage.setItem('gittree-compact', 'true')
    applyCompact({ storage, root: root as any })
    expect(root.classList.contains(COMPACT_CLASS)).toBe(true)
    // storage value untouched
    expect(storage.getItem('gittree-compact')).toBe('true')
  })
})
