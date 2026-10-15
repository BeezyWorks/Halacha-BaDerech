import { MenuItemRow } from '@beezyworks/design'
import { useRouter } from 'expo-router'
import React, { useMemo } from 'react'

import { GlassPanel } from '@/components/GlassPanel'
import { hrefFor } from '@/lib/navigation/hrefs'
import { useHistoryStore } from '../../history/store/historyStore'
import { describeLocation } from '../describeLocation'

/**
 * The last five places the user opened, most recent first, in a glass panel
 * over the home photo. Hidden until they've opened one. Users who read before
 * this history existed fall back to their last location.
 */
export function RecentList() {
  const router = useRouter()
  const recentLocations = useHistoryStore((s) => s.recentLocations)
  const lastLocation = useHistoryStore((s) => s.lastLocation)

  const recent = useMemo(
    () => (recentLocations.length > 0 ? recentLocations : lastLocation ? [lastLocation] : []),
    [recentLocations, lastLocation],
  )

  if (recent.length === 0) return null

  return (
    <GlassPanel title="אחרונים">
      {recent.map((location, index) => {
        const label = describeLocation(location)
        return (
          <MenuItemRow
            key={label}
            label={label}
            onPress={() => router.push(hrefFor(location))}
            isLast={index === recent.length - 1}
          />
        )
      })}
    </GlassPanel>
  )
}
