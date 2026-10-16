import { useEffect, useMemo, useState } from 'react'

import { seferById } from '../data/catalog'
import { type SimanEntry, simanEntries } from '../search/searchSimanim'
import { simanRepository } from '../services/simanRepository'

/** Every siman of each sefer in `seferIds`, with headings from its `index.json` once loaded
 * (the lists render at once, then pick up their headings). Fetches nothing when `enabled` is false. */
export function useSimanEntries(seferIds: readonly string[], enabled = true) {
  const [titles, setTitles] = useState<Record<string, Map<number, string>>>({})
  const key = seferIds.join(',')

  useEffect(() => {
    if (!enabled) return
    let cancelled = false
    for (const id of key.split(',')) {
      simanRepository.getIndex(id).then((index) => {
        if (cancelled || !index) return
        const map = new Map<number, string>()
        for (const s of index.simanim) if (s.title) map.set(s.n, s.title)
        setTitles((t) => ({ ...t, [id]: map }))
      })
    }
    return () => {
      cancelled = true
    }
  }, [key, enabled])

  return useMemo(
    () =>
      Object.fromEntries(
        key
          .split(',')
          .filter(Boolean)
          .map((id) => [id, simanEntries(id, seferById(id)?.simanim ?? 0, titles[id])]),
      ) as Record<string, SimanEntry[]>,
    [key, titles],
  )
}
