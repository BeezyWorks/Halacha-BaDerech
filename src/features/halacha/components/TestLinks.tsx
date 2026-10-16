import { Button, Stack } from '@beezyworks/design'
import { useRouter } from 'expo-router'
import React from 'react'

import { simanHref } from '@/lib/navigation/hrefs'

/** Temporary entry points to the readers; step 4's chelek → siman lists replace them. */
export function TestLinks({ links }: { links: { title: string; sefer: string; siman: number }[] }) {
  const router = useRouter()
  return (
    <Stack gap="sm" paddingVertical="md" align="start">
      {links.map((l) => (
        <Button
          key={`${l.sefer}/${l.siman}`}
          title={l.title}
          rtl
          variant="outline"
          onPress={() => router.push(simanHref(l.sefer, l.siman))}
        />
      ))}
    </Stack>
  )
}
