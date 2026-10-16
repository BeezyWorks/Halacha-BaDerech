import { adjacentSiman, coverageNote, isCovered } from '../coverage'

describe('isCovered', () => {
  it('knows the sefer bounds', () => {
    expect(isCovered('oc', 1)).toBe(true)
    expect(isCovered('oc', 697)).toBe(true)
    expect(isCovered('oc', 698)).toBe(false)
    expect(isCovered('oc', 0)).toBe(false)
    expect(isCovered('nope', 1)).toBe(false)
  })
  it('respects coverage gaps', () => {
    expect(isCovered('yd', 168)).toBe(true)
    expect(isCovered('yd', 169)).toBe(false)
    expect(isCovered('mb', 5)).toBe(false)
    expect(isCovered('mb', 186)).toBe(true)
    expect(isCovered('mb', 182)).toBe(false)
    expect(isCovered('mb', 588)).toBe(true)
  })
})

describe('adjacentSiman', () => {
  it('steps by one in a fully covered sefer', () => {
    expect(adjacentSiman('oc', 5, 1)).toBe(6)
    expect(adjacentSiman('oc', 5, -1)).toBe(4)
    expect(adjacentSiman('oc', 1, -1)).toBeUndefined()
    expect(adjacentSiman('oc', 697, 1)).toBeUndefined()
  })
  it('skips missing simanim', () => {
    expect(adjacentSiman('yd', 168, 1)).toBe(170)
    expect(adjacentSiman('yd', 170, -1)).toBe(168)
    expect(adjacentSiman('mb', 182, 1)).toBe(183)
    expect(adjacentSiman('mb', 180, 1)).toBe(181)
    expect(adjacentSiman('mb', 4, 1)).toBe(7)
  })
  it('works from an uncovered siman', () => {
    expect(adjacentSiman('mb', 100, 1)).toBe(101)
    expect(adjacentSiman('mb', 5, -1)).toBe(4)
    expect(adjacentSiman('mb', 1, -1)).toBeUndefined()
  })
})

describe('coverageNote', () => {
  it('lists the covered ranges of a sefer with gaps', () => {
    expect(coverageNote('yd')).toBe(
      'Text available for simanim א–קסח and קע–תג; the others are shown dimmed.',
    )
    expect(coverageNote('mb')).toMatch(/^Text available for \d+ of 697 simanim; the others/)
    expect(coverageNote('mb')).toMatch(/Biur Halacha\.$/)
  })
  it('is empty for a complete sefer', () => expect(coverageNote('kitzur')).toBeUndefined())
})
