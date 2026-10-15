import type { LastLocation } from '@/features/history/store/historyStore'

/** Each sefer's tab. Siman and seif screens are built in a later step; until
 * then every location opens its sefer's tab. */
export function hrefFor(location: LastLocation) {
  switch (location.sefer) {
    case 'mb':
      return '/mishna-berura' as const
    case 'kitzur':
      return '/kitzur' as const
    default:
      return '/shulchan-aruch' as const
  }
}
