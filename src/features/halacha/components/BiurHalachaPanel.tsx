import { Stack, Text, formatGematriya } from '@beezyworks/design'
import React, { useMemo } from 'react'

import { NoteInlineEditor } from '../../notes/components/NoteInlineEditor'
import { CommentaryPanel } from '../../reader/components/CommentaryPanel'
import { groupComments } from '../../reader/engine/commentary'
import { workColor, WORK_ORDER } from '../colors'
import type { SimanBundle } from '../content/types'
import { worksById } from '../data/catalog'
import { MishnaBeruraSeifKatan } from './MishnaBeruraSeifKatan'

interface BiurHalachaPanelProps {
  bundle: SimanBundle
  /** The Shulchan Aruch seif whose Biur Halacha to show. */
  seif: number
  /** The seif katan that was tapped; pinned on top. Defaults to the seif's own text. */
  sk?: number
}

const ENABLED = new Set(['biurHalacha'])
const nameOf = (work: string) => worksById[work]?.he ?? work

/** The Mishna Berura's panel for one seif: what was tapped pinned on top, the seif's Biur Halacha, notes. */
export function BiurHalachaPanel({ bundle, seif, sk }: BiurHalachaPanelProps) {
  const location = useMemo(
    () => ({ sefer: bundle.sefer, siman: bundle.siman, seif }),
    [bundle.sefer, bundle.siman, seif],
  )
  const groups = useMemo(
    () => groupComments(bundle.commentary, seif, WORK_ORDER, ENABLED, workColor),
    [bundle.commentary, seif],
  )
  const pinned = useMemo(() => {
    const seifim = bundle.seifim.filter((u) => u.saSeif === seif)
    return sk ? seifim.filter((u) => u.n === sk) : seifim
  }, [bundle.seifim, seif, sk])

  return (
    <CommentaryPanel
      groups={groups}
      nameOf={nameOf}
      emptyText="אין ביאור הלכה על סעיף זה"
      renderTop={() => (
        <Stack paddingHorizontal="md" paddingVertical="sm" gap="sm">
          {pinned.map((u) => (
            <MishnaBeruraSeifKatan key={u.n} unit={u} label={formatGematriya(u.n)} />
          ))}
        </Stack>
      )}
    >
      <Stack gap="xs">
        <Text variant="sectionHeader">My notes</Text>
        <NoteInlineEditor location={location} />
      </Stack>
    </CommentaryPanel>
  )
}
