import { GlassSurface, Icon, RtlScope, Stack, Text, Touchable } from '@beezyworks/design'
import { useRouter } from 'expo-router'
import React from 'react'

import { hrefFor } from '@/lib/navigation/hrefs'
import type { LastLocation } from '../../history/store/historyStore'
import { describeLocation } from '../describeLocation'

/**
 * The home hero's one big action, as a glass pill like the siddur luach's
 * next-tefila button: "continue where you left off", shown only once the
 * user has opened a seif.
 */
export function ContinueButton({ location }: { location: LastLocation }) {
  const router = useRouter()
  const title = describeLocation(location)
  const eyebrow = 'המשך ללמוד'

  return (
    <RtlScope>
      <Stack align="center" gap="sm">
        <Text variant="bodySerif" onPhoto align="center">
          {eyebrow}
        </Text>
        <Touchable
          accessibilityRole="button"
          accessibilityLabel={`${eyebrow} · ${title}`}
          onPress={() => router.push(hrefFor(location))}
        >
          <GlassSurface
            radius="full"
            direction="rowReverse"
            align="center"
            gap="lg"
            paddingHorizontal="lg"
            paddingVertical="sm"
          >
            <Text variant="pageHeader" numberOfLines={1}>
              {title}
            </Text>
            <Icon name="chevron-left" size={26} />
          </GlassSurface>
        </Touchable>
      </Stack>
    </RtlScope>
  )
}
