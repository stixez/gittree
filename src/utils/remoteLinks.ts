/**
 * Utilities for generating links to remote git hosting platforms
 * (GitHub, GitLab, Bitbucket, etc.)
 */

export interface RemoteInfo {
  platform: 'github' | 'gitlab' | 'bitbucket' | 'unknown'
  owner: string
  repo: string
  baseUrl: string
}

/**
 * Parse a git remote URL and extract repository information
 */
export function parseRemoteUrl(url: string): RemoteInfo | null {
  if (!url) return null

  // Remove .git suffix
  const cleanUrl = url.replace(/\.git$/, '')

  // GitHub patterns
  const githubHttps = cleanUrl.match(/https:\/\/github\.com\/([^/]+)\/([^/]+)/i)
  const githubSsh = cleanUrl.match(/git@github\.com:([^/]+)\/([^/]+)/i)
  
  if (githubHttps || githubSsh) {
    const match = githubHttps || githubSsh
    return {
      platform: 'github',
      owner: match![1],
      repo: match![2],
      baseUrl: `https://github.com/${match![1]}/${match![2]}`,
    }
  }

  // GitLab patterns
  const gitlabHttps = cleanUrl.match(/https:\/\/gitlab\.com\/([^/]+)\/([^/]+)/i)
  const gitlabSsh = cleanUrl.match(/git@gitlab\.com:([^/]+)\/([^/]+)/i)
  
  if (gitlabHttps || gitlabSsh) {
    const match = gitlabHttps || gitlabSsh
    return {
      platform: 'gitlab',
      owner: match![1],
      repo: match![2],
      baseUrl: `https://gitlab.com/${match![1]}/${match![2]}`,
    }
  }

  // Bitbucket patterns
  const bitbucketHttps = cleanUrl.match(/https:\/\/bitbucket\.org\/([^/]+)\/([^/]+)/i)
  const bitbucketSsh = cleanUrl.match(/git@bitbucket\.org:([^/]+)\/([^/]+)/i)
  
  if (bitbucketHttps || bitbucketSsh) {
    const match = bitbucketHttps || bitbucketSsh
    return {
      platform: 'bitbucket',
      owner: match![1],
      repo: match![2],
      baseUrl: `https://bitbucket.org/${match![1]}/${match![2]}`,
    }
  }

  return null
}

/**
 * Generate a link to a specific commit on the remote platform
 */
export function getCommitLink(remoteUrl: string, commitHash: string): string | null {
  const remote = parseRemoteUrl(remoteUrl)
  if (!remote) return null

  switch (remote.platform) {
    case 'github':
      return `${remote.baseUrl}/commit/${commitHash}`
    case 'gitlab':
      return `${remote.baseUrl}/-/commit/${commitHash}`
    case 'bitbucket':
      return `${remote.baseUrl}/commits/${commitHash}`
    default:
      return null
  }
}

/**
 * Generate a link to a specific file at a commit
 */
export function getFileLink(
  remoteUrl: string,
  commitHash: string,
  filePath: string
): string | null {
  const remote = parseRemoteUrl(remoteUrl)
  if (!remote) return null

  switch (remote.platform) {
    case 'github':
      return `${remote.baseUrl}/blob/${commitHash}/${filePath}`
    case 'gitlab':
      return `${remote.baseUrl}/-/blob/${commitHash}/${filePath}`
    case 'bitbucket':
      return `${remote.baseUrl}/src/${commitHash}/${filePath}`
    default:
      return null
  }
}

/**
 * Generate a link to compare two commits/branches
 */
export function getCompareLink(
  remoteUrl: string,
  base: string,
  compare: string
): string | null {
  const remote = parseRemoteUrl(remoteUrl)
  if (!remote) return null

  switch (remote.platform) {
    case 'github':
      return `${remote.baseUrl}/compare/${base}...${compare}`
    case 'gitlab':
      return `${remote.baseUrl}/-/compare/${base}...${compare}`
    case 'bitbucket':
      return `${remote.baseUrl}/branches/compare/${compare}..${base}`
    default:
      return null
  }
}

/**
 * Parse issue/PR numbers from commit message
 * Detects patterns like: #123, fixes #456, closes #789, GH-123
 */
export function parseIssueReferences(message: string): number[] {
  const patterns = [
    /#(\d+)/g,                    // #123
    /\bGH-(\d+)/gi,               // GH-123
    /\bfixes?\s+#(\d+)/gi,        // fixes #123
    /\bcloses?\s+#(\d+)/gi,       // closes #123
    /\bresolves?\s+#(\d+)/gi,     // resolves #123
  ]

  const issues = new Set<number>()
  
  for (const pattern of patterns) {
    const matches = message.matchAll(pattern)
    for (const match of matches) {
      issues.add(parseInt(match[1], 10))
    }
  }

  return Array.from(issues).sort((a, b) => a - b)
}

/**
 * Generate a link to an issue/PR
 */
export function getIssueLink(
  remoteUrl: string,
  issueNumber: number
): string | null {
  const remote = parseRemoteUrl(remoteUrl)
  if (!remote) return null

  switch (remote.platform) {
    case 'github':
      return `${remote.baseUrl}/issues/${issueNumber}`
    case 'gitlab':
      return `${remote.baseUrl}/-/issues/${issueNumber}`
    case 'bitbucket':
      return `${remote.baseUrl}/issues/${issueNumber}`
    default:
      return null
  }
}

/**
 * Get platform icon emoji
 */
export function getPlatformIcon(platform: string): string {
  switch (platform) {
    case 'github':
      return '🐙'
    case 'gitlab':
      return '🦊'
    case 'bitbucket':
      return '🪣'
    default:
      return '🔗'
  }
}

/**
 * Get platform display name
 */
export function getPlatformName(platform: string): string {
  switch (platform) {
    case 'github':
      return 'GitHub'
    case 'gitlab':
      return 'GitLab'
    case 'bitbucket':
      return 'Bitbucket'
    default:
      return 'Remote'
  }
}
