/**
 * Hebrew Wikisource "משנה ברורה על אורח חיים <siman>" wikitext → Mishna Berura
 * seifim katanim (pure; the fetching/caching lives in scripts/lib/wikisource.mjs).
 *
 * Page shape:
 *   {{פרשן על שו"ע|משנה ברורה|אורח חיים|ב|ג|ד}}
 *   ===[[שולחן ערוך אורח חיים ג א|סעיף א]]===        (or plain `===סעיף א===`, or `==…==`)
 *   <קטע התחלה=א/>
 *   {{משע|מב|א|ועכשיו}} '''וכו' '''– כי אין אנו מוחזקין …<קטע סוף=א/>
 * The header names the Shulchan Aruch seif (`saSeif`); each `{{משע|מב|<sk>|<DH>}}`
 * opens a seif katan, whose DH may continue in bold after the template. Everything
 * after the last seif (`----`, "הערות שוליים", `==משנת סופרים==` appendices) is cut.
 *
 * Templates found in simanim 1-186 and 588 and how they are handled:
 *   משע (sk opener, ~4400) → structure; ררר (491, empty placeholder where the
 *   source has no dash) → dropped; צ / קטן (quote / small text) → their text;
 *   ב (abbreviation|expansion) → the abbreviation; מקור (reference|text) → the
 *   text; ממ … (Rambam link) , תוכן עניינים שטוח, להשלים, פרשן על שו"ע → dropped.
 * Any other template is dropped and reported in `warnings`.
 */
import { decodeEntities, gematria, parseGematria } from './parse.ts'
import type { Unit } from './types.ts'

export interface WikisourceMb {
  /** Seifim katanim in page order: `n` = sk, `saSeif`, `dh`, `text` = "DH – body". */
  units: Unit[]
  /** Anything unexpected: unknown templates/tags/headers, duplicate or skipped sk numbers. */
  warnings: string[]
  /** Text found in a seif before its first seif katan (not included in `units`), if any. */
  prefaces: { saSeif: number; text: string }[]
  /** Non-seif sections after the seifim, such as `משנת סופרים` (not included in `units`). */
  appendices: string[]
}

const SK_OPEN = '\u0001'
const SK_SEP = '\u0002'
const SK_CLOSE = '\u0003'
const SEIF_MARK = '\u0004'

/** Page title for a siman: `משנה ברורה על אורח חיים קיח`. */
export const wikisourceMbTitle = (siman: number): string =>
  `משנה ברורה על אורח חיים ${gematria(siman)}`

/** Fills `{siman}` in a catalog `page` pattern with the Hebrew numeral. */
export const wikisourcePageTitle = (pattern: string, siman: number): string =>
  pattern.replace('{siman}', gematria(siman))

/** Splits template arguments on top-level `|` (links are already flattened). */
const splitArgs = (inner: string): string[] => inner.split('|').map((s) => s.trim())

const DROPPED_TEMPLATES = new Set(['ררר', 'להשלים', 'תוכן עניינים שטוח', 'פרשן על שו"ע'])

