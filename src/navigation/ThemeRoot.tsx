import { DesignSystemProvider, HeaderTypeface } from '@beezyworks/design'
import React from 'react'
import { useColorScheme } from 'react-native'

import { usePreferencesStore } from '@/features/settings/store/preferencesStore'
import { brand } from '@/lib/brand'

/** Resolves the color-scheme preference and hands it, with the reading-text choice and
 * the app's header face (Cardo), to the DL. */
export function ThemeRoot({ children }: { children: React.ReactNode }) {
  const preference = usePreferencesStore((s) => s.colorScheme)
  const content = usePreferencesStore((s) => s.content)
  const system = useColorScheme()
  const mode = preference === 'system' ? (system === 'dark' ? 'dark' : 'light') : preference
  return (
    <DesignSystemProvider
      mode={mode}
      brand={brand}
      content={content}
      headerTypeface={HeaderTypeface.Cardo}
    >
      {children}
    </DesignSystemProvider>
  )
}
