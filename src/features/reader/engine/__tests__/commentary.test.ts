import { groupComments, indexComments, worksWithComments } from '../commentary'
import type { ReaderComment } from '../types'

const c = (seif: number, sk: number): ReaderComment => ({ seif, sk, label: 'x', text: 't' })
const commentary = {
  a: [c(2, 3), c(1, 1), c(2, 2)],
  b: [c(1, 1)],
  d: [c(2, 1)],
}
const colorOf = (w: string) => ({ text: w, tint: w }) as never

describe('groupComments', () => {
  it('groups one unit by work in order, enabled only, sorted by sk', () => {
    const groups = groupComments(commentary, 2, ['d', 'b', 'a'], new Set(['a', 'b', 'd']), colorOf)
    expect(groups.map((g) => [g.work, g.comments.map((x) => x.sk)])).toEqual([
      ['d', [1]],
      ['a', [2, 3]],
    ])
  })
  it('drops disabled works', () => {
    const groups = groupComments(commentary, 2, ['a', 'd'], new Set(['d']), colorOf)
    expect(groups.map((g) => g.work)).toEqual(['d'])
  })
  it('is empty when nothing is enabled or commented', () => {
    expect(groupComments(commentary, 9, ['a'], new Set(['a']), colorOf)).toEqual([])
    expect(groupComments(commentary, 2, ['a'], new Set(), colorOf)).toEqual([])
  })
})

describe('worksWithComments', () => {
  it('lists commented works in order', () => {
    expect(worksWithComments(commentary, 1, ['d', 'b', 'a'])).toEqual(['b', 'a'])
  })
})

describe('indexComments', () => {
  it('indexes by work/seif/sk', () => {
    expect(indexComments(commentary).get('a/2/3')).toBe(commentary.a[0])
  })
})
