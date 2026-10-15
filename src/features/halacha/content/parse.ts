/**
 * Pure HTML → text parsing for Sefaria segments. Runs under Node (ingest,
 * via native type stripping) and under Jest, so: no imports from the app, and
 * erasable TypeScript only (no enums / parameter properties).
 */
import type { Mark } from './types.ts'

const ENTITIES: Record<string, string> = {
  nbsp: ' ',
  thinsp: ' ',
  ensp: ' ',
  emsp: ' ',
  amp: '&',
  quot: '"',
  apos: "'",
  lt: '<',
  gt: '>',
}

export const decodeEntities = (s: string): string =>
  s.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, e: string) => {
    if (e[0] === '#') {
      const code = e[1].toLowerCase() === 'x' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10)
      return Number.isFinite(code) ? String.fromCodePoint(code) : m
    }
    return ENTITIES[e.toLowerCase()] ?? m
  })

// --- gematria ----------------------------------------------------------------
const ONES = ['', 'א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ז', 'ח', 'ט']
const TENS = ['', 'י', 'כ', 'ל', 'מ', 'נ', 'ס', 'ע', 'פ', 'צ']
const HUNDREDS = ['', 'ק', 'ר', 'ש', 'ת', 'תק', 'תר', 'תש', 'תת', 'תתק']

/** 1 → "א", 15 → "טו", 16 → "טז", 123 → "קכג" (no geresh/gershayim). */
export function gematria(n: number): string {
  if (!Number.isInteger(n) || n <= 0) return String(n)
  if (n >= 1000) return gematria(Math.floor(n / 1000)) + gematria(n % 1000)
  const rest = n % 100
  let tail: string
  if (rest === 15) tail = 'טו'
  else if (rest === 16) tail = 'טז'
  else tail = TENS[Math.floor(rest / 10)] + ONES[rest % 10]
  return HUNDREDS[Math.floor(n / 100)] + tail
}

const LETTER_VALUES: Record<string, number> = {}
'אבגדהוזחט'.split('').forEach((c, i) => (LETTER_VALUES[c] = i + 1))
'יכלמנסעפצ'.split('').forEach((c, i) => (LETTER_VALUES[c] = (i + 1) * 10))
'קרשת'.split('').forEach((c, i) => (LETTER_VALUES[c] = (i + 1) * 100))
Object.assign(LETTER_VALUES, { ך: 20, ם: 40, ן: 50, ף: 80, ץ: 90 })

/** "קכג" → 123, "ט\"ו" → 15; NaN if there are no Hebrew letters. */
export function parseGematria(label: string): number {
  let sum = 0
  let any = false
  for (const ch of label) {
    const v = LETTER_VALUES[ch]
    if (v) {
      sum += v
      any = true
    }
  }
  return any ? sum : NaN
}

// --- inline commentator markers ---------------------------------------------
export interface Marker {
  commentator: string
  /** `data-order`: the seif katan number, when present. */
  order?: number
  /** `data-label`: the printed letter, when present. */
  label?: string
}

/**
 * Parses one `<i data-commentator=… data-order=… data-label=…></i>` tag
 * leniently: Sefaria's HTML has malformed attributes such as
 * `<i data-commentator=Mishnah Berurah" data-label="א">` (missing opening quote).
 */
