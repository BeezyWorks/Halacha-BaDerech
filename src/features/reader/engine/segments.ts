import type { ReaderAnchor, ReaderMark, Run, SpanAnchor, WorkStyle } from './types'

/** Key of the comment an anchor opens; `unit` is the seif the comment is on. */
export const commentKey = (work: string, unit: number, sk: number) => `${work}/${unit}/${sk}`

/** Words to highlight for an anchor with no known end. */
const IMPLICIT_WORDS = 2

/** End of the next `IMPLICIT_WORDS` words from `at` — the stand-in dibur hamaschil. */
export function implicitEnd(text: string, at: number): number {
  let i = Math.min(Math.max(at, 0), text.length)
  for (let word = 0; word < IMPLICIT_WORDS; word++) {
    while (i < text.length && /\s/.test(text[i])) i++
    if (i >= text.length) break
    while (i < text.length && !/\s/.test(text[i])) i++
  }
  return i
}

/**
 * The anchors to draw for a unit: only those of enabled works (`styleOf`
 * returns undefined for the rest) that have a comment (`labelOf` returns
 * undefined otherwise), with open-ended ones given a stand-in end. Sorted by
 * position, then by work order.
 */
export function visibleAnchors(
  unit: { n: number; text: string; anchors?: ReaderAnchor[] },
  styleOf: (work: string) => WorkStyle | undefined,
  labelOf: (anchor: ReaderAnchor) => string | undefined,
): SpanAnchor[] {
  const len = unit.text.length
  const spans: SpanAnchor[] = []
  for (const a of unit.anchors ?? []) {
    const style = styleOf(a.work)
    const label = style && labelOf(a)
    if (!style || label === undefined) continue
    const start = Math.min(Math.max(a.at, 0), len)
    const end =
      a.end !== undefined && a.end > start ? Math.min(a.end, len) : implicitEnd(unit.text, start)
    spans.push({
      key: commentKey(a.work, unit.n, a.sk),
      work: a.work,
      sk: a.sk,
      start,
      end,
      label,
      color: style.color,
      order: style.order,
    })
  }
  return spans.sort((x, y) => x.start - y.start || x.order - y.order || x.sk - y.sk)
}

/**
 * Splits a unit's text at every mark and span boundary into runs. Each run
 * knows if it is inside a hagah, which span it is highlighted for (where
 * spans overlap, the narrowest wins, then the earliest work) and which labels
 * to draw after it (the spans that end there). Runs that would render
 * identically are merged, so a long seif is a handful of nodes.
 */
export function buildRuns(text: string, marks: ReaderMark[] = [], spans: SpanAnchor[] = []): Run[] {
  const len = text.length
  if (len === 0) return []
  const cuts = new Set<number>([0, len])
  const clamp = (n: number) => Math.min(Math.max(n, 0), len)
  for (const m of marks) {
    cuts.add(clamp(m.start))
    cuts.add(clamp(m.end))
  }
  for (const s of spans) {
    cuts.add(s.start)
    cuts.add(s.end)
  }
  const points = [...cuts].sort((a, b) => a - b)
  const hagot = marks.filter((m) => m.kind === 'hagah')

  const runs: Run[] = []
  for (let i = 0; i < points.length - 1; i++) {
    const a = points[i]
    const b = points[i + 1]
    let span: SpanAnchor | undefined
    for (const s of spans) {
      if (s.start > a || s.end < b) continue
      if (
        !span ||
        s.end - s.start < span.end - span.start ||
        (s.end - s.start === span.end - span.start && s.order < span.order)
      ) {
        span = s
      }
    }
    runs.push({
      text: text.slice(a, b),
      hagah: hagot.some((m) => m.start <= a && b <= m.end),
      span,
      labels: spans.filter((s) => s.end === b),
    })
  }

  const merged: Run[] = []
  for (const run of runs) {
    const prev = merged[merged.length - 1]
    if (prev && prev.labels.length === 0 && prev.hagah === run.hagah && prev.span === run.span) {
      prev.text += run.text
      prev.labels = run.labels
    } else {
      merged.push({ ...run })
    }
  }
  return merged
}
