/**
 * Assembling a siman bundle from Sefaria segments (pure; the I/O lives in
 * scripts/ingest-sefaria.mjs). Runs under Node (type stripping) and Jest.
 */
import { matchDh } from './dh.ts'
import {
  extractTitle,
  flattenSegments,
  gematria,
  htmlToUnit,
  parseGematria,
  plainText,
  splitComment,
  splitMb,
} from './parse.ts'
import type { DhFormat, RawMarker } from './parse.ts'
import type { Anchor, Comment, SimanBundle, Unit, WorkId } from './types.ts'

/** How a commentary's Sefaria text is indexed (catalog `parts.<sefer>.unit`). */
export type WorkUnit =
  /** `[sk]` (or `[sk][paragraph]`): numbered by seif katan; the seif comes from the base text's markers. */
  | 'sk'
  /** `[seif][comment]`: the first index is the Shulchan Aruch seif. */
  | 'seif'
  /** `[n]`: numbered by comment; the seif comes from Sefaria's links (Rabbi Akiva Eiger, Taz on CM). */
  | 'link'

export interface BuildWork {
  id: WorkId
  unit: WorkUnit
  dh: DhFormat
  /** The siman's Sefaria text for this work, or null if it has none here. */
  text: unknown
}

export interface Stats {
  /** Inline markers seen in the base text, by outcome. */
  markers: number
  markersMapped: number
  /** Markers for works not in this sefer's list (ignored works). */
  markersIgnored: number
  /** Markers whose seif katan has no comment (or a repeated marker for the same one). */
  markersOrphan: number
  /** Commentator names that are neither mapped nor on the ignore list. */
  unmappedNames: string[]
  comments: number
  /** Comments whose seif was inferred (neither marker nor link). */
  commentsSeifInferred: number
  /** Marker seif disagreed with the links' seif (marker wins). */
  seifConflicts: number
  /** A few `work#sk marker→link` examples of those conflicts. */
  conflictExamples: string[]
  anchors: number
  anchorsWithEnd: number
  anchorsWithDh: number
  /** Anchors that came from a DH search rather than a marker. */
  anchorsSearched: number
  /** Marker anchors whose comment has no DH to match. */
  perWork: Record<
    string,
    { markers: number; anchors: number; withEnd: number; withDh: number; searched: number }
  >
}

const newStats = (): Stats => ({
  markers: 0,
  markersMapped: 0,
  markersIgnored: 0,
  markersOrphan: 0,
  unmappedNames: [],
  comments: 0,
  commentsSeifInferred: 0,
  seifConflicts: 0,
  conflictExamples: [],
  anchors: 0,
  anchorsWithEnd: 0,
  anchorsWithDh: 0,
  anchorsSearched: 0,
  perWork: {},
})

const perWork = (s: Stats, id: string) =>
  (s.perWork[id] ??= { markers: 0, anchors: 0, withEnd: 0, withDh: 0, searched: 0 })

const unitOf = (text: string, parsed: ReturnType<typeof htmlToUnit>, n: number): Unit => ({
  n,
  text,
  ...(parsed.marks.length ? { marks: parsed.marks } : {}),
})

interface ParsedBase {
  units: Unit[]
  markers: (RawMarker & { seif: number })[]
  title?: string
  otherSmall: string[]
}

/** Parses a Shulchan Aruch siman's seifim (HTML) into units + the inline markers with their seif. */
export function parseBase(baseHtml: string[]): ParsedBase {
  const units: Unit[] = []
  const markers: (RawMarker & { seif: number })[] = []
  const otherSmall: string[] = []
  let title: string | undefined
  baseHtml.forEach((raw, i) => {
    let html = raw
    if (i === 0) {
      const t = extractTitle(html)
      title = t.title
      html = t.rest
    }
    const parsed = htmlToUnit(html)
    units.push(unitOf(parsed.text, parsed, i + 1))
    for (const m of parsed.markers) markers.push({ ...m, seif: i + 1 })
    otherSmall.push(...parsed.otherSmall)
  })
  return { units, markers, ...(title ? { title } : {}), otherSmall }
}

const markerSk = (m: RawMarker): number => {
  if (m.order !== undefined) return m.order
  return m.label ? parseGematria(m.label) : NaN
}

