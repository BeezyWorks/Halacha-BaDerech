import { useCallback, useRef } from 'react'
import type { ScrollView } from 'react-native'

/**
 * Lets nested items report where they sit (from their `onLayout`) and a
 * screen scroll to one: an item's y is relative to its parent, so a nested
 * item is addressed by the keys of every ancestor on the way down and the
 * offsets are summed.
 */
export function useScrollRegistry() {
  const scrollRef = useRef<ScrollView | null>(null)
  const positions = useRef(new Map<string, number>())

  const register = useCallback((key: string, y: number) => {
    positions.current.set(key, y)
  }, [])

  /** Scrolls to the sum of the keys' offsets (plus `base`); false if any is not laid out yet. */
  const scrollToKeys = useCallback((keys: string[], base = 0, margin = 12) => {
    let y = base
    for (const key of keys) {
      const offset = positions.current.get(key)
      if (offset === undefined) return false
      y += offset
    }
    scrollRef.current?.scrollTo({ y: Math.max(0, y - margin), animated: true })
    return true
  }, [])

  return { scrollRef, register, scrollToKeys }
}

export type ScrollRegistry = ReturnType<typeof useScrollRegistry>
