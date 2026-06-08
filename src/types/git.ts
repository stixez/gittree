export interface GitCommit {
  oid: string
  message: string
  author: {
    name: string
    email: string
    timestamp: number
    /** Minutes, JS getTimezoneOffset() convention (UTC − local). */
    timezoneOffset?: number
  }
  committer: {
    name: string
    email: string
    timestamp: number
    timezoneOffset?: number
  }
  parents: string[]
  /** Root tree oid (from git.log); lets the path filter skip a readCommit per commit. */
  tree?: string
}

export interface GitBranch {
  name: string
  oid: string
}

export interface GitTag {
  name: string
  oid: string
}

export interface GitRepository {
  commits: GitCommit[]
  branches: GitBranch[]
  tags: GitTag[]
  head: string
  remoteUrl?: string
  /** True when the loaded commits are a known subset (shallow or depth-capped). */
  isPartial?: boolean
}