interface FirstMarker {
  at: number
  seif: number
  label?: string
}

export interface BuildInput {
  sefer: string
  siman: number
  /** The base text's seifim, as Sefaria HTML. */
  baseHtml: string[]
  /** Commentaries on this siman, in catalog order. */
  works: BuildWork[]
  /** Marker commentator name → work id. */
  aliases: Record<string, WorkId>
  /** Marker names to ignore silently (works we deliberately skip). */
  ignoredMarkers: string[]
  /** Per work: comment index (sk) → seif, from Sefaria's links. */
  linkSeif?: Record<WorkId, Record<number, number>>
}

export interface BuildResult {
  bundle: SimanBundle
  stats: Stats
  /** Works with comments whose seif could not be placed without links (to decide whether to fetch them). */
  needsLinks: boolean
  otherSmall: string[]
}

interface RawComment {
  seif?: number
  sk: number
  html: string
}

function rawComments(work: BuildWork): RawComment[] {
  const text = Array.isArray(work.text) ? work.text : []
  if (work.unit === 'seif') {
    return text.flatMap((x, i) => {
      const items = Array.isArray(x) ? x : [x]
      return items.flatMap((item, j) =>
        flattenSegments(item).length
          ? [{ seif: i + 1, sk: j + 1, html: flattenSegments(item).join('\n') }]
          : [],
      )
    })
  }
  return text.flatMap((x, i) => {
    const parts = flattenSegments(x)
    return parts.length ? [{ sk: i + 1, html: parts.join('\n') }] : []
  })
}

