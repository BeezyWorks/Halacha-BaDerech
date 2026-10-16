import { EmptyState, ListRow, SearchField, Stack, Text } from '@beezyworks/design'
import { useRouter } from 'expo-router'
import React, { useCallback, useMemo, useState } from 'react'

import { ListPage } from '@/components/ListPage'
import { FeaturedTiles } from '@/components/MenuTiles'
import { simanHref } from '@/lib/navigation/hrefs'
import { type CatalogSefer, seferById } from '../data/catalog'
import { useSimanEntries } from '../hooks/useSeferTitles'
import { type SimanEntry, searchSimanim } from '../search/searchSimanim'
import { gematria } from '../content/parse'
import { seferShortName, simanLabel } from '../types'

interface SimanListProps {
  /** The sefarim searched and listed. One sefer lists all its simanim; several (Shulchan Aruch's
   * four chelakim) show a tile per sefer and list only search results. */
  scope: readonly string[]
  title: string
  display?: boolean
  onBack?: () => void
  placeholder: string
  /** Opens a sefer's own list from its tile (Shulchan Aruch). */
  onOpenSefer?: (sefer: string) => void
  /** Wording under the search bar about gaps in the text. */
  coverageNote?: string
}

const keyOf = (e: SimanEntry) => `${e.sefer}/${e.n}`

/** The tab roots' body, as Mikros's Tanach tab: a display title, a search bar and tiles; here
 * the tiles are chelakim and the list is a virtualized run of simanim. */
export function SimanList({
  scope,
  title,
  display,
  onBack,
  placeholder,
  onOpenSefer,
  coverageNote,
}: SimanListProps) {
  const router = useRouter()
  const [query, setQuery] = useState('')
  const searching = query.trim().length > 0
  const single = scope.length === 1
  const sefarim = useMemo(
    () => scope.map((id) => seferById(id)).filter((s): s is CatalogSefer => !!s),
    [scope],
  )
  const entries = useSimanEntries(scope, single || searching)

  const result = useMemo(() => searchSimanim(query, sefarim, entries), [query, sefarim, entries])
  const data = searching ? result.simanim : single ? (entries[scope[0]] ?? []) : []

  const open = useCallback((e: SimanEntry) => router.push(simanHref(e.sefer, e.n)), [router])
  const renderItem = useCallback(
    (e: SimanEntry) => (
      <ListRow
        rtl
        title={single ? simanLabel(e.n) : `${seferShortName(e.sefer)} ${simanLabel(e.n)}`}
        subtitle={e.title ?? (e.covered ? undefined : 'Not available')}
        subtitleAlign="right"
        dimmed={!e.covered}
        onPress={e.covered ? () => open(e) : undefined}
        showChevron={e.covered}
      />
    ),
    [single, open],
  )

  const tiles = (searching ? result.sefarim : sefarim.map((s) => s.id))
    .map((id) => seferById(id))
    .filter((s): s is CatalogSefer => !!s)

  const header = (
    <Stack gap="lg">
      <SearchField
        value={query}
        onChangeText={setQuery}
        placeholder={placeholder}
        accessibilityLabel={placeholder}
      />
      {onOpenSefer && tiles.length > 0 ? (
        <FeaturedTiles
          tiles={tiles.map((s) => ({
            key: s.id,
            label: s.he,
            note: `${gematria(s.simanim)} סימנים`,
            onPress: () => onOpenSefer(s.id),
          }))}
        />
      ) : null}
      {coverageNote && !searching ? <Text variant="detail">{coverageNote}</Text> : null}
    </Stack>
  )

  const empty =
    searching && result.sefarim.length === 0 ? (
      <EmptyState
        icon="search"
        title="Nothing found"
        subtitle="Try a siman number (שכח or 328), a heading, or “oc 328”."
      />
    ) : undefined

  return (
    <ListPage
      title={title}
      display={display}
      onBack={onBack}
      header={header}
      empty={empty}
      data={data}
      keyExtractor={keyOf}
      renderItem={renderItem}
    />
  )
}
