import type { SemanticColor } from '@beezyworks/design'

/**
 * The reader engine's input model. It is deliberately structural: a halacha
 * `Unit`/`Comment`, a Mikros pasuk or a Rambam halacha all fit these shapes,
 * so the same engine can serve other apps. Offsets are UTF-16 indices into
 * the unit's text.
 */
export interface ReaderMark {
  start: number
  end: number
  kind: string
}

/** Where a comment attaches in the unit's text; `[at, end)` is the span to highlight. */
export interface ReaderAnchor {
  at: number
  end?: number
  /** Which commentary the comment is from. */
  work: string
  /** The comment's number within `work` (see `commentKey`). */
  sk: number
}

export interface ReaderUnit {
  /** The unit's number (1-based); comments point back at it as `seif`. */
  n: number
  text: string
  marks?: ReaderMark[]
  anchors?: ReaderAnchor[]
}

export interface ReaderComment {
  /** The unit this comment belongs to. */
  seif: number
  sk: number
  label: string
  dh?: string
  text: string
}

/** The two semantic colors that identify one commentary: its text/underline color and its wash. */
export interface WorkColor {
  text: SemanticColor
  tint: SemanticColor
}

/** How the engine presents one commentary. `order` breaks ties between overlapping spans. */
export interface WorkStyle {
  color: WorkColor
  order: number
}

/** An anchor that will be drawn: resolved to a concrete span, label and color. */
export interface SpanAnchor {
  /** `commentKey(work, unit, sk)` — identifies the comment it opens. */
  key: string
  work: string
  sk: number
  start: number
  end: number
  label: string
  color: WorkColor
  order: number
}

/** One contiguous piece of a unit's text with uniform styling. */
export interface Run {
  text: string
  /** Inside a `hagah` mark (the Rema). */
  hagah: boolean
  /** The span this text is highlighted for (the narrowest one covering it). */
  span?: SpanAnchor
  /** Labels to draw right after this text (spans ending here). */
  labels: SpanAnchor[]
}

/** The comments of one work, for the panel. */
export interface CommentGroup<C extends ReaderComment = ReaderComment> {
  work: string
  color: WorkColor
  comments: C[]
}
