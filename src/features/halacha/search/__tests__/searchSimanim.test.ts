import { catalog } from '../../data/catalog'
import {
  parseQuery,
  parseSimanNumber,
  searchSefarim,
  searchSimanim,
  simanEntries,
} from '../searchSimanim'

const SA = catalog.sefarim.filter((s) => s.group === 'shulchanAruch')
const titles = (pairs: [number, string][]) => new Map(pairs)
const entries = {
  oc: simanEntries(
    'oc',
    697,
    titles([
      [1, 'דין השכמת הבוקר'],
      [328, 'דיני שבת ויום טוב'],
    ]),
  ),
  yd: simanEntries('yd', 403, titles([[328, 'דין גר']])),
  eh: simanEntries('eh', 178, undefined),
  cm: simanEntries('cm', 427, undefined),
}

describe('parseSimanNumber', () => {
  it('reads digits and canonical Hebrew numerals', () => {
    expect(parseSimanNumber('328')).toBe(328)
    expect(parseSimanNumber('שכח')).toBe(328)
    expect(parseSimanNumber('ט״ו')).toBe(15)
    expect(parseSimanNumber('טו')).toBe(15)
    expect(parseSimanNumber('תרצ"ד')).toBe(694)
    expect(parseSimanNumber('א')).toBe(1)
    expect(parseSimanNumber('ך')).toBe(20)
  })
  it('rejects words and latin text', () => {
    expect(parseSimanNumber('חיים')).toBeUndefined()
    expect(parseSimanNumber('אוח')).toBeUndefined()
    expect(parseSimanNumber('oc')).toBeUndefined()
    expect(parseSimanNumber('')).toBeUndefined()
  })
})

describe('parseQuery', () => {
  it('splits a trailing number from the sefer name', () => {
    expect(parseQuery('oc 328')).toEqual({ sefer: 'oc', siman: 328 })
    expect(parseQuery('orach chaim 1')).toEqual({ sefer: 'orach chaim', siman: 1 })
    expect(parseQuery('או״ח א')).toEqual({ sefer: 'או״ח', siman: 1 })
    expect(parseQuery('orach chaim')).toEqual({ sefer: 'orach chaim' })
    expect(parseQuery('שכח')).toEqual({ sefer: 'שכח' })
  })
})

describe('searchSefarim', () => {
  const ids = (q: string) => searchSefarim(SA, q).map((s) => s.id)
  it('matches Hebrew, English and transliterations', () => {
    expect(ids('oc')).toEqual(['oc'])
    expect(ids('orach chaim')).toEqual(['oc'])
    expect(ids('Orach Chayim')).toEqual(['oc'])
    expect(ids('או״ח')).toEqual(['oc'])
    expect(ids('אורח')).toEqual(['oc'])
    expect(ids('yoreh')).toEqual(['yd'])
    expect(ids('even haezer')).toEqual(['eh'])
    expect(ids('choshen')).toEqual(['cm'])
    expect(ids('cm')).toEqual(['cm'])
    expect(ids('banana')).toEqual([])
  })
  it('returns everything for an empty query', () => {
    expect(ids('  ')).toHaveLength(4)
  })
})

describe('searchSimanim', () => {
  const search = (q: string) => searchSimanim(q, SA, entries)
  const keys = (q: string) => search(q).simanim.map((e) => `${e.sefer}${e.n}`)

  it('finds a siman by Hebrew numeral or digits in every chelek', () => {
    expect(keys('שכח')).toEqual(['oc328', 'yd328', 'cm328'])
    expect(keys('328')).toEqual(['oc328', 'yd328', 'cm328'])
  })
  it('finds a chelek + siman', () => {
    expect(keys('oc 328')).toEqual(['oc328'])
    expect(keys('orach chaim 1')).toEqual(['oc1'])
    expect(keys('או״ח א')).toEqual(['oc1'])
    expect(keys('yoreh deah 328')).toEqual(['yd328'])
  })
  it('ignores a siman past the end of the chelek', () => {
    expect(keys('eh 500')).toEqual([])
  })
  it('names a chelek alone', () => {
    expect(search('orach chaim')).toEqual({ sefarim: ['oc'], simanim: [] })
  })
  it('matches heading substrings, numerals first', () => {
    expect(keys('השכמת')).toEqual(['oc1'])
    expect(keys('יום טוב')).toEqual(['oc328'])
  })
  it('does not match headings on a single letter or digits', () => {
    expect(keys('ד')).toEqual(['oc4', 'yd4', 'eh4', 'cm4'])
  })
  it('marks uncovered simanim', () => {
    const mb = { mb: simanEntries('mb', 697, undefined) }
    const r = searchSimanim('100', [{ id: 'mb' }], mb)
    expect(r.simanim[0]).toMatchObject({ sefer: 'mb', n: 100, covered: false })
    expect(searchSimanim('328', [{ id: 'mb' }], mb).simanim[0].covered).toBe(true)
  })
  it('returns nothing for an empty query', () => {
    expect(search('').simanim).toEqual([])
  })
})
