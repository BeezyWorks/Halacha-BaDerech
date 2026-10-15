/**
 * Normalized content format written by `scripts/ingest-sefaria.mjs` to
 * `public/content/<sefer>/<siman>.json` and read by the reader.
 *
 * Offsets (`marks`, `anchors`) are UTF-16 indices into the unit's `text`.
 */

/** Stable camelCase id of a commentary (see data/catalog.json), e.g. `magenAvraham`. */
export type WorkId = string

/** A Rema gloss (`<small>הגה …</small>` in Sefaria's HTML) inside a seif. */
export interface Mark {
  start: number
  end: number
  kind: 'hagah'
}

/**
 * Where a commentator's comment attaches in the base text. `at` is the offset
 * of the inline marker, which sits immediately before the dibur hamaschil
 * words; `end` (when the DH could be located) is the end of those words, so
 * `[at, end)` is the span to highlight. `work`/`sk` identify the Comment in
 * `commentary[work]` (for works whose `unit` is `seif` — Beur HaGra on OC,
 * Biur Halacha — `sk` is the comment's index within its seif, so the key is
 * `(seif, sk)`). In the MB bundle's `base` units, `work: 'mb'` anchors point at
 * `seifim[sk - 1]`.
 */
export interface Anchor {
  at: number
  end?: number
  work: WorkId
  sk: number
}

export interface Unit {
  /** Seif number (1-based). In an MB bundle's `seifim`: the seif katan number. */
  n: number
  /** Plain text: HTML and markers stripped. Kitzur keeps nikud. */
  text: string
  marks?: Mark[]
  anchors?: Anchor[]
  /** MB `seifim` only: the Shulchan Aruch seif this seif katan belongs to. */
  saSeif?: number
  /** MB `seifim` only: its dibur hamaschil (also still the start of `text`). */
  dh?: string
}

export interface Comment {
  /** Shulchan Aruch seif this comment belongs to (1-based). */
  seif: number
  /** Seif katan number within the siman (within the seif for `unit: 'seif'` works). */
  sk: number
  /** Printed label: a Hebrew letter, or for Rabbi Akiva Eiger the locator ("סק\"ב"). */
  label: string
  /** Dibur hamaschil, when the source marks one; it is not repeated in `text`. */
  dh?: string
  text: string
}

export interface SimanBundle {
  sefer: string
  siman: number
  /** Siman heading, e.g. "דין השכמת הבוקר. ובו ט סעיפים:". */
  title?: string
  seifim: Unit[]
  /** Only works that have content in this siman. */
  commentary: Record<WorkId, Comment[]>
  /** MB bundles only: the Orach Chaim seifim, so a seif can be shown above its seifim katanim. */
  base?: Unit[]
}

/** `public/content/<sefer>/index.json`. */
export interface SeferIndex {
  sefer: string
  simanim: { n: number; title?: string; seifim: number }[]
}
