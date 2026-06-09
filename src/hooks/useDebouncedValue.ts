import { useEffect, useState } from 'react'

/**
 * Returns a copy of `value` that only updates after it has stopped changing for
 * `delayMs`. Used to keep expensive work (e.g. the path-history scan) from
 * firing on every keystroke — it runs once the user pauses typing instead.
 */
export function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value)

  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delayMs)
    return () => clearTimeout(id)
  }, [value, delayMs])

  return debounced
}
