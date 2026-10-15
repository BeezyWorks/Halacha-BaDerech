import { Stack, Text } from '@beezyworks/design'
import { useRouter } from 'expo-router'
import React from 'react'

import { GlassPanel } from '@/components/GlassPanel'
import { hrefFor } from '@/lib/navigation/hrefs'
import { useNotesStore } from '../../notes/store/notesStore'
import { type SeifLocation, seifLabel } from '../../halacha/types'
import { LocationRow } from './LocationRow'
import { useBookmarksStore } from '../store/bookmarksStore'

const label = seifLabel

/** Bookmarks and notes, newest first, each in a glass panel on Home; tapping one opens it. */
export function SavedList() {
  const router = useRouter()
  const bookmarks = useBookmarksStore((s) => s.bookmarks)
  const removeBookmark = useBookmarksStore((s) => s.removeBookmark)
  const notes = useNotesStore((s) => s.notes)
  const removeNote = useNotesStore((s) => s.removeNote)
  const open = (l: SeifLocation) => router.push(hrefFor(l))

  return (
    <>
      <GlassPanel title="סימניות">
        {bookmarks.length === 0 ? (
          <Empty>Tap a seif, then the bookmark icon.</Empty>
        ) : (
          bookmarks.map((b, i) => (
            <LocationRow
              key={b.id}
              title={label(b.location)}
              onPress={() => open(b.location)}
              onDelete={() => removeBookmark(b.id)}
              deleteLabel="Remove bookmark"
              isLast={i === bookmarks.length - 1}
            />
          ))
        )}
      </GlassPanel>
      <GlassPanel title="הערות">
        {notes.length === 0 ? (
          <Empty>Tap a seif to add a note.</Empty>
        ) : (
          notes.map((n, i) => (
            <LocationRow
              key={n.id}
              title={label(n.location)}
              subtitle={n.text}
              onPress={() => open(n.location)}
              onDelete={() => removeNote(n.id)}
              deleteLabel="Delete note"
              isLast={i === notes.length - 1}
            />
          ))
        )}
      </GlassPanel>
    </>
  )
}

/** The hint in an empty panel — quieter than a full `EmptyState`. */
function Empty({ children }: { children: string }) {
  return (
    <Stack paddingBottom="sm">
      <Text variant="detail">{children}</Text>
    </Stack>
  )
}
