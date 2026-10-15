import type { LastLocation } from '../history/store/historyStore'
import { seifLabel } from '../halacha/types'

export function describeLocation(location: LastLocation): string {
  return seifLabel(location)
}
