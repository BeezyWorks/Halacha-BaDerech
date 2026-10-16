import { loadContent } from '../../reader/services/contentRepository'
import type { SeferIndex, SimanBundle } from '../content/types'
import { isCovered } from '../coverage'

export const simanRepository = {
  /** One siman's bundle, or null when there is none (uncovered, or the fetch failed). */
  getSiman: (sefer: string, siman: number) =>
    isCovered(sefer, siman)
      ? loadContent<SimanBundle>(`${sefer}/${siman}.json`)
      : Promise.resolve(null),

  getIndex: (sefer: string) => loadContent<SeferIndex>(`${sefer}/index.json`),
}
