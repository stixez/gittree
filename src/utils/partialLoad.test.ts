import { describe, it, expect } from 'vitest'
import { historyTruncated } from './partialLoad'

describe('historyTruncated', () => {
  it('is true for a shallow clone regardless of walk count', () => {
    expect(historyTruncated(10, 300, true)).toBe(true)
  })
  it('is true when the main walk hit its depth cap', () => {
    expect(historyTruncated(300, 300, false)).toBe(true)
  })
  it('is false when the full main history fit under the cap and not shallow', () => {
    expect(historyTruncated(42, 300, false)).toBe(false)
  })
  it('is false right under the cap (boundary)', () => {
    expect(historyTruncated(299, 300, false)).toBe(false)
  })
})
