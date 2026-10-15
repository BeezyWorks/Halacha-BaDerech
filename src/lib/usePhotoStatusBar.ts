import { useThemeMode } from '@beezyworks/design'
import { useFocusEffect } from 'expo-router'
import { setStatusBarStyle } from 'expo-status-bar'
import { useCallback } from 'react'

/** Light status-bar glyphs while a screen drawn over the home photo is
 * focused; the app's own style again when it loses focus. Ported from the
 * siddur. */
export function usePhotoStatusBar() {
  const appStyle = useThemeMode() === 'dark' ? 'light' : 'dark'
  useFocusEffect(
    useCallback(() => {
      setStatusBarStyle('light', true)
      return () => setStatusBarStyle(appStyle, true)
    }, [appStyle]),
  )
}
