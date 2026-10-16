import { useMemo } from 'react'

import { useCommentaryStore, useEnabledWorks } from '../../settings/store/commentaryStore'
import type { Comment, SimanBundle } from '../content/types'
import { indexComments } from '../../reader/engine/commentary'

/** What the reading views need from the commentary settings, in stable references. */
export function useWorkSettings(bundle: SimanBundle) {
  const enabledList = useEnabledWorks(bundle.sefer)
  const enabled = useMemo(() => new Set(enabledList), [enabledList])
  const comments = useMemo(() => indexComments<Comment>(bundle.commentary), [bundle.commentary])
  const remaInRashi = useCommentaryStore((s) => s.remaInRashi)
  return { enabled, comments, remaInRashi }
}
