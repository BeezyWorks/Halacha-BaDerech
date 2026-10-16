import { seferById } from './data/catalog'

/** Does the sefer have content for this siman? (Some are not on Sefaria: see the catalog's `coverage`.) */
export function isCovered(sefer: string, siman: number): boolean {
  const info = seferById(sefer)
  if (!info || !Number.isInteger(siman) || siman < 1 || siman > info.simanim) return false
  return !info.coverage || info.coverage.some(([from, to]) => siman >= from && siman <= to)
}

/** The next (`1`) or previous (`-1`) siman that has content, skipping gaps. */
export function adjacentSiman(sefer: string, siman: number, direction: 1 | -1): number | undefined {
  const info = seferById(sefer)
  if (!info) return undefined
  for (let n = siman + direction; n >= 1 && n <= info.simanim; n += direction) {
    if (isCovered(sefer, n)) return n
  }
  return undefined
}
