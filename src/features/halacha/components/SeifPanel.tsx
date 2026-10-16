import { Stack, Text } from '@beezyworks/design'
import React, { useCallback, useMemo } from 'react'

import { NoteInlineEditor } from '../../notes/components/NoteInlineEditor'
import { CommentaryPanel, type PanelWork } from '../../reader/components/CommentaryPanel'
import { UnitText } from '../../reader/components/UnitText'
import { groupComments, worksWithComments } from '../../reader/engine/commentary'
import { useCommentaryStore } from '../../settings/store/commentaryStore'
import { workColor, WORK_ORDER } from '../colors'
import type { SimanBundle } from '../content/types'
import { worksById } from '../data/catalog'
import { useWorkSettings } from '../hooks/useWorkSettings'
import { seifRuns } from '../runs'

interface SeifPanelProps {
  bundle: SimanBundle
  seif: number
  /** A `commentKey` to scroll to and flash. */
  focus?: string
}

const nameOf = (work: string) => worksById[work]?.he ?? work

/**
 * A seif of the Shulchan Aruch or Kitzur in the sheet / side panel: the seif
 * pinned on top (its highlighted spans scroll to their comments), then each
 * enabled work's comments in catalog order, then notes. The bookmark toggle
 * lives in the sheet header.
 */
export function SeifPanel({ bundle, seif, focus }: SeifPanelProps) {
  const { sefer, siman } = bundle
  const unit = bundle.seifim.find((u) => u.n === seif)
  const { enabled, comments, remaInRashi } = useWorkSettings(bundle)
  const toggleWork = useCommentaryStore((s) => s.toggleWork)
  const location = useMemo(() => ({ sefer, siman, seif }), [sefer, siman, seif])

  const runs = useMemo(
    () => (unit ? seifRuns(unit, enabled, comments) : []),
    [unit, enabled, comments],
  )
  const groups = useMemo(
    () => groupComments(bundle.commentary, seif, WORK_ORDER, enabled, workColor),
    [bundle.commentary, seif, enabled],
  )
  const works = useMemo<PanelWork[]>(
    () =>
      worksWithComments(bundle.commentary, seif, WORK_ORDER).map((id) => ({
        id,
        name: nameOf(id),
        color: workColor(id),
        enabled: enabled.has(id),
      })),
    [bundle.commentary, seif, enabled],
  )
  const onToggle = useCallback((work: string) => toggleWork(sefer, work), [toggleWork, sefer])

  return (
    <CommentaryPanel
      initialFocus={focus}
      groups={groups}
      nameOf={nameOf}
      works={works}
      onToggleWork={onToggle}
      emptyText={
        works.length === 0
          ? sefer === 'kitzur'
            ? undefined
            : 'אין מפרשים על סעיף זה'
          : 'לא נבחרו מפרשים לסעיף זה — אפשר לבחור למעלה'
      }
      renderTop={(focusComment) => (
        <Stack paddingHorizontal="md" paddingVertical="sm">
          <UnitText
            runs={runs}
            hagahInRashi={remaInRashi}
            onPressSpan={(span) => focusComment(span.key)}
          />
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
