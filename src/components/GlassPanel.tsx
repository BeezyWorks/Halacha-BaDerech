import { GlassSurface, RtlScope, Stack, Text } from '@beezyworks/design'
import React from 'react'

interface GlassPanelProps {
  title: string
  children: React.ReactNode
}

/** A titled section over the home photo: a header-face title over its rows,
 * in glass that follows the app's mode. */
export function GlassPanel({ title, children }: GlassPanelProps) {
  return (
    <RtlScope>
      <GlassSurface paddingTop="md" paddingBottom="xs" paddingHorizontal="md" gap="xs">
        <Text variant="sectionHeader">{title}</Text>
        <Stack>{children}</Stack>
      </GlassSurface>
    </RtlScope>
  )
}
