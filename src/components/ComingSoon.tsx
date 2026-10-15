import { Stack, Text } from '@beezyworks/design'
import React from 'react'

import { PageLayout } from './PageLayout'

/** A tab's placeholder until its content screens are built. */
export function ComingSoon({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <PageLayout title={title} display>
      <Stack paddingHorizontal="sm" gap="xs">
        <Text variant="body">{subtitle}</Text>
        <Text variant="detail">Coming soon.</Text>
      </Stack>
    </PageLayout>
  )
}
