import { create } from 'zustand'
import { persist } from 'zustand/middleware'

import { zustandStorage } from '@/lib/storage/zustandStorage'
import { generateId } from '@/lib/utils/ids'
import type { SeifLocation } from '../../halacha/types'
import type { Note } from '../types'

interface NotesState {
  notes: Note[]
  addNote: (location: SeifLocation, text: string) => string
  updateNote: (id: string, text: string) => void
  removeNote: (id: string) => void
}

/**
 * Same shape as the mishna app's notes store. Never select a filtered
 * array (`s.notes.filter(...)`) — a new reference per render makes
 * `useSyncExternalStore` loop forever. Select `s.notes` and filter in a
 * `useMemo` (see `NoteInlineEditor`).
 */
export const useNotesStore = create<NotesState>()(
  persist(
    (set) => ({
      notes: [],

      addNote: (location, text) => {
        const id = generateId()
        const now = Date.now()
        set((s) => ({
          notes: [{ id, location, text, createdAt: now, updatedAt: now }, ...s.notes],
        }))
        return id
      },

      updateNote: (id, text) =>
        set((s) => ({
          notes: s.notes.map((n) => (n.id === id ? { ...n, text, updatedAt: Date.now() } : n)),
        })),

      removeNote: (id) => set((s) => ({ notes: s.notes.filter((n) => n.id !== id) })),
    }),
    { name: 'halacha-notes', storage: zustandStorage },
  ),
)
