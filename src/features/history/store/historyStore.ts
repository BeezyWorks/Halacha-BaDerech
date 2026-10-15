import { create } from 'zustand'
import { persist } from 'zustand/middleware'

import { zustandStorage } from '@/lib/storage/zustandStorage'
import { type SeifLocation, sameLocation } from '../../halacha/types'

/** Where the user last was, so Home can take them back. */
export type LastLocation = SeifLocation

export const RECENT_LOCATIONS_LIMIT = 5

interface HistoryState {
  lastLocation: LastLocation | null
  /** Locations the user has opened, most recent first, capped at `RECENT_LOCATIONS_LIMIT`. */
  recentLocations: LastLocation[]
  setLastLocation: (location: LastLocation) => void
}

export const useHistoryStore = create<HistoryState>()(
  persist(
    (set) => ({
      lastLocation: null,
      recentLocations: [],
      setLastLocation: (lastLocation) =>
        set((state) => ({
          lastLocation,
          recentLocations: [
            lastLocation,
            ...state.recentLocations.filter((recent) => !sameLocation(recent, lastLocation)),
          ].slice(0, RECENT_LOCATIONS_LIMIT),
        })),
    }),
    { name: 'halacha-history', storage: zustandStorage },
  ),
)
