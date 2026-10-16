import type { DhFormat } from '../content/parse'
import type { WorkId } from '../content/types'
import raw from './catalog.json'

/** How a commentary's Sefaria text is indexed; see `WorkUnit` in content/bundle.ts. */
export type CatalogUnit = 'sk' | 'seif' | 'link'

/** One work's Sefaria text for one sefer (a work is often a separate Sefaria title per chelek). */
export interface CatalogPart {
  title: string
  /** Hebrew version(s) used, in order (Tumim is split over two volume versions). */
  versions: string[]
  unit: CatalogUnit
}

export interface CatalogWork {
  /** Stable camelCase id; settings store enabled ids per sefer. */
  id: WorkId
  he: string
  en: string
  /** Short Hebrew abbreviation, e.g. מ"א. */
  abbr: string
  dh: DhFormat
  /** Names this work goes by in the base text's inline markers. */
  markerNames: string[]
  /** Keyed by sefer id (`oc`, `yd`, `eh`, `cm`, `mb`). */
  parts: Record<string, CatalogPart>
}

/** One Sefaria version of a sefer's base text, optionally for only some simanim. */
export interface CatalogVersion {
  version: string
  /** Inclusive [first, last] simanim this version supplies; absent = all (a fallback). */
  ranges?: [number, number][]
  /** The license to record when Sefaria's metadata for this version is wrong/"unknown". */
  licenseOverride?: string
  note?: string
}

export interface CatalogSefer {
  id: string
  he: string
  en: string
  group: 'shulchanAruch' | 'mishnaBerura' | 'kitzur'
  sefaria: string
  /** The primary version. */
  baseVersion: string
  /** Per-siman-range versions (primary + overrides); see scripts/ingest-sefaria.mjs. */
  versions?: CatalogVersion[]
  /** Number of simanim in the sefer (some may be missing: see `coverage`). */
  simanim: number
  /** Inclusive [first, last] ranges of simanim that have content, when not all of them. */
  coverage?: [number, number][]
  /** Work ids, in the order they are shown by default. */
  noseiKeilim: WorkId[]
}

export interface Catalog {
  sefarim: CatalogSefer[]
  works: CatalogWork[]
  ignoredMarkers: string[]
  notes: Record<string, string>
}

export const catalog = raw as unknown as Catalog

export const worksById: Record<WorkId, CatalogWork> = Object.fromEntries(
  catalog.works.map((w) => [w.id, w]),
)

export const seferById = (id: string): CatalogSefer | undefined =>
  catalog.sefarim.find((s) => s.id === id)

/** The nosei keilim of a sefer as catalog works. */
export const noseiKeilimOf = (seferId: string): CatalogWork[] =>
  (seferById(seferId)?.noseiKeilim ?? []).map((id) => worksById[id]).filter(Boolean)

/** `public/content/sources.json`: version + license per work per sefer (key `text` is the base text). */
export interface SourceVersion {
  versionTitle: string
  license: string
  versionSource?: string
  /** Simanim this version supplies, when a sefer mixes versions. */
  ranges?: [number, number][]
  note?: string
}
export type Sources = Record<string, Record<string, { title: string; versions: SourceVersion[] }>>
