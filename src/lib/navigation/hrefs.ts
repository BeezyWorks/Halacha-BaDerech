import type { LastLocation } from '@/features/history/store/historyStore'

/** A siman's reader, optionally scrolled to (and opening) one seif. Every sefer has its own route. */
export function simanHref(sefer: string, siman: number, seif?: number) {
  const params = { siman: String(siman), ...(seif ? { seif: String(seif) } : {}) }
  switch (sefer) {
    case 'mb':
      return { pathname: '/mishna-berura/[siman]', params } as const
    case 'kitzur':
      return { pathname: '/kitzur/[siman]', params } as const
    default:
      return { pathname: '/shulchan-aruch/[sefer]/[siman]', params: { sefer, ...params } } as const
  }
}

export const hrefFor = (location: LastLocation) =>
  simanHref(location.sefer, location.siman, location.seif)

/** Where "back" from a siman goes: the sefer's list (a chelek's own list for Shulchan Aruch). */
export const seferRootHref = (sefer: string) =>
  sefer === 'mb'
    ? ('/mishna-berura' as const)
    : sefer === 'kitzur'
      ? ('/kitzur' as const)
      : ({ pathname: '/shulchan-aruch/[sefer]', params: { sefer } } as const)
