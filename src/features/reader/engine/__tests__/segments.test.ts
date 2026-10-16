import { buildRuns, commentKey, implicitEnd, visibleAnchors } from '../segments'
import type { SpanAnchor, WorkStyle } from '../types'

const color = { text: 'category1', tint: 'categoryTint1' } as never
const styles: Record<string, WorkStyle> = {
  a: { color, order: 0 },
  b: { color, order: 1 },
}
const styleOf = (w: string) => styles[w]
const span = (over: Partial<SpanAnchor> & Pick<SpanAnchor, 'start' | 'end'>): SpanAnchor => ({
  key: 'k',
  work: 'a',
  sk: 1,
  label: 'א',
  color,
  order: 0,
  ...over,
})

describe('implicitEnd', () => {
  it('takes the next two words', () => {
    const text = 'אבג דהו זחט יכל'
    expect(text.slice(0, implicitEnd(text, 0))).toBe('אבג דהו')
    expect(text.slice(4, implicitEnd(text, 4))).toBe('דהו זחט')
  })
  it('skips leading spaces and stops at the end', () => {
    expect(implicitEnd('אבג  דהו', 3)).toBe(8)
    expect(implicitEnd('אבג', 3)).toBe(3)
    expect(implicitEnd('אבג', 99)).toBe(3)
  })
})

describe('visibleAnchors', () => {
  const unit = {
    n: 2,
    text: 'אבג דהו זחט יכל',
    anchors: [
      { at: 8, end: 11, work: 'b', sk: 3 },
      { at: 0, work: 'a', sk: 1 },
      { at: 0, end: 3, work: 'off', sk: 9 },
      { at: 4, end: 7, work: 'a', sk: 2 },
    ],
  }
  const labelOf = (a: { sk: number }) => (a.sk === 2 ? undefined : `l${a.sk}`)

  it('keeps enabled works with a comment, resolves open ends, sorts', () => {
    const spans = visibleAnchors(unit, styleOf, labelOf)
    expect(spans.map((s) => [s.work, s.sk, s.start, s.end, s.label])).toEqual([
      ['a', 1, 0, 7, 'l1'],
      ['b', 3, 8, 11, 'l3'],
    ])
    expect(spans[0].key).toBe(commentKey('a', 2, 1))
  })
  it('clamps spans to the text', () => {
    const [s] = visibleAnchors(
      { n: 1, text: 'אבג', anchors: [{ at: 1, end: 50, work: 'a', sk: 1 }] },
      styleOf,
      () => 'x',
    )
    expect([s.start, s.end]).toEqual([1, 3])
  })
})

describe('buildRuns', () => {
  const join = (runs: { text: string }[]) => runs.map((r) => r.text).join('')

  it('is a single run without marks or spans', () => {
    expect(buildRuns('אבג דהו')).toEqual([
      { text: 'אבג דהו', hagah: false, span: undefined, labels: [] },
    ])
    expect(buildRuns('')).toEqual([])
  })

  it('flags hagah runs', () => {
    const runs = buildRuns('אבג הגה דהו', [{ start: 4, end: 11, kind: 'hagah' }])
    expect(runs.map((r) => [r.text, r.hagah])).toEqual([
      ['אבג ', false],
      ['הגה דהו', true],
    ])
  })

  it('highlights a span and puts its label after it', () => {
    const s = span({ start: 4, end: 7 })
    const runs = buildRuns('אבג דהו זחט', [], [s])
    expect(join(runs)).toBe('אבג דהו זחט')
    expect(runs.map((r) => [r.text, r.span, r.labels.length])).toEqual([
      ['אבג ', undefined, 0],
      ['דהו', s, 1],
      [' זחט', undefined, 0],
    ])
  })

  it('splits at every boundary of overlapping spans and prefers the narrowest', () => {
    const wide = span({ start: 0, end: 7, sk: 1, key: 'wide' })
    const narrow = span({ start: 4, end: 7, sk: 2, key: 'narrow', work: 'b', order: 1 })
    const runs = buildRuns('אבג דהו זחט', [], [wide, narrow])
    expect(join(runs)).toBe('אבג דהו זחט')
    expect(runs.map((r) => [r.text, r.span?.key])).toEqual([
      ['אבג ', 'wide'],
      ['דהו', 'narrow'],
      [' זחט', undefined],
    ])
    // both end at 7: both labels come after the same run
    expect(runs[1].labels.map((l) => l.key)).toEqual(['wide', 'narrow'])
  })

  it('handles adjacent spans and ties by work order', () => {
    const first = span({ start: 0, end: 3, key: 'one' })
    const second = span({ start: 3, end: 7, key: 'two', work: 'b', order: 1 })
    const same = span({ start: 3, end: 7, key: 'three', order: 5 })
    const runs = buildRuns('אבגדהוז', [], [first, second, same])
    expect(runs.map((r) => [r.text, r.span?.key])).toEqual([
      ['אבג', 'one'],
      ['דהוז', 'two'],
    ])
  })

  it('draws the label of a span that ends at the end of the text', () => {
    const runs = buildRuns(
      'אבג',
      [],
      [span({ start: 3, end: 3 }), span({ start: 0, end: 3, sk: 2 })],
    )
    expect(runs[runs.length - 1].labels).toHaveLength(2)
  })

  it('combines marks and spans across a hagah boundary', () => {
    const s = span({ start: 2, end: 8 })
    const runs = buildRuns('אבגדהוזחט', [{ start: 5, end: 9, kind: 'hagah' }], [s])
    expect(runs.map((r) => [r.text, r.hagah, !!r.span])).toEqual([
      ['אב', false, false],
      ['גדה', false, true],
      ['וזח', true, true],
      ['ט', true, false],
    ])
  })
})
