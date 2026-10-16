import { locationKey, sameLocation, seferName, seifLabel, simanLabel } from '../types'

describe('location labels', () => {
  it('writes sefer, siman and seif in Hebrew numerals', () => {
    expect(seifLabel({ sefer: 'oc', siman: 328, seif: 2 })).toBe('או״ח סימן שכח סעיף ב')
    expect(seifLabel({ sefer: 'yd', siman: 168, seif: 15 })).toBe('יו״ד סימן קסח סעיף טו')
    expect(seifLabel({ sefer: 'mb', siman: 1, seif: 1 })).toBe('משנה ברורה סימן א סעיף א')
    expect(seifLabel({ sefer: 'kitzur', siman: 221, seif: 16 })).toBe('קיצור שו״ע סימן רכא סעיף טז')
  })
  it('falls back to the raw id for an unknown sefer', () => {
    expect(seifLabel({ sefer: 'tur', siman: 3, seif: 1 })).toBe('tur סימן ג סעיף א')
    expect(seferName('tur')).toBe('tur')
  })
  it('labels a siman', () => expect(simanLabel(15)).toBe('סימן טו'))
  it('compares locations', () => {
    const a = { sefer: 'oc', siman: 1, seif: 1 }
    expect(sameLocation(a, { ...a })).toBe(true)
    expect(locationKey(a)).toBe('oc/1/1')
  })
})
