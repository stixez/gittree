import { describe, it, expect } from 'vitest'
import { uniqueAuthors, aggregateContributors } from './authors'
import type { GitCommit } from '../types/git'

const commit = (name: string): GitCommit => ({
  oid: name + Math.random(), message: '', parents: [],
  author: { name, email: '', timestamp: 0 },
  committer: { name, email: '', timestamp: 0 },
})

const authored = (name: string, email: string, timestamp: number): GitCommit => ({
  oid: name + email + timestamp, message: '', parents: [],
  author: { name, email, timestamp },
  committer: { name, email, timestamp },
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

describe('aggregateContributors', () => {
  it('groups by email and sorts by commit count descending', () => {
    const result = aggregateContributors([
      authored('Alice', 'alice@x.com', 1),
      authored('Bob', 'bob@x.com', 2),
      authored('Alice', 'alice@x.com', 3),
    ])
    expect(result.map((c) => [c.name, c.commits])).toEqual([
      ['Alice', 2],
      ['Bob', 1],
    ])
  })

  it('merges varied name spellings under one email and shows the most-used name', () => {
    // The bug: one person, one email, two name spellings. Both views must agree.
    const result = aggregateContributors([
      authored('zvonimir resser', 'z@x.com', 1),
      authored('Zvonimir', 'z@x.com', 2),
      authored('Zvonimir', 'z@x.com', 3),
    ])
    expect(result).toHaveLength(1)
    expect(result[0].name).toBe('Zvonimir')
    expect(result[0].commits).toBe(3)
  })

  it('treats email as case-insensitive', () => {
    const result = aggregateContributors([
      authored('Alice', 'Alice@X.com', 1),
      authored('Alice', 'alice@x.com', 2),
    ])
    expect(result).toHaveLength(1)
    expect(result[0].commits).toBe(2)
  })

  it('tracks first and last commit timestamps', () => {
    const result = aggregateContributors([
      authored('Alice', 'a@x.com', 30),
      authored('Alice', 'a@x.com', 10),
      authored('Alice', 'a@x.com', 20),
    ])
    expect(result[0].firstCommit).toBe(10)
    expect(result[0].lastCommit).toBe(30)
  })

  it('breaks display-name ties deterministically regardless of input order', () => {
    const forward = aggregateContributors([
      authored('Bravo', 'a@x.com', 1),
      authored('Alpha', 'a@x.com', 2),
    ])
    const reversed = aggregateContributors([
      authored('Alpha', 'a@x.com', 2),
      authored('Bravo', 'a@x.com', 1),
    ])
    expect(forward[0].name).toBe('Alpha')
    expect(reversed[0].name).toBe('Alpha')
  })

  it('handles an empty list', () => {
    expect(aggregateContributors([])).toEqual([])
  })
})
