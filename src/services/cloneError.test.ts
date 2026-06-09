import { describe, it, expect } from 'vitest'
import { describeCloneError } from './cloneError'

describe('describeCloneError', () => {
  it('explains a "Failed to fetch" as a proxy/network issue', () => {
    const msg = describeCloneError(new TypeError('Failed to fetch'))
    expect(msg).toMatch(/CORS proxy/i)
    expect(msg).not.toBe('Failed to fetch')
  })

  it('handles Firefox and Safari network-error wording too', () => {
    expect(describeCloneError(new Error('NetworkError when attempting to fetch resource.')))
      .toMatch(/could not reach/i)
    expect(describeCloneError(new Error('Load failed'))).toMatch(/could not reach/i)
  })

  it('flags private/auth failures', () => {
    expect(describeCloneError(new Error('HTTP Error: 401 Unauthorized'))).toMatch(/private/i)
  })

  it('flags not-found', () => {
    expect(describeCloneError(new Error('Repository not found (404)'))).toMatch(/not found/i)
  })

  it('falls back to the raw message for unknown errors', () => {
    expect(describeCloneError(new Error('something weird'))).toBe('Failed to clone repository: something weird')
  })

  it('handles non-Error throwables', () => {
    expect(describeCloneError('boom')).toBe('Failed to clone repository: boom')
  })
})