function expandTemplates(src: string, warnings: string[]): string {
  let s = src
  // Innermost-first until no template is left.
  for (let guard = 0; guard < 20 && /\{\{/.test(s); guard++) {
    s = s.replace(/\{\{([^{}]*)\}\}/g, (_all, inner: string) => {
      const [name, ...args] = splitArgs(inner)
      if (name === 'משע') {
        const sk = parseGematria(args[1] ?? '')
        if (!Number.isFinite(sk)) warnings.push(`משע with bad sk "${args[1]}"`)
        return `${SK_OPEN}${Number.isFinite(sk) ? sk : 0}${SK_SEP}${args.slice(2).join('|')}${SK_CLOSE}`
      }
      if (DROPPED_TEMPLATES.has(name) || name.startsWith('ממ')) return ''
      if (name === 'צ' || name === 'קטן' || name === 'ב') return args[0] ?? ''
      if (name === 'מקור') return args[1] ?? args[0] ?? ''
      warnings.push(`unknown template {{${name}}}`)
      return ''
    })
  }
  return s.replace(/\{\{|\}\}/g, '')
}

/** Wiki markup → plain text, leaving the structural sentinels and header lines intact. */
function stripMarkup(wikitext: string, warnings: string[]): string {
  let s = wikitext.replace(/\r/g, '')
  s = s.replace(/<!--[\s\S]*?-->/g, '')
  s = s.replace(/<noinclude>[\s\S]*?<\/noinclude>/g, '')
  s = s.replace(/<ref[^>]*\/>/g, '').replace(/<ref[^>]*>[\s\S]*?<\/ref>/g, '')
  s = s.replace(/<references\s*\/>/g, '')
  // `<קטע התחלה=א/>` names the seif too (some pages have it but no header); the rest goes.
  s = s.replace(/<קטע התחלה=([^/>]*)\/>/g, (_a, seif: string) => `\n${SEIF_MARK}${seif.trim()}\n`)
  s = s.replace(/<קטע[^>]*\/>/g, '')
  s = s.replace(/<nowiki\s*\/?>/g, '').replace(/<\/nowiki>/g, '')
  // Categories and other namespaced links vanish; `[[#x|text]]`, `[[page|text]]` → text.
  s = s.replace(/\[\[(?:קטגוריה|Category)\s*:[^\]]*\]\]/gi, '')
  s = s.replace(/\[\[([^\]|]*)\|([^\]]*)\]\]/g, '$2')
  s = s.replace(/\[\[:?([^\]|]*)\]\]/g, (_a, target: string) => target.replace(/^#/, ''))
  s = s.replace(/<br\s*\/?>/gi, '\n')
  s = s.replace(/<\/?small>/gi, '')
  // Older pages print the sk as `'''(א) DH''' — body` instead of using {{משע}}.
  s = s.replace(/'''\(([^)]{1,8})\)\s*(.*?)'''/g, (_a, label: string, dh: string) => {
    const sk = parseGematria(label)
    return Number.isFinite(sk) ? `${SK_OPEN}${sk}${SK_SEP}${dh}${SK_CLOSE}` : _a
  })
  s = expandTemplates(s, warnings)
  s = s.replace(/<\/?(?:center|big|span|div|b|i|u|sup|sub)[^>]*>/gi, '')
  for (const m of s.matchAll(/<\/?([a-zA-Z][a-zA-Z0-9]*)[^>]*>/g)) {
    warnings.push(`unknown tag <${m[1]}>`)
  }
  s = s.replace(/<\/?[a-zA-Z][^>]*>/g, '')
  return decodeEntities(s)
}

