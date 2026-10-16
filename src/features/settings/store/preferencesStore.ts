import {
  type ContentSelection,
  defaultContentSelection,
  type Typeface,
  ContentSize,
  contentSizeValue,
  Leading,
  leadingValue,
} from '@beezyworks/design'
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

import { zustandStorage } from '@/lib/storage/zustandStorage'

/** Reading size in px and line-height multiplier (`lineHeight = fontSize × leading`). The
 * defaults/bounds cover the old S–XL and Tight–Loose presets (20–32px, 2.0–2.8). */
export const FONT_SIZE_MIN = 16
export const FONT_SIZE_MAX = 40
export const LEADING_MIN = 1.6
export const LEADING_MAX = 3
const DEFAULT_FONT_SIZE = contentSizeValue[ContentSize.Normal]
const DEFAULT_LEADING = 1 + leadingValue[Leading.OneAndAHalf]

const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n))

export type ColorSchemePreference = 'system' | 'light' | 'sepia' | 'dark'

interface PreferencesState {
  colorScheme: ColorSchemePreference
  /** Reading typeface/size/leading, in the design system's vocabulary. Size and
   * leading are always the DL's numeric form (slider + stepper buttons), never presets. */
  content: ContentSelection & { size: number; leading: number }
  /** Share of the seif panel the pinned seif may take before it scrolls. */
  seifPaneRatio: number
  /** Icon-only nav rail on wide web. */
  navRailCollapsed: boolean

  setColorScheme: (value: ColorSchemePreference) => void
  setTypeface: (value: Typeface) => void
  setContentSize: (value: number) => void
  setLeading: (value: number) => void
  setSeifPaneRatio: (ratio: number) => void
  toggleNavRailCollapsed: () => void
}

export const usePreferencesStore = create<PreferencesState>()(
  persist(
    (set) => ({
      colorScheme: 'system',
      content: {
        ...defaultContentSelection,
        size: DEFAULT_FONT_SIZE,
        leading: DEFAULT_LEADING,
      },
      seifPaneRatio: 0.35,
      navRailCollapsed: false,

      setColorScheme: (colorScheme) => set({ colorScheme }),
      setTypeface: (typeface) => set((s) => ({ content: { ...s.content, typeface } })),
      setContentSize: (size) =>
        set((s) => ({
          content: { ...s.content, size: clamp(size, FONT_SIZE_MIN, FONT_SIZE_MAX) },
        })),
      setLeading: (leading) =>
        set((s) => ({
          content: {
            ...s.content,
            leading: clamp(Math.round(leading * 10) / 10, LEADING_MIN, LEADING_MAX),
          },
        })),
      setSeifPaneRatio: (seifPaneRatio) => set({ seifPaneRatio }),
      toggleNavRailCollapsed: () => set((s) => ({ navRailCollapsed: !s.navRailCollapsed })),
    }),
    { name: 'halacha-preferences', storage: zustandStorage },
  ),
)
