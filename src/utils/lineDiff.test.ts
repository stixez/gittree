import { describe, it, expect } from 'vitest'
import { diffLines, collapseContext, type DiffRow } from './lineDiff'

const types = (rows: DiffRow[]) => rows.map(r => r.type)

describe('diffLines', () => {
  it('returns all context for identical text', () => {
    const rows = diffLines('a\nb\nc', 'a\nb\nc')
    expect(types(rows)).toEqual(['context', 'context', 'context'])
    expect(rows[0]).toEqual({ type: 'context', text: 'a', oldNo: 1, newNo: 1 })
  })

  it('marks added lines (empty old = all added)', () => {
    const rows = diffLines('', 'x\ny')
    expect(types(rows)).toEqual(['add', 'add'])
    expect(rows[0]).toEqual({ type: 'add', text: 'x', newNo: 1 })
    expect(rows[1].newNo).toBe(2)
  })

  it('marks deleted lines (empty new = all removed)', () => {
    const rows = diffLines('x\ny', '')
    expect(types(rows)).toEqual(['del', 'del'])
    expect(rows[0]).toEqual({ type: 'del', text: 'x', oldNo: 1 })
  })

  it('handles a modification in the middle with stable context', () => {
    const rows = diffLines('a\nb\nc', 'a\nB\nc')
    expect(types(rows)).toEqual(['context', 'del', 'add', 'context'])
    const del = rows.find(r => r.type === 'del')!
    const add = rows.find(r => r.type === 'add')!
    expect(del).toMatchObject({ text: 'b', oldNo: 2 })
    expect(add).toMatchObject({ text: 'B', newNo: 2 })
    // trailing context keeps correct numbers on both sides
    expect(rows[3]).toMatchObject({ text: 'c', oldNo: 3, newNo: 3 })
  })

  it('numbers a pure insertion in the middle', () => {
    const rows = diffLines('a\nc', 'a\nb\nc')
    expect(types(rows)).toEqual(['context', 'add', 'context'])
    expect(rows[1]).toMatchObject({ type: 'add', text: 'b', newNo: 2 })
    expect(rows[2]).toMatchObject({ oldNo: 2, newNo: 3 })
  })

  it('treats empty/empty as no rows', () => {
    expect(diffLines('', '')).toEqual([])
  })

  it('ignores a trailing newline difference', () => {
    expect(types(diffLines('a\nb\n', 'a\nb'))).toEqual(['context', 'context'])
  })

  it('ignores CRLF-vs-LF line-ending differences', () => {
    expect(types(diffLines('a\r\nb', 'a\nb'))).toEqual(['context', 'context'])
  })
})

describe('collapseContext', () => {
  it('leaves short context runs intact', () => {
    const rows = diffLines('a\nb\nX\nc\nd', 'a\nb\nY\nc\nd')
    const out = collapseContext(rows, 3)
    expect(out.some(r => r.type === 'sep')).toBe(false)
  })

  it('folds a long unchanged run into a separator with the right count', () => {
    // 12 identical lines, change in the middle
    const old = Array.from({ length: 25 }, (_, i) => `line${i}`).join('\n')
    const neu = old.replace('line12', 'CHANGED')
    const out = collapseContext(diffLines(old, neu), 3)
    const seps = out.filter(r => r.type === 'sep') as Array<{ type: 'sep'; count: number }>
    expect(seps.length).toBeGreaterThanOrEqual(2) // head and tail runs both collapse
    expect(seps[0].count).toBeGreaterThan(0)
    // padding context preserved around the change
    expect(out.some(r => r.type === 'del')).toBe(true)
    expect(out.some(r => r.type === 'add')).toBe(true)
  })
})
