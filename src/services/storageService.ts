/**
 * Storage service for managing cloned repositories in OPFS (Origin Private File System)
 */

export interface ClonedRepo {
  name: string
  url: string
  clonedAt: number
  lastAccessed: number
}

const CLONED_REPOS_KEY = 'gittree_cloned_repos'

/**
 * Get the root directory for storing cloned repositories
 */
export async function getStorageRoot(): Promise<FileSystemDirectoryHandle> {
  const opfsRoot = await navigator.storage.getDirectory()
  
  // Create a subdirectory for cloned repos if it doesn't exist
  let reposDir: FileSystemDirectoryHandle
  try {
    reposDir = await opfsRoot.getDirectoryHandle('repos', { create: true })
  } catch (error) {
    throw new Error('Failed to access storage directory')
  }
  
  return reposDir
}

/**
 * Get directory handle for a specific cloned repository
 */
export async function getClonedRepoHandle(repoName: string): Promise<FileSystemDirectoryHandle> {
  const root = await getStorageRoot()
  return await root.getDirectoryHandle(repoName, { create: true })
}

/**
 * List all cloned repositories
 */
export async function listClonedRepos(): Promise<ClonedRepo[]> {
  const stored = localStorage.getItem(CLONED_REPOS_KEY)
  if (!stored) return []
  
  try {
    return JSON.parse(stored)
  } catch {
    return []
  }
}

/**
 * Add a cloned repository to the list
 */
export async function addClonedRepo(name: string, url: string): Promise<void> {
  const repos = await listClonedRepos()
  
  // Remove existing entry if it exists
  const filtered = repos.filter(r => r.name !== name)
  
  // Add new entry
  filtered.push({
    name,
    url,
    clonedAt: Date.now(),
    lastAccessed: Date.now(),
  })
  
  localStorage.setItem(CLONED_REPOS_KEY, JSON.stringify(filtered))
}

/**
 * Update last accessed time for a repository
 */
export async function updateLastAccessed(name: string): Promise<void> {
  const repos = await listClonedRepos()
  const repo = repos.find(r => r.name === name)
  
  if (repo) {
    repo.lastAccessed = Date.now()
    localStorage.setItem(CLONED_REPOS_KEY, JSON.stringify(repos))
  }
}

/**
 * Remove a cloned repository
 */
export async function removeClonedRepo(name: string): Promise<void> {
  // Remove from localStorage
  const repos = await listClonedRepos()
  const filtered = repos.filter(r => r.name !== name)
  localStorage.setItem(CLONED_REPOS_KEY, JSON.stringify(filtered))
  
  // Remove from OPFS
  try {
    const root = await getStorageRoot()
    await root.removeEntry(name, { recursive: true })
  } catch (error) {
    console.error('Failed to remove repository from storage:', error)
  }
}

/**
 * Extract repository name from URL
 */
export function extractRepoName(url: string): string {
  // Handle various URL formats:
  // - https://github.com/user/repo.git
  // - https://github.com/user/repo
  // - git@github.com:user/repo.git
  
  let name = url
  
  // Remove .git extension
  name = name.replace(/\.git$/, '')
  
  // Extract last part of path
  const parts = name.split('/')
  name = parts[parts.length - 1]
  
  // Sanitize for filesystem
  name = name.replace(/[^a-zA-Z0-9-_]/g, '-')
  
  return name || 'repository'
}

/**
 * Check if OPFS is supported
 */
export function isOPFSSupported(): boolean {
  return 'storage' in navigator && 'getDirectory' in navigator.storage
}
