import { describe, it, expect } from 'vitest'
import { handleLayoutRequest } from '../layout.worker'
import type { LayoutRequest } from '../../renderer/types'

describe('handleLayoutRequest', () => {
  it('returns a layout-result with a scene', () => {
    const req: LayoutRequest = {
      type: 'layout',
      repository: {
        commits: [
          { oid: 'b', message: 'b', author: { name: 'a', email: 'e', timestamp: 2 }, committer: { name: 'a', email: 'e', timestamp: 2 }, parents: ['a'] },
          { oid: 'a', message: 'a', author: { name: 'a', email: 'e', timestamp: 1 }, committer: { name: 'a', email: 'e', timestamp: 1 }, parents: [] },
        ],
        branches: [{ name: 'main', oid: 'b' }],
        tags: [],
        head: 'b',
      },
    }
    const res = handleLayoutRequest(req)
    expect(res.type).toBe('layout-result')
    expect(res.scene.nodes.length).toBe(2)
    expect(res.scene.headOid).toBe('b')
  })
})
