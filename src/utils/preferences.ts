// Single source of truth for the "compact mode" UI-density preference.
//
// Compact mode works like the `dark` class: a `compact` class on the root
// element (<html>) enables `compact:` Tailwind variant overrides across the UI
// chrome. This module owns the localStorage key and the class toggling so the
// key string isn't duplicated between Settings and app startup.
//
// Storage and the root element are injectable (defaulting to the real browser
// globals) so the logic can be unit-tested without a DOM.

export const COMPACT_KEY = 'gittree-compact'
export const COMPACT_CLASS = 'compact'

interface StorageLike {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
}

interface RootLike {
  classList: {
    toggle(cls: string, force?: boolean): boolean
  }
}

interface ApplyOpts {
  storage?: StorageLike
  root?: RootLike
}

/** Read the stored compact preference (defaults to false). */
export function getCompact(storage: StorageLike = localStorage): boolean {
  return storage.getItem(COMPACT_KEY) === 'true'
}

/** Persist the preference and reflect it on the root element immediately. */
export function setCompact(enabled: boolean, opts: ApplyOpts = {}): void {
  const storage = opts.storage ?? localStorage
  const root = opts.root ?? document.documentElement
  storage.setItem(COMPACT_KEY, String(enabled))
  root.classList.toggle(COMPACT_CLASS, enabled)
}

/** Apply the stored preference to the root element without rewriting storage. */
export function applyCompact(opts: ApplyOpts = {}): void {
  const storage = opts.storage ?? localStorage
  const root = opts.root ?? document.documentElement
  root.classList.toggle(COMPACT_CLASS, getCompact(storage))
}

const MINIMAP_COLLAPSED_KEY = 'gittree-minimap-collapsed'

/** Whether the minimap is collapsed (defaults to expanded). */
export function getMinimapCollapsed(storage: StorageLike = localStorage): boolean {
  return storage.getItem(MINIMAP_COLLAPSED_KEY) === 'true'
}

export function setMinimapCollapsed(collapsed: boolean, storage: StorageLike = localStorage): void {
  storage.setItem(MINIMAP_COLLAPSED_KEY, String(collapsed))
}
