import { create } from 'zustand'
import { persist } from 'zustand/middleware'

import { zustandStorage } from '@/lib/storage/zustandStorage'
import { generateId } from '@/lib/utils/ids'
import { type SeifLocation, sameLocation } from '../../halacha/types'
import type { Bookmark } from '../types'

interface BookmarksState {
  bookmarks: Bookmark[]
  removeBookmark: (id: string) => void
  toggleBookmark: (location: SeifLocation) => void
}

/**
 * Same shape as the mishna app's bookmarks store. To check one location in
 * a render, select `state.bookmarks` and test with `sameLocation` — a
 * selector that computes a fresh value per call is fine for booleans, but
 * never return a freshly-filtered array from a selector (see notesStore).
 */
export const useBookmarksStore = create<BookmarksState>()(
  persist(
    (set, get) => ({
      bookmarks: [],

      removeBookmark: (id) => set((s) => ({ bookmarks: s.bookmarks.filter((b) => b.id !== id) })),

      toggleBookmark: (location) => {
        const existing = get().bookmarks.find((b) => sameLocation(b.location, location))
        if (existing) {
          get().removeBookmark(existing.id)
        } else {
          const bookmark: Bookmark = { id: generateId(), location, createdAt: Date.now() }
          set((s) => ({ bookmarks: [bookmark, ...s.bookmarks] }))
        }
      },
    }),
    { name: 'halacha-bookmarks', storage: zustandStorage },
  ),
)

export const useIsBookmarked = (location: SeifLocation | null) =>
  useBookmarksStore(
    (s) => !!location && s.bookmarks.some((b) => sameLocation(b.location, location)),
  )
