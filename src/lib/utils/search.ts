/** Drops accents, Hebrew niqqud/cantillation, spaces and punctuation, so
 * "Bava Kama", "bava-kama" and "bavakama" compare equal. (Ported from the
 * mishna app's `searchShas`.) */
export function normalize(text: string): string {
  return text
    .normalize('NFD')
    .toLowerCase()
    .replace(/[̀-֑ͯ-ׇ]/g, '')
    .replace(/[^a-z0-9א-ת]/g, '')
}

/** Folds one lowercase Latin word toward a shared pronunciation skeleton, so
 * Ashkenazi ("Breishis", "Vayikro") and Israeli/Sephardi ("Bereshit",
 * "Vayikra") spellings meet in the middle. Lossy on purpose — it only ever
 * compares a query against a few hundred known names. `endings` also folds
 * the word-final -os/-ot and silent -h, which is wrong for a half-typed
 * query, so `matches` tries both. */
function foldWord(word: string, endings: boolean): string {
  let w = word
    .replace(/sh/g, 'š')
    .replace(/kh|ch/g, 'h')
    .replace(/th/g, 't')
    .replace(/ph/g, 'f')
    .replace(/tz|ts/g, 'z')
    .replace(/[ckq]+/g, 'k')
    .replace(/[wv]/g, 'b')
    // Diphthongs first (ei/ey/ay/ai → e; oy/oi → o), then the a/o/u family:
    // kamatz-as-o and cholam-as-u are the Ashkenazi vowel shifts.
    .replace(/ei|ey|ay|ai|ae/g, 'e')
    .replace(/ee|y/g, 'i')
    .replace(/oo|ou|[ou]/g, 'a')
    .replace(/(.)\1+/g, '$1')
  // -os/-us/-as (Ashkenazi) ↔ -ot (Israeli) endings, and a silent final h.
  if (endings) w = w.replace(/([aeiou])s$/, '$1t').replace(/([ao])h$/, '$1')
  return w
}

/** `foldWord` per Latin word, for matching across spellings. */
function fold(text: string, endings: boolean): string {
  return text
    .toLowerCase()
    .replace(/['\u2019\u05f3]/g, '')
    .split(/[^a-z\u05d0-\u05ea]+/)
    .map((word) => (/[a-z]/.test(word) ? foldWord(word, endings) : word))
    .join('')
}

/** A query prepared once, then tested against many lists of terms. */
export interface SearchQuery {
  /** True when the query is empty after normalizing — match everything. */
  empty: boolean
  matches: (terms: string[]) => boolean
}

export function createSearchQuery(query: string): SearchQuery {
  const needle = normalize(query)
  const full = fold(query, true)
  const partial = fold(query, false)
  return {
    empty: !needle,
    matches: (terms) =>
      terms.some(
        (term) =>
          normalize(term).includes(needle) ||
          fold(term, true).includes(full) ||
          fold(term, false).includes(partial),
      ),
  }
}
