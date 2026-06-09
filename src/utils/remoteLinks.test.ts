import { describe, it, expect } from 'vitest'
import { parseRemoteUrl, parseIssueReferences } from './remoteLinks'

describe('parseRemoteUrl', () => {
  it('parses a GitHub HTTPS url', () => {
    expect(parseRemoteUrl('https://github.com/owner/repo.git')).toMatchObject({
      platform: 'github', owner: 'owner', repo: 'repo',
      baseUrl: 'https://github.com/owner/repo',
    })
  })

  it('parses a GitHub SSH url', () => {
    expect(parseRemoteUrl('git@github.com:owner/repo.git')).toMatchObject({
      platform: 'github', owner: 'owner', repo: 'repo',
    })
  })

  it('strips a trailing slash after .git', () => {
    expect(parseRemoteUrl('https://github.com/owner/repo.git/')).toMatchObject({
      owner: 'owner', repo: 'repo',
    })
  })

  it('strips a trailing slash with no .git', () => {
    expect(parseRemoteUrl('https://github.com/owner/repo/')).toMatchObject({
      owner: 'owner', repo: 'repo',
    })
  })

  it('keeps the full namespace for GitLab subgroups', () => {
    expect(parseRemoteUrl('https://gitlab.com/group/subgroup/repo.git')).toMatchObject({
      platform: 'gitlab',
      owner: 'group/subgroup',
      repo: 'repo',
      baseUrl: 'https://gitlab.com/group/subgroup/repo',
    })
  })

  it('parses a simple GitLab url', () => {
    expect(parseRemoteUrl('https://gitlab.com/group/repo')).toMatchObject({
      platform: 'gitlab', owner: 'group', repo: 'repo',
    })
  })

  it('returns null for empty or unknown hosts', () => {
    expect(parseRemoteUrl('')).toBeNull()
    expect(parseRemoteUrl('https://example.com/x/y')).toBeNull()
  })
})

describe('parseIssueReferences', () => {
  it('extracts plain and GH- references', () => {
    expect(parseIssueReferences('Fixes #12 and GH-34')).toEqual([12, 34])
  })

  it('does not treat a hex color as an issue reference', () => {
    expect(parseIssueReferences('set background to #1a2b3c')).toEqual([])
  })

  it('dedupes and sorts', () => {
    expect(parseIssueReferences('closes #5, see #5 and #2')).toEqual([2, 5])
  })
})
