import { IconButton, SemanticColor } from '@beezyworks/design'
import React from 'react'

import type { SeifLocation } from '../../halacha/types'
import { useBookmarksStore, useIsBookmarked } from '../store/bookmarksStore'

/** Bookmark toggle for one seif; subscribes itself, so it stays right in a sheet header. */
export function BookmarkButton({ location }: { location: SeifLocation }) {
  const isBookmarked = useIsBookmarked(location)
  const toggleBookmark = useBookmarksStore((s) => s.toggleBookmark)
  return (
    <IconButton
      name={isBookmarked ? 'bookmark' : 'bookmark-outline'}
      color={isBookmarked ? SemanticColor.AccentPrimary : SemanticColor.TextSecondary}
      accessibilityLabel={isBookmarked ? 'Remove bookmark' : 'Bookmark this seif'}
      onPress={() => toggleBookmark(location)}
    />
  )
}
