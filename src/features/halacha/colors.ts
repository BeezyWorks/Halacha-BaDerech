import { SemanticColor, categoryColor } from '@beezyworks/design'

import type { WorkColor, WorkStyle } from '../reader/engine/types'
import { catalog } from './data/catalog'

const ORDER = catalog.works.map((w) => w.id)

/** Mishna Berura's own dibur hamaschil spans in the Shulchan Aruch text: the brand accent. */
export const MB_COLOR: WorkColor = {
  text: SemanticColor.AccentPrimary,
  tint: SemanticColor.AccentTint,
}

/** A work's color is fixed by its position in the catalog, so it never changes with settings. */
export const workColor = (work: string): WorkColor => {
  const i = ORDER.indexOf(work)
  return i < 0 ? MB_COLOR : categoryColor(i)
}

export const workStyle = (work: string): WorkStyle => ({
  color: workColor(work),
  order: Math.max(ORDER.indexOf(work), 0),
})

/** Catalog position of each work, for ordering groups. */
export const WORK_ORDER: readonly string[] = ORDER
