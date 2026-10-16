import { seferById } from './data/catalog'
import { gematria } from './content/parse'

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

/** A line about gaps in a sefer's text ("…simanim קפז–תקפז and תקפט–תרצז"), or undefined when it is complete. */
export function coverageNote(sefer: string): string | undefined {
  const info = seferById(sefer)
  if (!info?.coverage) return undefined
  // Many scattered gaps: list the count, not the ranges.
  const have = info.coverage.reduce((n, [from, to]) => n + to - from + 1, 0)
  const where =
    info.coverage.length > 4
      ? `${have} of ${info.simanim} simanim`
      : `simanim ${info.coverage
          .map(([from, to]) => (from === to ? gematria(from) : `${gematria(from)}–${gematria(to)}`))
          .join(' and ')}`
  const bhOnly = info.versions
    ? ' Where the Mishna Berura itself is missing, the Orach Chaim seifim are shown with the Biur Halacha.'
    : ''
  return `Text available for ${where}; the others are shown dimmed.${bhOnly}`
}
