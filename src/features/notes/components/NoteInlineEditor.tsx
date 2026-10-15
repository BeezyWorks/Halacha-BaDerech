import { Button, IconButton, SemanticColor, Stack, Text, TextField } from '@beezyworks/design'
import React, { useMemo, useState } from 'react'

import { type SeifLocation, sameLocation } from '../../halacha/types'
import { useNotesStore } from '../store/notesStore'

/** Notes on one seif: the existing ones plus an add-note field (as in the mishna app). */
export function NoteInlineEditor({ location }: { location: SeifLocation }) {
  const [draft, setDraft] = useState('')
  // Select the stable array and filter locally — a filtered selector loops forever.
  const allNotes = useNotesStore((s) => s.notes)
  const notes = useMemo(
    () => allNotes.filter((n) => sameLocation(n.location, location)),
    [allNotes, location.sefer, location.siman, location.seif],
  )
  const addNote = useNotesStore((s) => s.addNote)
  const removeNote = useNotesStore((s) => s.removeNote)

  const save = () => {
    if (!draft.trim()) return
    addNote(location, draft.trim())
    setDraft('')
  }

  return (
    <Stack gap="sm" background={SemanticColor.SurfaceCard} radius="md" padding="md">
      {notes.map((note) => (
        // Text on its own line so long notes wrap; a flex row would let it overflow the panel.
        <Stack
          key={note.id}
          gap="xs"
          borderBottomWidth="hairline"
          borderColor={SemanticColor.BorderDefault}
        >
          <Text variant="body">{note.text}</Text>
          <Stack direction="row" justify="end">
            <IconButton
              name="delete"
              size={18}
              color={SemanticColor.TextSecondary}
              accessibilityLabel="Delete note"
              onPress={() => removeNote(note.id)}
            />
          </Stack>
        </Stack>
      ))}
      <TextField value={draft} onChangeText={setDraft} placeholder="Add a note…" multiline />
      <Stack direction="row" justify="end">
        <Button
          title="Save note"
          size="sm"
          variant="secondary"
          onPress={save}
          disabled={!draft.trim()}
        />
      </Stack>
    </Stack>
  )
}
