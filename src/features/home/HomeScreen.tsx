import {
  Grid,
  PhotoBackground,
  RtlScope,
  ScrollStack,
  Stack,
  TAB_BAR_CONTENT_GAP,
  Text,
  isFloatingTabBar,
  useIsWideWebNav,
  useSideNavWidth,
  useTabBarHeight,
} from '@beezyworks/design'
import { useRouter } from 'expo-router'
import React from 'react'
import { Platform, useWindowDimensions } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { GlassTile } from '@/components/GlassTile'
import { usePhotoStatusBar } from '@/lib/usePhotoStatusBar'
import { SavedList } from '../bookmarks/components/SavedList'
import { useHistoryStore } from '../history/store/historyStore'
import { ContinueButton } from './components/ContinueButton'
import { RecentList } from './components/RecentList'

// Placeholder: the aron kodesh with stained-glass windows (blurred and warmed).
const aronKodesh = require('../../../assets/images/synagogue-ark.jpg')

// The home column's cap on a wide layout, so the tiles stay tiles.
const MAX_WIDTH = 720

/**
 * Home, over a synagogue ark photo like the siddur's luach over the kotel:
 * the app's name in the display serif, a glass pill to continue where the
 * user left off, glass tiles for the three works, then their recent places,
 * bookmarks and notes in glass panels. The photo runs under the status bar
 * and, on wide web, under the (frosted) side rail.
 */
export function HomeScreen() {
  usePhotoStatusBar()
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const { height: windowHeight } = useWindowDimensions()
  const isWideWeb = useIsWideWebNav()
  const sideNavWidth = useSideNavWidth()
  const tabBarHeight = useTabBarHeight()
  const lastLocation = useHistoryStore((s) => s.lastLocation)

  // Room for the bottom pill, which floats over content only on iOS (this
  // screen skips `Screen` to run the photo edge to edge).
  const bottomPad = isFloatingTabBar && tabBarHeight ? tabBarHeight + TAB_BAR_CONTENT_GAP : 0
  // Web needs a concrete height to scroll within (see `Screen`); a docked
  // bottom bar on narrow web takes its own row out of the window.
  const height =
    Platform.OS === 'web' ? windowHeight - (isWideWeb ? 0 : (tabBarHeight ?? 0)) : undefined

  return (
    <PhotoBackground source={aronKodesh} height={height}>
      <Stack direction="row" fill>
        {isWideWeb ? <Stack width={sideNavWidth} /> : null}
        <Stack grow width={0}>
          <ScrollStack showsVerticalScrollIndicator={false}>
            <Stack
              width="100%"
              maxWidth={MAX_WIDTH}
              alignSelf="center"
              paddingTop={insets.top + 32}
              paddingBottom={bottomPad + 24}
              paddingHorizontal="md"
              gap="lg"
            >
              <RtlScope>
                <Stack paddingHorizontal="sm" align="end" gap="xs">
                  <Text variant="bodySerif" onPhoto>
                    Halacha BaDerech
                  </Text>
                  <Text variant="displayMedium" onPhoto>
                    הלכה בדרך
                  </Text>
                </Stack>
              </RtlScope>

              {lastLocation ? <ContinueButton location={lastLocation} /> : null}

              <Grid columns={3} rtl>
                <GlassTile
                  icon="bookshelf"
                  title="שולחן ערוך"
                  detail="ארבעה חלקים"
                  onPress={() => router.push('/shulchan-aruch')}
                />
                <GlassTile
                  icon="book-open"
                  title="משנה ברורה"
                  onPress={() => router.push('/mishna-berura')}
                />
                <GlassTile
                  icon="scroll-text"
                  title="קיצור"
                  detail="שולחן ערוך"
                  onPress={() => router.push('/kitzur')}
                />
              </Grid>

              <RecentList />
              <SavedList />
            </Stack>
          </ScrollStack>
        </Stack>
      </Stack>
    </PhotoBackground>
  )
}