export function parseMarker(tag: string): Marker | null {
  if (!/data-commentator/i.test(tag)) return null
  const c = /data-commentator\s*=\s*\\?["']?(.*?)\\?["']?\s*(?:data-|\/?>|$)/i.exec(tag)
  const commentator = c?.[1]?.trim()
  if (!commentator) return null
  const o = /data-order\s*=\s*\\?["']?(\d+)/i.exec(tag)
  const l = /data-label\s*=\s*\\?["']?([^"'\s>\\]+)/i.exec(tag)
  return {
    commentator,
    ...(o ? { order: parseInt(o[1], 10) } : {}),
    ...(l ? { label: l[1] } : {}),
  }
}

// --- html → plain text with offsets -----------------------------------------
export interface RawMarker extends Marker {
  /** Offset into `text` of the word the marker precedes. */
  at: number
}

export interface ParsedUnit {
  text: string
  /** Rema glosses. */
  marks: Mark[]
  markers: RawMarker[]
  /** `<small>` spans that did not start with הגה (not reported as marks). */
  otherSmall: string[]
}

const isSpace = (ch: string) => /\s/.test(ch)
const HAGAH_START = /^[[(]?\s*הגה/

/**
 * Strips Sefaria HTML to plain text, recording inline commentator markers
 * (`<i data-commentator…>`) and `<small>הגה …</small>` Rema spans as offsets
 * into the result. Whitespace is collapsed; `<br>` becomes a newline.
 */
export function htmlToUnit(html: string): ParsedUnit {
  let out = ''
  const marks: Mark[] = []
  const markers: RawMarker[] = []
  const otherSmall: string[] = []
  let smallDepth = 0
  let smallStart = 0

  const closeSmall = () => {
    let s = smallStart
    while (s < out.length && isSpace(out[s])) s++
    let e = out.length
    while (e > s && isSpace(out[e - 1])) e--
    if (e <= s) return
    const span = out.slice(s, e)
    if (HAGAH_START.test(span)) marks.push({ start: s, end: e, kind: 'hagah' })
    else otherSmall.push(span)
  }

  const pushText = (raw: string) => {
    for (const ch of decodeEntities(raw)) {
      if (isSpace(ch)) {
        if (out === '' || out.endsWith(' ') || out.endsWith('\n')) continue
        out += ' '
      } else out += ch
    }
  }

  for (const m of html.matchAll(/<[^>]*>|[^<]+/g)) {
    const tok = m[0]
    if (tok[0] !== '<') {
      pushText(tok)
      continue
    }
    if (/^<br\b/i.test(tok)) {
      if (out.endsWith(' ')) out = out.slice(0, -1) + '\n'
      else if (out !== '' && !out.endsWith('\n')) out += '\n'
    } else if (/^<small\b/i.test(tok)) {
      if (smallDepth++ === 0) smallStart = out.length
    } else if (/^<\/small\b/i.test(tok)) {
      if (smallDepth > 0 && --smallDepth === 0) closeSmall()
    } else if (/^<i\b/i.test(tok) && /data-commentator/i.test(tok)) {
      const marker = parseMarker(tok)
      if (marker) markers.push({ ...marker, at: out.length })
    }
  }
  if (smallDepth > 0) closeSmall() // unclosed <small>

  const text = out.trimEnd()
  return {
    text,
    marks: marks
      .map((k) => ({ ...k, end: Math.min(k.end, text.length) }))
      .filter((k) => k.end > k.start),
    markers: markers.map((k) => ({ ...k, at: Math.min(k.at, text.length) })),
    otherSmall,
  }
}

export const plainText = (html: string): string => htmlToUnit(html).text

/** Seif 1 of a Shulchan Aruch siman starts with `<b>heading</b><br>`. */
export function extractTitle(html: string): { title?: string; rest: string } {
  const m = /^\s*<b>([\s\S]*?)<\/b>\s*<br\s*\/?>/i.exec(html)
  if (!m) return { rest: html }
  const title = plainText(m[1])
  return { ...(title ? { title } : {}), rest: html.slice(m[0].length) }
}

// --- comments: dibur hamaschil ------------------------------------------------
/**
 * How a commentary marks its dibur hamaschil (catalog `dh`):
 * - `bold`: leading `<b>DH</b>` (Magen Avraham, Taz, Biur Halacha, …)
 * - `boldLocator`: like `bold`, after an optional `<small>locator</small>` or `(locator)` (Rabbi Akiva Eiger)
 * - `boldOrPeriod`: `bold`, but when a comment has no bold, `candidate` is its first sentence ("DH. body"),
 *   to be confirmed against the base text by the caller
 * - `none`: no marked DH
 */
export type DhFormat = 'bold' | 'boldLocator' | 'boldOrPeriod' | 'none'

export interface SplitComment {
  dh?: string
  text: string
  locator?: string
  /** `boldOrPeriod` only: an unconfirmed DH + body split at the first period. */
  candidate?: { dh: string; text: string }
}

const TRAILING_PUNCT = /[\s.:,;\-–—]+$/
const LEADING_PUNCT = /^[\s.:,;\-–—]+/

export function splitComment(html: string, format: DhFormat): SplitComment {
  if (format === 'none') return { text: plainText(html) }
  let rest = html.trimStart()
  let locator: string | undefined
  if (format === 'boldLocator') {
    const m = /^<small>([\s\S]*?)<\/small>\s*/i.exec(rest) ?? /^\(([^)]{1,60})\)\s*/.exec(rest)
    if (m) {
      locator = plainText(m[1]) || undefined
      rest = rest.slice(m[0].length)
    }
  }
  const b = /^\s*<b>([\s\S]*?)<\/b>/i.exec(rest)
  const full = plainText(rest)
  const withLocator = (r: SplitComment): SplitComment => (locator ? { ...r, locator } : r)
  if (!b) {
    if (format === 'boldOrPeriod') {
      const p = /^(.{2,70}?)[.:]\s+(\S[\s\S]*)$/.exec(full)
      if (p && p[1].split(/\s+/).length <= 9)
        return { text: full, candidate: { dh: p[1].replace(TRAILING_PUNCT, ''), text: p[2] } }
    }
    return withLocator({ text: full })
  }
  const dh = plainText(b[1]).replace(TRAILING_PUNCT, '')
  const body = plainText(rest.slice(b[0].length)).replace(LEADING_PUNCT, '')
  if (!dh || dh.length > 160) return withLocator({ text: full })
  if (!body) return withLocator({ text: dh })
  return withLocator({ dh, text: body })
}

export interface SplitMb {
  label?: string
  dh?: string
  /** Body including its DH, label removed. */
  text: string
}

/** Mishna Berura seif katan: `(א) DH - body`. */
export function splitMb(html: string): SplitMb {
  let s = plainText(html)
  let label: string | undefined
  const l = /^\(([^)]{1,8})\)\s*/.exec(s)
  if (l) {
    label = l[1]
    s = s.slice(l[0].length)
  }
  const d = /\s[-–—]\s/.exec(s)
  const dh = d && d.index > 0 && d.index <= 160 ? s.slice(0, d.index).trim() : undefined
  return { ...(label ? { label } : {}), ...(dh ? { dh } : {}), text: s }
}

/** Joins nested arrays of segments (e.g. several paragraphs of one comment). */
export function flattenSegments(x: unknown): string[] {
  if (typeof x === 'string') return x.trim() ? [x] : []
  if (Array.isArray(x)) return x.flatMap(flattenSegments)
  return []
}
