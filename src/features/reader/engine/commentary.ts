import type { CommentGroup, ReaderComment, WorkColor } from './types'

/**
 * Groups the comments on one unit by work, in `order` (e.g. catalog order),
 * keeping only enabled works that have comments there. Comments within a
 * group are in sk order.
 */
export function groupComments<C extends ReaderComment>(
  commentary: Record<string, C[] | undefined>,
  unit: number,
  order: readonly string[],
  enabled: ReadonlySet<string>,
  colorOf: (work: string) => WorkColor,
): CommentGroup<C>[] {
  const groups: CommentGroup<C>[] = []
  for (const work of order) {
    if (!enabled.has(work)) continue
    const comments = (commentary[work] ?? [])
      .filter((c) => c.seif === unit)
      .sort((a, b) => a.sk - b.sk)
    if (comments.length) groups.push({ work, color: colorOf(work), comments })
  }
  return groups
}

/** The works (in `order`) that have at least one comment on a unit, enabled or not. */
export function worksWithComments(
  commentary: Record<string, ReaderComment[] | undefined>,
  unit: number,
  order: readonly string[],
): string[] {
  return order.filter((work) => commentary[work]?.some((c) => c.seif === unit))
}

/** `commentary[work]` indexed by `seif/sk`, for resolving an anchor to its comment. */
export function indexComments<C extends ReaderComment>(
  commentary: Record<string, C[] | undefined>,
): Map<string, C> {
  const index = new Map<string, C>()
  for (const [work, comments] of Object.entries(commentary)) {
    for (const c of comments ?? []) index.set(`${work}/${c.seif}/${c.sk}`, c)
  }
  return index
}
