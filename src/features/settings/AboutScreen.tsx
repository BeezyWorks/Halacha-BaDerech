import { Icon, ListRow, SemanticColor, SettingsCard, Stack, Text } from '@beezyworks/design'
import Constants from 'expo-constants'
import { useRouter } from 'expo-router'
import React, { useEffect, useState } from 'react'
import { Linking } from 'react-native'

import { PageLayout } from '@/components/PageLayout'

interface VersionInfo {
  versionTitle: string
  license: string
}
type Sources = Record<string, Record<string, { title: string; he?: VersionInfo; en?: VersionInfo }>>

const SUPPORT_EMAIL = 'mattaniah@beezyworks.com'
const BASE = process.env.EXPO_PUBLIC_CONTENT_BASE_URL ?? ''

/** Attribution: every Sefaria version the app shows, with its license (public/content/sources.json). */
export function AboutScreen() {
  const router = useRouter()
  const [sources, setSources] = useState<Sources>()
  const version = Constants.expoConfig?.version ?? '—'

  useEffect(() => {
    fetch(`${BASE}/content/sources.json`)
      .then((r) => r.json())
      .then(setSources)
      .catch(() => setSources({}))
  }, [])

  // Collapse per-book entries into one line per distinct version.
  // Works are added here as the ingest (step 2) defines them.
  const works: { id: string; name: string }[] = [
    { id: 'shulchan-aruch', name: 'Shulchan Aruch' },
    { id: 'mishna-berura', name: 'Mishna Berura' },
    { id: 'kitzur', name: 'Kitzur Shulchan Aruch' },
  ]
  const versionsFor = (id: string) => {
    const seen = new Map<string, VersionInfo & { lang: string }>()
    Object.values(sources ?? {}).forEach((book) => {
      const w = book[id]
      ;(['he', 'en'] as const).forEach((lang) => {
        const v = w?.[lang]
        if (v) seen.set(`${lang}|${v.versionTitle}`, { ...v, lang })
      })
    })
    return [...seen.values()]
  }

  return (
    <PageLayout title="About" onBack={() => router.back()}>
      <SettingsCard>
        <Text variant="headline">Halacha BaDerech</Text>
        <Text variant="body">
          Shulchan Aruch with nosei keilim, Mishna Berura and Kitzur, with notes and bookmarks. Free
          and non-commercial.
        </Text>
        <Text variant="detail">
          All texts come from Sefaria (sefaria.org). Each version's license is listed below.
        </Text>
      </SettingsCard>
      <SettingsCard title="Support">
        <Text variant="detail">Version {version}</Text>
        <ListRow
          title="Email feedback"
          leading={<Icon name="mail" size={20} color={SemanticColor.TextSecondary} />}
          showChevron
          isLast
          onPress={() =>
            Linking.openURL(
              `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(`Halacha BaDerech v${version}`)}`,
            )
          }
        />
      </SettingsCard>
      {works.map((w) => {
        const versions = versionsFor(w.id)
        if (!versions.length) return null
        return (
          <SettingsCard key={w.id} title={w.name}>
            {versions.map((v) => (
              <Stack key={`${v.lang}|${v.versionTitle}`} gap="xs">
                <Text variant="body">{v.versionTitle}</Text>
                <Text variant="detail" color={SemanticColor.TextSecondary}>
                  {`${v.lang === 'he' ? 'Hebrew' : 'English'} · ${v.license}`}
                </Text>
              </Stack>
            ))}
          </SettingsCard>
        )
      })}
    </PageLayout>
  )
}
