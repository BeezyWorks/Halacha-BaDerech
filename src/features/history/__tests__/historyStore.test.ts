jest.mock('@/lib/storage/zustandStorage', () => ({
  zustandStorage: { getItem: () => null, setItem: () => {}, removeItem: () => {} },
}))

import { RECENT_LOCATIONS_LIMIT, useHistoryStore } from '../store/historyStore'

const open = (siman: number) =>
  useHistoryStore.getState().setLastLocation({ sefer: 'oc', siman, seif: 1 })

beforeEach(() => useHistoryStore.setState({ lastLocation: null, recentLocations: [] }))

describe('recent locations', () => {
  it('puts the newest first and caps the list', () => {
    for (let siman = 1; siman <= RECENT_LOCATIONS_LIMIT + 2; siman++) open(siman)
    const { recentLocations } = useHistoryStore.getState()
    expect(recentLocations).toHaveLength(RECENT_LOCATIONS_LIMIT)
    expect(recentLocations[0]).toMatchObject({ siman: RECENT_LOCATIONS_LIMIT + 2 })
  })

  it('moves a revisited location to the front instead of duplicating it', () => {
    open(1)
    open(2)
    open(1)
    expect(useHistoryStore.getState().recentLocations).toEqual([
      { sefer: 'oc', siman: 1, seif: 1 },
      { sefer: 'oc', siman: 2, seif: 1 },
    ])
  })
})
