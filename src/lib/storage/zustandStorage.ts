import AsyncStorage from '@react-native-async-storage/async-storage'
import { createJSONStorage } from 'zustand/middleware'

/**
 * Shared persistence layer for every zustand store (progress, bookmarks,
 * notes, preferences). `@react-native-async-storage/async-storage` ships a
 * web implementation backed by `localStorage`, so this one adapter works
 * unmodified on iOS, Android, and web.
 */
export const zustandStorage = createJSONStorage(() => AsyncStorage)
