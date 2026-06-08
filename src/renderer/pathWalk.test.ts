import { describe, it, expect } from 'vitest'
import { ancestors, descendants, connectedPath } from './pathWalk'

// DAG (child -> parents):  D -> C -> B -> A,  and E -> C  (a branch off C)
const parentsOf = new Map<string, string[]>([
  ['D', ['C']],
  ['C', ['B']],
  ['B', ['A']],
  ['A', []],
  ['E', ['C']],
])
// child links (parent -> children)
const childrenOf = new Map<string, string[]>([
  ['C', ['D', 'E']],
  ['B', ['C']],
  ['A', ['B']],
])

describe('ancestors', () => {
  it('includes self and all parents transitively', () => {
    expect(ancestors('C', parentsOf)).toEqual(new Set(['C', 'B', 'A']))
  })
})

describe('descendants', () => {
  it('includes self and all children transitively, across branches', () => {
    expect(descendants('B', childrenOf)).toEqual(new Set(['B', 'C', 'D', 'E']))
  })
})

describe('connectedPath', () => {
  it('is the union of ancestors and descendants through the node', () => {
    expect(connectedPath('C', parentsOf, childrenOf)).toEqual(new Set(['A', 'B', 'C', 'D', 'E']))
  })
})
