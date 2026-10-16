import { Icon, ListRow, SemanticColor, SettingsCard, Stack, Text } from '@beezyworks/design'
import Constants from 'expo-constants'
import { useRouter } from 'expo-router'
import React, { useEffect, useState } from 'react'
import { Linking } from 'react-native'

import { PageLayout } from '@/components/PageLayout'
import { gematria } from '@/features/halacha/content/parse'
import { catalog, worksById } from '@/features/halacha/data/catalog'
import type { Sources } from '@/features/halacha/data/catalog'

const SUPPORT_EMAIL = 'mattaniah@beezyworks.com'
const BASE = process.env.EXPO_PUBLIC_CONTENT_BASE_URL ?? ''

/** "simanim א–ב, ח, כה" for a version that supplies only some simanim of a sefer. */
const rangesLabel = (ranges: [number, number][]) =>
  `simanim ${ranges
    .map(([a, b]) => (a === b ? gematria(a) : `${gematria(a)}–${gematria(b)}`))
    .join(', ')}`

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

  // One card per group of sefarim; one line per distinct (work, version) in it.
  const groups: { id: string; name: string; seferIds: string[] }[] = [
    { id: 'shulchanAruch', name: 'Shulchan Aruch and nosei keilim', seferIds: [] },
    { id: 'mishnaBerura', name: 'Mishna Berura and Biur Halacha', seferIds: [] },
    { id: 'kitzur', name: 'Kitzur Shulchan Aruch', seferIds: [] },
  ]
  catalog.sefarim.forEach((s) => groups.find((g) => g.id === s.group)?.seferIds.push(s.id))
  const entriesFor = (seferIds: string[]) => {
    const seen = new Map<
      string,
      { name: string; versionTitle: string; license: string; ranges?: string; note?: string }
    >()
    seferIds.forEach((seferId) => {
      const sefer = catalog.sefarim.find((s) => s.id === seferId)
      Object.entries(sources?.[seferId] ?? {}).forEach(([workId, w]) => {
        const name = workId === 'text' ? (sefer?.en ?? seferId) : (worksById[workId]?.en ?? workId)
        w.versions.forEach((v) =>
          seen.set(`${name}|${v.versionTitle}`, {
            name,
            versionTitle: v.versionTitle,
            license: v.license,
            ...(v.ranges ? { ranges: rangesLabel(v.ranges) } : {}),
            ...(v.note ? { note: v.note } : {}),
          }),
        )
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
      {groups.map((g) => {
        const entries = entriesFor(g.seferIds)
        if (!entries.length) return null
        return (
          <SettingsCard key={g.id} title={g.name}>
            {entries.map((e) => (
              <Stack key={`${e.name}|${e.versionTitle}`} gap="xs">
                <Text variant="body">{e.name}</Text>
                <Text variant="detail" color={SemanticColor.TextSecondary}>
                  {`${e.versionTitle} · ${e.license}${e.ranges ? ` · ${e.ranges}` : ''}`}
                </Text>
                {e.note ? (
                  <Text variant="detail" color={SemanticColor.TextSecondary}>
                    {e.note}
                  </Text>
                ) : null}
              </Stack>
            ))}
          </SettingsCard>
        )
      })}
    </PageLayout>
  )
}
