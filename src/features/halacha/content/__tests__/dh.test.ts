import { dhSegments, matchDh, tokenEq, tokenize } from '../dh'

const found = (text: string, m?: { start: number; end: number }) =>
  m ? text.slice(m.start, m.end) : undefined

describe('tokenize', () => {
  it('joins quotes into words and drops nikud from the token', () => {
    const t = tokenize('מג"א סק"ה ויתגבר כארי.')
    expect(t.map((x) => x.w)).toEqual(['מגא', 'סקה', 'ויתגבר', 'כארי'])
    expect(t[0]).toMatchObject({ abbr: true, init: true })
    expect(tokenize("כו'")[0]).toMatchObject({ w: 'כו', abbr: true })
    expect(tokenize("כו'")[0].init).toBeUndefined()
  })
  it('records offsets in the original text', () => {
    const text = 'א בְּרֵאשִׁית'
    const t = tokenize(text)
    expect(text.slice(t[1].start, t[1].end)).toBe('בְּרֵאשִׁית')
  })
})

describe('tokenEq', () => {
  it('tolerates prefix letters, abbreviation prefixes and one typo', () => {
    expect(tokenEq('והשחר', 'השחר')).toBe(true)
    expect(tokenEq('העקדה', 'העקידה')).toBe(true)
    expect(tokenEq('שמואל', 'חזקיה')).toBe(false)
    expect(tokenEq('אב', 'אד')).toBe(false)
  })
})

describe('dhSegments', () => {
  it('cuts at כו׳ and drops seif locators and parentheticals', () => {
    const s = dhSegments("סעי' א יתגבר כו' לעבודת כו'")
    expect(s.map((seg) => seg.map((t) => t.w))).toEqual([['יתגבר'], ['לעבודת']])
    expect(dhSegments("(ליקוט) אפי' אין כו' וגם כו'").map((seg) => seg.map((t) => t.w))).toEqual([
      ['אפי', 'אין'],
      ['וגם'],
    ])
  })
})

describe('matchDh (anchored at a marker)', () => {
  const text = 'יתגבר כארי לעמוד בבוקר לעבודת בוראו שיהא הוא מעורר השחר'

  it('finds the end of the DH words', () => {
    expect(
      found(text, matchDh(text, 'שיהא הוא מעורר', { mode: 'anchored', at: text.indexOf('שיהא') })),
    ).toBe('שיהא הוא מעורר')
    expect(found(text, matchDh(text, 'יתגבר כארי.', { mode: 'anchored', at: 0 }))).toBe(
      'יתגבר כארי',
    )
  })

  it('stops at כו׳ and matches only the leading words', () => {
    expect(
      found(
        text,
        matchDh(text, "שיהא הוא מעורר כו'", { mode: 'anchored', at: text.indexOf('שיהא') }),
      ),
    ).toBe('שיהא הוא מעורר')
  })

  it('follows a DH with a gap: "יתגבר כו\' לעבודת כו\'"', () => {
    expect(
      found(text, matchDh(text, "סעי' א יתגבר כו' לעבודת כו'", { mode: 'anchored', at: 0 })),
    ).toBe('יתגבר כארי לעמוד בבוקר לעבודת')
  })

  it('tolerates a one-letter typo and a different prefix letter', () => {
    const t = 'והעקדה ופרשת המן'
    expect(found(t, matchDh(t, 'העקידה ופרשת', { mode: 'anchored', at: 0 }))).toBe('והעקדה ופרשת')
  })

  it('expands initials: ע"ג = על גבי, בה"מ = בית המקדש', () => {
    const a = 'על גבי כלי יחזירנה'
    expect(found(a, matchDh(a, 'ע"ג כלי יחזירנה', { mode: 'anchored', at: 0 }))).toBe(
      'על גבי כלי יחזירנה',
    )
    const b = 'חורבן בית המקדש:'
    expect(found(b, matchDh(b, 'חורבן בה"מ', { mode: 'anchored', at: 0 }))).toBe('חורבן בית המקדש')
  })

  it('tolerates a couple of extra words in the text inside a longer DH', () => {
    const t = "ולא ילך ד' אמות בגילוי הראש ויבדוק"
    expect(found(t, matchDh(t, 'ולא ילך בגילוי הראש', { mode: 'anchored', at: 0 }))).toBe(
      "ולא ילך ד' אמות בגילוי הראש",
    )
  })

  it('returns undefined when the DH is not there (no confident match)', () => {
    expect(matchDh(text, 'משהו אחר לגמרי', { mode: 'anchored', at: 0 })).toBeUndefined()
    expect(matchDh(text, '', { mode: 'anchored', at: 0 })).toBeUndefined()
  })

  it('skips up to two words if the marker sits slightly early', () => {
    expect(
      matchDh(text, 'שיהא הוא', { mode: 'anchored', at: text.indexOf('לעמוד') }),
    ).toBeUndefined()
    expect(
      found(text, matchDh(text, 'בבוקר לעבודת', { mode: 'anchored', at: text.indexOf('לעמוד') })),
    ).toBe('בבוקר לעבודת')
  })
})

describe('matchDh (search, for comments without markers)', () => {
  const text = 'ראשון שני שלישי רביעי שני שלישי'
  it('finds the first occurrence from `from`', () => {
    const first = matchDh(text, 'שני שלישי', { mode: 'search' })!
    expect(first.start).toBe(text.indexOf('שני'))
    const second = matchDh(text, 'שני שלישי', { mode: 'search', from: first.end })!
    expect(second.start).toBeGreaterThan(first.end)
  })
  it('refuses very short single-word DHs', () => {
    expect(matchDh(text, 'שני', { mode: 'search' })).toBeUndefined()
  })
})
