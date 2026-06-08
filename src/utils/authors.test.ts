import { describe, it, expect } from 'vitest'
import { uniqueAuthors } from './authors'
import type { GitCommit } from '../types/git'

const commit = (name: string): GitCommit => ({
  oid: name + Math.random(), message: '', parents: [],
  author: { name, email: '', timestamp: 0 },
  committer: { name, email: '', timestamp: 0 },
})

describe('uniqueAuthors', () => {
  it('returns distinct names sorted case-insensitively', () => {
    expect(uniqueAuthors([commit('Bob'), commit('alice'), commit('Bob'), commit('Carol')]))
      .toEqual(['alice', 'Bob', 'Carol'])
  })
  it('ignores blank names', () => {
    expect(uniqueAuthors([commit(''), commit('  '), commit('Dave')])).toEqual(['Dave'])
  })
  it('handles an empty list', () => {
    expect(uniqueAuthors([])).toEqual([])
  })
})
