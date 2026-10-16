import { formatGematriya } from '@beezyworks/design'
import React, { useCallback, useState } from 'react'

import { BookmarkButton } from '../../bookmarks/components/BookmarkButton'
import { useHistoryStore } from '../../history/store/historyStore'
import { useSheet } from '../../sheet/SheetRoot'
import type { SimanBundle } from '../content/types'
import { BiurHalachaPanel } from '../components/BiurHalachaPanel'
import { SeifPanel } from '../components/SeifPanel'

/** What opens in the panel: a seif, optionally scrolled to one of its comments (a `commentKey`). */
export interface SeifTarget {
  seif: number
  focus?: string
  /** MB only: the seif katan that was tapped, pinned at the top of the panel. */
  sk?: number
}

/** Tap-a-seif → open its panel in the root sheet, marking the seif until the panel closes. */
export function useSeifSelection(bundle: SimanBundle | undefined) {
  const sheet = useSheet()
  const setLastLocation = useHistoryStore((s) => s.setLastLocation)
  const [selected, setSelected] = useState<number | null>(null)

  const open = useCallback(
    (target: SeifTarget) => {
      if (!bundle) return
      const location = { sefer: bundle.sefer, siman: bundle.siman, seif: target.seif }
      setSelected(target.seif)
      setLastLocation(location)
      sheet.show({
        title: `סימן ${formatGematriya(bundle.siman)} סעיף ${formatGematriya(target.seif)}`,
        headerRight: <BookmarkButton location={location} />,
        content:
          bundle.sefer === 'mb' ? (
            <BiurHalachaPanel
              key={`${target.seif}/${target.sk}`}
              bundle={bundle}
              seif={target.seif}
              sk={target.sk}
            />
          ) : (
            <SeifPanel
              key={`${target.seif}/${target.focus}`}
              bundle={bundle}
              seif={target.seif}
              focus={target.focus}
            />
          ),
        scroll: false,
        onClosed: () => setSelected(null),
      })
    },
    [bundle, sheet, setLastLocation],
  )

  return { selected, open }
}