/** A Shulchan Aruch chelek bundle: seifim + nosei keilim anchored via markers (or DH search). */
export function buildSaBundle(input: BuildInput): BuildResult {
  const stats = newStats()
  const base = parseBase(input.baseHtml)
  const units = base.units
  const ignored = new Set(input.ignoredMarkers)
  const unmapped = new Set<string>()
  const workIds = new Set(input.works.map((w) => w.id))

  // First marker per (work, sk).
  const first: Record<WorkId, Map<number, FirstMarker>> = {}
  for (const m of base.markers) {
    stats.markers++
    if (m.commentator === 'Mishnah Berurah') {
      stats.markersIgnored++
      continue
    }
    const id = input.aliases[m.commentator]
    if (!id) {
      if (ignored.has(m.commentator)) stats.markersIgnored++
      else {
        unmapped.add(m.commentator)
        stats.markersIgnored++
      }
      continue
    }
    if (!workIds.has(id)) {
      stats.markersIgnored++
      continue
    }
    const sk = markerSk(m)
    perWork(stats, id).markers++
    if (!Number.isFinite(sk)) {
      stats.markersOrphan++
      continue
    }
    const map = (first[id] ??= new Map())
    if (map.has(sk)) {
      stats.markersOrphan++
      continue
    }
    map.set(sk, { at: m.at, seif: m.seif, ...(m.label ? { label: m.label } : {}) })
  }

  const commentary: Record<WorkId, Comment[]> = {}
  const anchorsBySeif = new Map<number, Anchor[]>()
  let needsLinks = false
  const addAnchor = (seif: number, a: Anchor) => {
    const list = anchorsBySeif.get(seif) ?? []
    list.push(a)
    anchorsBySeif.set(seif, list)
  }

  for (const work of input.works) {
    const raws = rawComments(work)
    if (!raws.length) continue
    const markers = first[work.id] ?? new Map<number, FirstMarker>()
    const links = input.linkSeif?.[work.id] ?? {}
    const comments: Comment[] = []
    let lastSeif = 1
    const lastSearch = new Map<number, number>()
    const usedMarkers = new Set<number>()

    for (const raw of raws) {
      const split = splitComment(raw.html, work.dh)
      let { dh, text } = split
      const { locator } = split
      if (!text) continue
      const marker = work.unit === 'sk' ? markers.get(raw.sk) : undefined
      let seif = raw.seif
      if (seif === undefined) {
        const viaLink = links[raw.sk]
        if (marker && viaLink && marker.seif !== viaLink) {
          stats.seifConflicts++
          if (stats.conflictExamples.length < 3)
            stats.conflictExamples.push(
              `${work.id}#${raw.sk} marker ${marker.seif} link ${viaLink}`,
            )
        }
        seif = marker?.seif ?? viaLink
        if (seif === undefined) {
          needsLinks = true
          seif = lastSeif
          stats.commentsSeifInferred++
        }
      }
      seif = Math.max(1, Math.min(seif, units.length || 1))
      lastSeif = seif
      const label = marker?.label ?? locator ?? gematria(raw.sk)
      comments.push({ seif, sk: raw.sk, label, ...(dh ? { dh } : {}), text })
      stats.comments++

      const unit = units[seif - 1]
      if (!unit) continue
      let confirmed: ReturnType<typeof matchDh>
      if (!dh && split.candidate && marker) {
        // "DH. body" without bold: only believe the split if the DH is really where the marker is.
        confirmed = matchDh(unit.text, split.candidate.dh, { mode: 'anchored', at: marker.at })
        if (confirmed) {
          dh = split.candidate.dh
          text = split.candidate.text
          const last = comments[comments.length - 1]
          last.dh = dh
          last.text = text
        }
      }
      if (marker && marker.seif === seif) {
        usedMarkers.add(raw.sk)
        stats.markersMapped++
        const m =
          confirmed ??
          (dh ? matchDh(unit.text, dh, { mode: 'anchored', at: marker.at }) : undefined)
        const w = perWork(stats, work.id)
        w.anchors++
        stats.anchors++
        if (dh) {
          w.withDh++
          stats.anchorsWithDh++
        }
        if (m) {
          w.withEnd++
          stats.anchorsWithEnd++
        }
        addAnchor(seif, { at: marker.at, ...(m ? { end: m.end } : {}), work: work.id, sk: raw.sk })
      } else if (dh) {
        const from = lastSearch.get(seif) ?? 0
        const m = matchDh(unit.text, dh, { mode: 'search', from })
        if (m) {
          lastSearch.set(seif, m.start)
          const w = perWork(stats, work.id)
          w.anchors++
          w.withEnd++
          w.withDh++
          w.searched++
          stats.anchors++
          stats.anchorsWithEnd++
          stats.anchorsWithDh++
          stats.anchorsSearched++
          addAnchor(seif, { at: m.start, end: m.end, work: work.id, sk: raw.sk })
        }
      }
    }
    // Markers for seifim katanim that have no comment text.
    for (const sk of markers.keys())
      if (!usedMarkers.has(sk) && work.unit === 'sk') stats.markersOrphan++

    comments.sort((a, b) => a.seif - b.seif || a.sk - b.sk)
    if (comments.length) commentary[work.id] = comments
  }

  for (const [seif, anchors] of anchorsBySeif) {
    anchors.sort((a, b) => a.at - b.at || a.sk - b.sk)
    units[seif - 1].anchors = anchors
  }
  stats.unmappedNames = [...unmapped]
  return {
    bundle: {
      sefer: input.sefer,
      siman: input.siman,
      ...(base.title ? { title: base.title } : {}),
      seifim: units,
      commentary,
    },
    stats,
    needsLinks,
    otherSmall: base.otherSmall,
  }
}

export interface BuildMbInput {
  siman: number
  /** Orach Chaim seifim of this siman (Sefaria HTML). */
  baseHtml: string[]
  /** Mishna Berura seifim katanim (Sefaria text, `(א) DH - body`). */
  mbText: string[]
  /** Biur Halacha: `[seif][comment]`, or null. */
  bhText: unknown
}

