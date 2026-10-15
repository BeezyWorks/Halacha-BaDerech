/**
 * Locating a commentator's dibur hamaschil (DH) in the base text. Pure; runs
 * under Node (ingest) and Jest.
 */

export interface Token {
  /** Hebrew letters only: nikud, quotes and geresh/gershayim removed. */
  w: string
  start: number
  end: number
  /** Followed/interrupted by a geresh or quote: an abbreviation (פ', ע"ג, כו'). */
  abbr?: boolean
  /** Quote *inside* the word (ע"ג, בה"מ): its letters are initials of the words it abbreviates. */
  init?: boolean
}

const QUOTES = new Set(['"', "'", '״', '׳', '’', '‘', '“', '”', '`'])
const isLetter = (ch: string) => ch >= 'א' && ch <= 'ת'
const isNikud = (ch: string) => ch >= '֑' && ch <= 'ׇ'

/** Splits into Hebrew words; quotes inside/after a word (מג"א, כו') do not split it. */
export function tokenize(text: string, from = 0): Token[] {
  const tokens: Token[] = []
  let cur = ''
  let start = -1
  let end = -1
  let abbr = false
  let init = false
  const flush = () => {
    if (cur)
      tokens.push({ w: cur, start, end, ...(abbr ? { abbr } : {}), ...(init ? { init } : {}) })
    cur = ''
    abbr = false
    init = false
  }
  for (let i = from; i < text.length; i++) {
    const ch = text[i]
    if (isLetter(ch)) {
      if (!cur) start = i
      cur += ch
      end = i + 1
    } else if (isNikud(ch)) {
      if (cur) end = i + 1
    } else if (QUOTES.has(ch)) {
      if (cur) {
        abbr = true
        if (isLetter(text[i + 1] ?? '')) init = true
        else end = i + 1 // a trailing geresh belongs to the word (ה', כו')
      }
    } else flush()
  }
  flush()
  return tokens
}

/** Tokens that cut a DH short ("שיהא כו'", "ויאמר וגו'"). */
const ELLIPSIS = new Set(['כו', 'וכו', 'וגו', 'כוי', 'וכוי'])
const PREFIX_LETTERS = 'והבלמשכד'

function lev(a: string, b: string): number {
  const prev = Array.from({ length: b.length + 1 }, (_, i) => i)
  for (let i = 1; i <= a.length; i++) {
    let diag = prev[0]
    prev[0] = i
    for (let j = 1; j <= b.length; j++) {
      const tmp = prev[j]
      prev[j] = Math.min(prev[j] + 1, prev[j - 1] + 1, diag + (a[i - 1] === b[j - 1] ? 0 : 1))
      diag = tmp
    }
  }
  return prev[b.length]
}

/** Tolerant word equality: abbreviation prefixes, a different prefix letter, one typo. */
export function tokenEq(x: Token | string, y: Token | string): boolean {
  const a = typeof x === 'string' ? x : x.w
  const b = typeof y === 'string' ? y : y.w
  if (a === b) return true
  const n = Math.min(a.length, b.length)
  if (n >= 3 && (a.startsWith(b) || b.startsWith(a))) return true
  // פ' ~ פרשת, ע' ~ עיין: the shorter, geresh-marked word abbreviates the longer one
  const abbr = (t: Token | string, w: string) => typeof t !== 'string' && t.abbr && w.length < 4
  if ((abbr(x, a) && b.startsWith(a)) || (abbr(y, b) && a.startsWith(b))) return true
  // with 0-2 prefix letters (ו ה ב ל …) removed from either side
  const forms = (w: string) => {
    const out = [w]
    for (let k = 1; k <= 2; k++) {
      if (w.length - k >= 3 && PREFIX_LETTERS.includes(w[k - 1])) out.push(w.slice(k))
      else break
    }
    return out
  }
  for (const fa of forms(a)) {
    for (const fb of forms(b)) {
      if (fa === fb && fa.length >= 3) return true
      if (Math.max(fa.length, fb.length) >= 5 && lev(fa, fb) <= 1) return true
    }
  }
  return false
}

/**
 * The DH as segments of words, cut at "כו'/וכו'/וגו'". Leading "(ליקוט)" and
 * "סעי' א" (Beur HaGra's seif locator) are dropped.
 */
