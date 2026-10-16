import { adjacentSiman, isCovered } from '../coverage'

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
    expect(isCovered('mb', 186)).toBe(false)
    expect(isCovered('mb', 187)).toBe(true)
    expect(isCovered('mb', 588)).toBe(false)
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
    expect(adjacentSiman('mb', 587, 1)).toBe(589)
  })
  it('works from an uncovered siman', () => {
    expect(adjacentSiman('mb', 100, 1)).toBe(187)
    expect(adjacentSiman('mb', 100, -1)).toBeUndefined()
  })
})
