import { formatGematriya } from '@beezyworks/design'

import { buildRuns, commentKey, visibleAnchors } from '../reader/engine/segments'
import type { Run } from '../reader/engine/types'
import { MB_COLOR, workStyle } from './colors'
import type { Comment, Unit } from './content/types'

/** The runs of a Shulchan Aruch / Kitzur seif: hagah set apart, enabled nosei keilim highlighted. */
export function seifRuns(
  unit: Unit,
  enabled: ReadonlySet<string>,
  comments: ReadonlyMap<string, Comment>,
): Run[] {
  const spans = unit.anchors?.length
    ? visibleAnchors(
        unit,
        (work) => (enabled.has(work) ? workStyle(work) : undefined),
        (a) => comments.get(commentKey(a.work, unit.n, a.sk))?.label,
      )
    : []
  return buildRuns(unit.text, unit.marks, spans)
}

/** The runs of an Orach Chaim seif inside the Mishna Berura: the DHs the MB comments on, in the MB color. */
export function mbBaseRuns(unit: Unit, seifimKatanim: readonly Unit[]): Run[] {
  const known = new Set(seifimKatanim.map((s) => s.n))
  const spans = visibleAnchors(
    unit,
    (work) => (work === 'mb' ? { color: MB_COLOR, order: 0 } : undefined),
    (a) => (known.has(a.sk) ? formatGematriya(a.sk) : undefined),
  )
  return buildRuns(unit.text, unit.marks, spans)
}
