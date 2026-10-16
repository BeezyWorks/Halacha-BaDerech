import { createSearchQuery, normalize } from '@/lib/utils/search'
import { gematria, parseGematria } from '../content/parse'
import type { CatalogSefer } from '../data/catalog'
import { isCovered } from '../coverage'

/** Names a sefer goes by in a search: Hebrew, English and transliterations. */
export const SEFER_KEYWORDS: Record<string, string[]> = {
  oc: ['אורח חיים', 'או״ח', 'orach chaim', 'orach chayim', 'orach hayim', 'oc'],
  yd: ['יורה דעה', 'יו״ד', 'yoreh deah', "yoreh de'ah", 'yoreh dea', 'yd'],
  eh: ['אבן העזר', 'אבהע״ז', 'even haezer', 'even ha ezer', 'eh'],
  cm: ['חושן משפט', 'חו״מ', 'choshen mishpat', 'choshen mishpot', 'cm'],
  mb: ['משנה ברורה', 'מ״ב', 'mishna berura', 'mishnah berurah', 'mishna brura', 'mb'],
  kitzur: ['קיצור שולחן ערוך', 'קיצור', 'kitzur shulchan aruch', 'kitzur', 'ksa'],
}

/** One row of a siman list: a siman of a sefer, with its heading when it has one. */
export interface SimanEntry {
  sefer: string
  n: number
  title?: string
  /** False for a siman the app has no text for (see the catalog's `coverage`). */
  covered: boolean
}

/** The simanim of a sefer, 1..N (gaps stay in the list, marked uncovered), with headings from its index. */
export function simanEntries(
  sefer: string,
  count: number,
  titles: ReadonlyMap<number, string> | undefined,
): SimanEntry[] {
  return Array.from({ length: count }, (_, i) => ({
    sefer,
    n: i + 1,
    title: titles?.get(i + 1),
    covered: isCovered(sefer, i + 1),
  }))
}

const HEBREW = /[א-ת]/

/** A siman number written as digits ("328") or as a Hebrew numeral ("שכח", "ט״ו"); otherwise undefined. */
export function parseSimanNumber(text: string): number | undefined {
  const token = normalize(text)
  if (!token) return undefined
  if (/^[0-9]+$/.test(token)) return Number(token)
  if (!HEBREW.test(token)) return undefined
  // Final forms count as their plain letters; the numeral must be written canonically
  // (so "חיים" or "אוח" are words, not numbers).
  const plain = token
    .replace(/ך/g, 'כ')
    .replace(/ם/g, 'מ')
    .replace(/ן/g, 'נ')
    .replace(/ף/g, 'פ')
    .replace(/ץ/g, 'צ')
  const n = parseGematria(plain)
  return Number.isFinite(n) && gematria(n) === plain ? n : undefined
}

export interface ParsedQuery {
  /** The part naming a sefer ("oc", "orach chaim"), if any. */
  sefer: string
  /** A trailing siman number, if any. */
  siman?: number
}

/** "oc 328" → {sefer: "oc", siman: 328}; "orach chaim" → {sefer: "orach chaim"}; "שכח" → {sefer: "שכח"}. */
export function parseQuery(query: string): ParsedQuery {
  const words = query.trim().split(/\s+/)
  if (words.length > 1) {
    const siman = parseSimanNumber(words[words.length - 1])
    if (siman !== undefined) return { sefer: words.slice(0, -1).join(' '), siman }
  }
  return { sefer: query.trim() }
}

/** The sefarim a query names ("oc", "orach chaim", "או״ח", "yoreh"), in the given order. */
export function searchSefarim<T extends Pick<CatalogSefer, 'id'>>(
  sefarim: readonly T[],
  query: string,
): T[] {
  const q = createSearchQuery(query)
  if (q.empty) return [...sefarim]
  return sefarim.filter((s) => q.matches(SEFER_KEYWORDS[s.id] ?? []))
}

export interface SimanSearchResult {
  /** Sefarim whose name the query matches, when it names one without a number. */
  sefarim: string[]
  simanim: SimanEntry[]
}

/**
 * Search a set of sefarim's simanim. Matches, in order: a siman number
 * ("שכח", "328"), a sefer name plus number ("oc 328", "או״ח א"), a sefer name
 * alone (its tile), and a Hebrew substring of a siman's heading.
 * `entries` holds every siman of each sefer in scope.
 */
export function searchSimanim(
  query: string,
  scope: readonly Pick<CatalogSefer, 'id'>[],
  entries: Readonly<Record<string, readonly SimanEntry[]>>,
): SimanSearchResult {
  const trimmed = query.trim()
  if (!normalize(trimmed)) return { sefarim: scope.map((s) => s.id), simanim: [] }

  const out: SimanEntry[] = []
  const seen = new Set<SimanEntry>()
  const add = (e: SimanEntry | undefined) => {
    if (e && !seen.has(e)) {
      seen.add(e)
      out.push(e)
    }
  }
  const at = (sefer: string, n: number) => entries[sefer]?.[n - 1]

  // "<sefer> <number>"
  const parsed = parseQuery(trimmed)
  if (parsed.siman !== undefined) {
    for (const s of searchSefarim(scope, parsed.sefer)) add(at(s.id, parsed.siman))
  }
  // A bare number, in every sefer in scope.
  const bare = parseSimanNumber(trimmed)
  if (bare !== undefined) for (const s of scope) add(at(s.id, bare))

  // A sefer's name alone.
  const named =
    parsed.siman === undefined && bare === undefined
      ? searchSefarim(scope, trimmed).map((s) => s.id)
      : []

  // A substring of a heading (Hebrew, two letters or more: one letter is a numeral).
  const needle = normalize(trimmed)
  if (HEBREW.test(needle) && needle.length >= 2 && parsed.siman === undefined) {
    for (const s of scope) {
      for (const e of entries[s.id] ?? []) {
        if (e.title && normalize(e.title).includes(needle)) add(e)
      }
    }
  }
  return { sefarim: named, simanim: out }
}