/** `'''bold'''` / `''italic''` markers off. */
const stripEmphasis = (s: string) =>
  // `וכו''''` is an apostrophe followed by the closing `'''`.
  s
    .replace(/''''(?!')/g, "'\u0007")
    .replace(/'{2,}/g, '')
    .replace(/\u0007/g, '')

/** Joins a seif katan's source lines: blank line / `<br>` → "\n", a single wrap → a space. */
function tidy(s: string): string {
  return s
    .split(/\n[ \t]*\n+/)
    .map((p) =>
      p
        .replace(/\s*\n\s*/g, ' ')
        .replace(/[ \t]+/g, ' ')
        .trim(),
    )
    .filter(Boolean)
    .join('\n')
}

/** Shorter unnumbered text (a stray "אין") is a page stub, not Mishna Berura. */
const MIN_PREFACE = 20

const DASH = /^[-–—]+\s*/

/** Splits the text after a `{{משע}}` into the DH (template DH + bold continuation) and body. */
function splitSk(tplDh: string, rest: string): { dh: string; body: string } {
  let dh = stripEmphasis(tplDh).replace(/\s+/g, ' ').trim()
  let r = rest.replace(/^[ \t]+/, '')
  // Bold continuation of the DH ("וכו'") before the dash.
  const bold = /^'''(.*?)'''(?!')[ \t]*/.exec(r)
  if (bold) {
    dh = `${dh} ${bold[1].trim()}`.trim()
    r = r.slice(bold[0].length)
  }
  r = stripEmphasis(r).replace(/^[ \t]+/, '')
  r = r.replace(DASH, '')
  dh = dh.replace(/[\s:.,;]+$/, '')
  return { dh, body: tidy(r) }
}

const SEIF_HEADER = /^(={2,4})\s*(?:סעיף|סי?עיף)\s+([^=]*?)\s*\1\s*$/
const ANY_HEADER = /^(={2,4})\s*([^=]*?)\s*\1\s*$/

export function parseWikisourceMb(wikitext: string): WikisourceMb {
  const warnings: string[] = []
  const appendices: string[] = []
  const prefaces: { saSeif: number; text: string }[] = []
  const units: Unit[] = []

  const clean = stripMarkup(wikitext, warnings)
  const lines = clean.split('\n')

  // Group the lines into seifim; everything after the seifim's end is cut.
  type Section = { saSeif: number; lines: string[] }
  const sections: Section[] = []
  let current: Section | undefined
  let tail: string[] | undefined
  for (const line of lines) {
    if (tail) {
      tail.push(line)
      continue
    }
    const trimmed = line.trim()
    if (trimmed.startsWith(SEIF_MARK)) {
      // Seif start from `<קטע התחלה=…/>`: only needed when no header said so.
      const n = parseGematria(trimmed.slice(1))
      if (Number.isFinite(n) && (!current || current.saSeif !== n)) {
        current = { saSeif: n, lines: [] }
        sections.push(current)
      }
      continue
    }
    const seif = SEIF_HEADER.exec(trimmed)
    if (seif) {
      const n = parseGematria(seif[2].replace(/["'׳״]/g, ''))
      if (!Number.isFinite(n)) warnings.push(`seif header "${trimmed}" not understood`)
      current = { saSeif: Number.isFinite(n) ? n : (current?.saSeif ?? 0) + 1, lines: [] }
      sections.push(current)
      continue
    }
    const header = ANY_HEADER.exec(trimmed)
    if (header && current && header[1].length <= 3) {
      // First non-seif section after the seifim (משנת סופרים, הערות שוליים …).
      tail = [header[2]]
      continue
    }
    if (/^-{4,}$/.test(trimmed) || /^הערות שוליים$/.test(stripEmphasis(trimmed))) {
      if (current) tail = []
      continue
    }
    if (header) {
      // `==סימן לו==` before the first seif is dropped; a deeper header inside a seif is plain text.
      if (current) current.lines.push(header[2])
      continue
    }
    current?.lines.push(line)
  }
  if (tail?.length) {
    const title = tail[0].trim()
    if (title && !/^הערות שוליים$/.test(title) && tail.slice(1).some((l) => l.trim().length > 20))
      appendices.push(title)
  }

  const seen = new Set<number>()
  for (const section of sections) {
    // `|{{משע` (stray table pipe) and other line-start noise before an sk opener.
    const body = section.lines.join('\n').replace(/^[ \t]*\|[ \t]*(?=\u0001)/gm, '')
    const parts = body.split(SK_OPEN)
    const pre = tidy(stripEmphasis(parts[0]))
    if (pre.length >= MIN_PREFACE) {
      prefaces.push({ saSeif: section.saSeif, text: pre })
      units.push({ n: 0, text: pre, saSeif: section.saSeif })
    } else if (pre) warnings.push(`dropped stub text "${pre}" in seif ${section.saSeif}`)
    for (const part of parts.slice(1)) {
      const sep = part.indexOf(SK_SEP)
      const close = part.indexOf(SK_CLOSE)
      const n = parseInt(part.slice(0, sep), 10)
      const { dh, body: text } = splitSk(part.slice(sep + 1, close), part.slice(close + 1))
      if (!n) continue
      if (seen.has(n)) warnings.push(`sk ${gematria(n)} appears twice`)
      seen.add(n)
      const full = text ? (dh ? `${dh} – ${text}` : text) : dh
      if (!full) {
        warnings.push(`sk ${gematria(n)} is empty`)
        continue
      }
      units.push({ n, text: full, saSeif: section.saSeif, ...(dh && text ? { dh } : {}) })
    }
  }

  // Sequence check: sk numbers should climb by one.
  units.forEach((u, i) => {
    const prev = units[i - 1]
    if (prev && u.n !== prev.n + 1)
      warnings.push(`sk ${gematria(prev.n)} followed by ${gematria(u.n)}`)
  })
  return { units, warnings, prefaces, appendices }
}
