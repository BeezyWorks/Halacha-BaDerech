import { create } from 'zustand'
import { persist } from 'zustand/middleware'

import { zustandStorage } from '@/lib/storage/zustandStorage'

/** The nosei keilim shown by default, per sefer (the ones printed around the text in the classic editions). */
export const DEFAULT_ENABLED_WORKS: Record<string, readonly string[]> = {
  oc: ['magenAvraham', 'tureiZahav', 'baerHetev', 'shaareiTeshuvah', 'beerHaGolah'],
  yd: ['sifteiKohen', 'tureiZahav', 'pitcheiTeshuva', 'baerHetev'],
  eh: ['beitShmuel', 'chelkatMechokek', 'tureiZahav', 'pitcheiTeshuva'],
  cm: [
    'meiratEinayim',
    'sifteiKohen',
    'tureiZahav',
    'ketzotHaChoshen',
    'netivotBeurim',
    'pitcheiTeshuva',
  ],
  mb: ['biurHalacha'],
  kitzur: [],
}

const NONE: readonly string[] = []

interface CommentaryState {
  /** Enabled works per sefer; a sefer missing here uses `DEFAULT_ENABLED_WORKS`. */
  enabledWorks: Record<string, string[]>
  /** Set the Rema's glosses in ktav Rashi (the traditional look) rather than smaller regular type. */
  remaInRashi: boolean

  toggleWork: (sefer: string, work: string) => void
  setRemaInRashi: (value: boolean) => void
}

export const useCommentaryStore = create<CommentaryState>()(
  persist(
    (set) => ({
      enabledWorks: {},
      remaInRashi: true,

      toggleWork: (sefer, work) =>
        set((s) => {
          const current = s.enabledWorks[sefer] ?? [...(DEFAULT_ENABLED_WORKS[sefer] ?? NONE)]
          const next = current.includes(work)
            ? current.filter((w) => w !== work)
            : [...current, work]
          return { enabledWorks: { ...s.enabledWorks, [sefer]: next } }
        }),
      setRemaInRashi: (remaInRashi) => set({ remaInRashi }),
    }),
    { name: 'halacha-commentary', storage: zustandStorage },
  ),
)

/** The enabled works of a sefer. The selector returns a stable array (stored or the default constant). */
export const useEnabledWorks = (sefer: string): readonly string[] =>
  useCommentaryStore((s) => s.enabledWorks[sefer] ?? DEFAULT_ENABLED_WORKS[sefer] ?? NONE)
