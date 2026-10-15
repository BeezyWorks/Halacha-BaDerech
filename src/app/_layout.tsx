import { DesignFonts, SemanticColor, useColorResolver, useThemeMode } from '@beezyworks/design'
import { useFonts } from 'expo-font'
import { DefaultTheme, Stack, ThemeProvider } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import React, { useEffect } from 'react'
import { Platform } from 'react-native'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { SafeAreaProvider, initialWindowMetrics } from 'react-native-safe-area-context'

import { SheetRoot } from '@/features/sheet/SheetRoot'
import { ThemeRoot } from '@/navigation/ThemeRoot'

function RootNavigator() {
  const resolve = useColorResolver()
  const dark = useThemeMode() === 'dark'
  return (
    <ThemeProvider
      value={{
        dark,
        colors: {
          background: resolve(SemanticColor.SurfaceBackground),
          border: resolve(SemanticColor.BorderDefault),
          primary: resolve(SemanticColor.AccentPrimary),
          text: resolve(SemanticColor.TextPrimary),
          card: resolve(SemanticColor.SurfaceCard),
          notification: resolve(SemanticColor.AccentPrimary),
        },
        fonts: DefaultTheme.fonts,
      }}
    >
      <StatusBar style={dark ? 'light' : 'dark'} />
      <SheetRoot>
        <Stack screenOptions={{ headerShown: false }} />
      </SheetRoot>
    </ThemeProvider>
  )
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts(DesignFonts)

  useEffect(() => {
    if (Platform.OS !== 'web') return
    document.title = 'Halacha BaDerech'
    // Same fix as the siddur: keep wheel scrolling inside screens' own ScrollViews.
    document.documentElement.style.overflow = 'hidden'
    document.documentElement.style.height = '100%'
  }, [])

  if (!fontsLoaded) return null

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider initialMetrics={initialWindowMetrics}>
        <ThemeRoot>
          <RootNavigator />
        </ThemeRoot>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  )
}
