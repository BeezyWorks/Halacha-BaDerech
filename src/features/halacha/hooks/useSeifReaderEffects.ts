import { useEffect, useMemo } from 'react'

import { useBookmarksStore } from '../../bookmarks/store/bookmarksStore'
import { useNotesStore } from '../../notes/store/notesStore'
import type { SimanBundle } from '../content/types'
import type { SeifTarget } from './useSeifSelection'

/** The seifim of this siman that have a bookmark or a note. */
export function useMarkedSeifim(bundle: SimanBundle): ReadonlySet<number> {
  const bookmarks = useBookmarksStore((s) => s.bookmarks)
  const notes = useNotesStore((s) => s.notes)
  return useMemo(() => {
    const set = new Set<number>()
    for (const x of [...bookmarks, ...notes]) {
      if (x.location.sefer === bundle.sefer && x.location.siman === bundle.siman) {
        set.add(x.location.seif)
      }
    }
    return set
  }, [bookmarks, notes, bundle.sefer, bundle.siman])
}

/** `?seif=n`: once the siman is laid out, scroll to that seif and open its panel. */
export function useOpenInitialSeif(
  bundle: SimanBundle,
  initialSeif: number | undefined,
  scrollTo: (keys: string[]) => boolean,
  open: (target: SeifTarget) => void,
) {
  useEffect(() => {
    if (!initialSeif) return
    // Layout settles a little after mount; retry once, and open the panel regardless.
    const first = setTimeout(() => {
      if (scrollTo([`seif:${initialSeif}`])) open({ seif: initialSeif })
    }, 250)
    const retry = setTimeout(() => {
      scrollTo([`seif:${initialSeif}`])
      open({ seif: initialSeif })
    }, 800)
    return () => {
      clearTimeout(first)
      clearTimeout(retry)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- once per siman
  }, [bundle])
}
