import { Stack, Text } from '@beezyworks/design'
import { useRouter } from 'expo-router'
import React from 'react'

import { PageLayout } from '@/components/PageLayout'

/** Public at /settings/privacy (the App Store privacy policy URL). */
export function PrivacyScreen() {
  const router = useRouter()

  return (
    <PageLayout title="Privacy policy" onBack={() => router.back()}>
      <Text variant="body">
        Halacha BaDerech does not collect, store or share any personal information. There are no
        accounts, no analytics, no advertising and no third-party trackers.
      </Text>
      <Stack gap="xs">
        <Text variant="bodyStrong">On your device</Text>
        <Text variant="body">
          Your notes, bookmarks, reading history and settings are saved only on your device (in the
          app's local storage, or your browser's local storage on the web). They are never sent to
          us or anyone else. Deleting the app or clearing your browser data removes them.
        </Text>
      </Stack>
      <Stack gap="xs">
        <Text variant="bodyStrong">Network use</Text>
        <Text variant="body">
          The app downloads the texts you read (Shulchan Aruch, Mishna Berura and Kitzur) from this
          app's own web host. Like any web server, it may keep standard technical request logs (such
          as IP address and time of request) for reliability and security. We do not use these logs
          to identify or track you, and no personal information is sent in the requests.
        </Text>
      </Stack>
      <Stack gap="xs">
        <Text variant="bodyStrong">Changes</Text>
        <Text variant="body">
          If this policy ever changes, the updated version will be posted on this page.
        </Text>
      </Stack>
    </PageLayout>
  )
}