export function dhSegments(dh: string): Token[][] {
  const cleaned = dh
    .replace(/^\s*\([^)]*\)\s*/, '')
    .replace(/^\s*סעי['׳]?\s+[א-ת"׳']{1,5}(?=\s)/, '')
  const segments: Token[][] = []
  let cur: Token[] = []
  for (const t of tokenize(cleaned)) {
    if (ELLIPSIS.has(t.w)) {
      if (cur.length) segments.push(cur)
      cur = []
    } else cur.push(t)
  }
  if (cur.length) segments.push(cur)
  return segments
}

/**
 * How many of `words` (from `from`) the initials-abbreviation `letters` spells
 * (ע"ג = על גבי; בה"מ = בית המקדש), or 0. A word may contribute a prefix letter too.
 */
function abbrWords(letters: string, words: Token[], from: number): number {
  const go = (pos: number, i: number): number => {
    if (pos === letters.length) return i - from
    const word = words[i]?.w
    if (!word) return 0
    for (const take of [1, 2]) {
      if (word.length >= take && letters.slice(pos, pos + take) === word.slice(0, take)) {
        const r = go(pos + take, i + 1)
        if (r) return r
      }
    }
    return 0
  }
  return letters.length >= 2 ? go(0, from) : 0
}

/** Matches `seg` against `base` starting at `p`; returns the index of the last base token, or -1. */
function matchSegment(base: Token[], p: number, seg: Token[]): number {
  let i = p
  let j = 0
  let tolerated = false
  while (j < seg.length) {
    if (i >= base.length) return -1
    if (tokenEq(seg[j], base[i])) {
      i++
      j++
      continue
    }
    // ע"ג in the DH vs "על גבי" in the text, and the other way round
    if (seg[j].init) {
      const k = abbrWords(seg[j].w, base, i)
      if (k) {
        i += k
        j++
        continue
      }
    }
    if (base[i].init) {
      const k = abbrWords(base[i].w, seg, j)
      if (k) {
        i++
        j += k
        continue
      }
    }
    // one deviation tolerated inside a long DH: a few extra words in the text, or one substitution
    if (!tolerated && j > 0 && seg.length >= 3) {
      tolerated = true
      let skip = 0
      for (let k = 1; k <= 2; k++) {
        if (i + k < base.length && tokenEq(seg[j], base[i + k])) {
          skip = k
          break
        }
      }
      if (skip) {
        i += skip
        continue
      }
      if (seg.length >= 4) {
        i++
        j++
        continue
      }
    }
    return -1
  }
  return i - 1
}

export interface DhMatch {
  start: number
  end: number
}

/**
 * Finds the DH in `text`.
 * - `anchored` (a marker sits at `at`, just before the DH words): the DH must
 *   start within the first three words at/after `at`.
 * - `search`: first occurrence at/after `from`, for comments without markers.
 * Returns the span of the matched words, or undefined if not confident.
 */
export function matchDh(
  text: string,
  dh: string,
  opts: { mode: 'anchored'; at: number } | { mode: 'search'; from?: number },
): DhMatch | undefined {
  const segments = dhSegments(dh)
  if (!segments.length) return undefined
  const first = segments[0]
  const total = segments.reduce((n, s) => n + s.length, 0)
  const from = opts.mode === 'anchored' ? opts.at : (opts.from ?? 0)
  const base = tokenize(text, from)
  const lastStart = opts.mode === 'anchored' ? Math.min(2, base.length - 1) : base.length - 1
  if (opts.mode === 'search' && total < 2 && first[0].w.length < 4) return undefined
  if (total === 1 && first[0].w.length < 2) return undefined

  for (let p = 0; p <= lastStart; p++) {
    let end = matchSegment(base, p, first)
    if (end < 0) continue
    // Remaining segments (after כו') are searched for a little further on.
    let cursor = end + 1
    for (const seg of segments.slice(1)) {
      let found = -1
      for (let q = cursor; q < Math.min(base.length, cursor + 40); q++) {
        if (!tokenEq(seg[0], base[q])) continue
        const e = matchSegment(base, q, seg)
        if (e >= 0) {
          found = e
          break
        }
      }
      if (found < 0) break
      end = found
      cursor = end + 1
    }
    return { start: base[p].start, end: base[end].end }
  }
  return undefined
}