/** The Mishna Berura bundle: its seifim katanim grouped by Orach Chaim seif, plus Biur Halacha. */
export function buildMbBundle(input: BuildMbInput): BuildResult {
  const stats = newStats()
  const base = parseBase(input.baseHtml)
  const units = base.units
  const mb = input.mbText.map((h) => (typeof h === 'string' ? splitMb(h) : { text: '' }))

  // MB marker → sk: by its printed letter, validated against the MB text's own "(א)".
  const first = new Map<number, FirstMarker>()
  let seq = 0
  for (const m of base.markers) {
    if (m.commentator !== 'Mishnah Berurah') continue
    seq++
    stats.markers++
    perWork(stats, 'mb').markers++
    let sk = m.label ? parseGematria(m.label) : NaN
    if (!Number.isFinite(sk) || (m.label && mb[sk - 1]?.label !== m.label)) sk = seq
    if (first.has(sk) || !mb[sk - 1]) {
      stats.markersOrphan++
      continue
    }
    first.set(sk, { at: m.at, seif: m.seif })
  }

  const seifim: Unit[] = []
  const anchorsBySeif = new Map<number, Anchor[]>()
  let lastSeif = 1
  mb.forEach((c, i) => {
    const sk = i + 1
    if (!c.text) return
    const marker = first.get(sk)
    let saSeif = marker?.seif
    if (saSeif === undefined) {
      saSeif = lastSeif
      stats.commentsSeifInferred++
    }
    saSeif = Math.max(1, Math.min(saSeif, units.length || 1))
    lastSeif = saSeif
    stats.comments++
    seifim.push({ n: sk, text: c.text, saSeif, ...(c.dh ? { dh: c.dh } : {}) })
    if (marker) {
      const unit = units[marker.seif - 1]
      const m =
        c.dh && unit ? matchDh(unit.text, c.dh, { mode: 'anchored', at: marker.at }) : undefined
      const w = perWork(stats, 'mb')
      stats.markersMapped++
      w.anchors++
      stats.anchors++
      if (c.dh) {
        w.withDh++
        stats.anchorsWithDh++
      }
      if (m) {
        w.withEnd++
        stats.anchorsWithEnd++
      }
      const list = anchorsBySeif.get(marker.seif) ?? []
      list.push({ at: marker.at, ...(m ? { end: m.end } : {}), work: 'mb', sk })
      anchorsBySeif.set(marker.seif, list)
    }
  })

  // Biur Halacha: [seif][comment]; anchor by searching its DH in the seif.
  const bh: Comment[] = []
  const bhRaw = Array.isArray(input.bhText) ? input.bhText : []
  bhRaw.forEach((x, i) => {
    const items = Array.isArray(x) ? x : [x]
    const lastStart = new Map<number, number>()
    items.forEach((item, j) => {
      const html = flattenSegments(item).join('\n')
      if (!html) return
      const { dh, text } = splitComment(html, 'bold')
      if (!text) return
      const seif = Math.max(1, Math.min(i + 1, units.length || 1))
      bh.push({ seif, sk: j + 1, label: gematria(j + 1), ...(dh ? { dh } : {}), text })
      stats.comments++
      const unit = units[seif - 1]
      if (dh && unit) {
        const m = matchDh(unit.text, dh, { mode: 'search', from: lastStart.get(seif) ?? 0 })
        if (m) {
          lastStart.set(seif, m.start)
          const w = perWork(stats, 'biurHalacha')
          w.anchors++
          w.withEnd++
          w.withDh++
          w.searched++
          stats.anchors++
          stats.anchorsWithEnd++
          stats.anchorsWithDh++
          stats.anchorsSearched++
          const list = anchorsBySeif.get(seif) ?? []
          list.push({ at: m.start, end: m.end, work: 'biurHalacha', sk: j + 1 })
          anchorsBySeif.set(seif, list)
        }
      }
    })
  })

  for (const [seif, anchors] of anchorsBySeif) {
    anchors.sort((a, b) => a.at - b.at || a.sk - b.sk)
    units[seif - 1].anchors = anchors
  }
  return {
    bundle: {
      sefer: 'mb',
      siman: input.siman,
      ...(base.title ? { title: base.title } : {}),
      seifim,
      commentary: bh.length ? { biurHalacha: bh } : {},
      base: units,
    },
    stats,
    needsLinks: false,
    otherSmall: base.otherSmall,
  }
}

/** A Kitzur siman: seifim only, nikud kept. */
export function buildKitzurBundle(siman: number, html: string[], title?: string): SimanBundle {
  const seifim: Unit[] = []
  html.forEach((h, i) => {
    const text = plainText(typeof h === 'string' ? h : '')
    if (text) seifim.push({ n: i + 1, text })
  })
  return { sefer: 'kitzur', siman, ...(title ? { title } : {}), seifim, commentary: {} }
}
