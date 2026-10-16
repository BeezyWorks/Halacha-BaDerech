import { SemanticColor, Stack, formatGematriya } from '@beezyworks/design'
import React, { useMemo } from 'react'

import { UnitText } from '../../reader/components/UnitText'
import type { Run, SpanAnchor } from '../../reader/engine/types'
import { useCommentaryStore } from '../../settings/store/commentaryStore'
import type { Unit } from '../content/types'
import { useMarkedSeifim, useOpenInitialSeif } from '../hooks/useSeifReaderEffects'
import { type SeifTarget, useSeifSelection } from '../hooks/useSeifSelection'
import { mbBaseRuns } from '../runs'
import { MishnaBeruraSeifKatan } from './MishnaBeruraSeifKatan'
import type { SimanContext } from './SimanPage'

interface MbSeifBlockProps {
  base: Unit
  seifimKatanim: Unit[]
  remaInRashi: boolean
  selected: boolean
  marked: boolean
  open: (target: SeifTarget) => void
  register: SimanContext['register']
  scrollTo: SimanContext['scrollTo']
}

/** One Orach Chaim seif (quiet, its MB spans highlighted) followed by the Mishna Berura's seifim katanim on it. */
const MbSeifBlock = React.memo(function MbSeifBlock({
  base,
  seifimKatanim,
  remaInRashi,
  selected,
  marked,
  open,
  register,
  scrollTo,
}: MbSeifBlockProps) {
  const runs: Run[] = useMemo(() => mbBaseRuns(base, seifimKatanim), [base, seifimKatanim])
  const key = `seif:${base.n}`
  return (
    <Stack
      gap="sm"
      padding="xs"
      radius="sm"
      background={selected ? SemanticColor.AccentTint : undefined}
      onLayout={(e) => register(key, e.nativeEvent.layout.y)}
    >
      <UnitText
        muted
        runs={runs}
        label={`${marked ? '• ' : ''}${formatGematriya(base.n)}`}
        hagahInRashi={remaInRashi}
        onPress={() => open({ seif: base.n })}
        onPressSpan={(span: SpanAnchor) => scrollTo([key, `sk:${span.sk}`])}
      />
      {seifimKatanim.map((sk) => (
        <Stack key={sk.n} onLayout={(e) => register(`sk:${sk.n}`, e.nativeEvent.layout.y)}>
          <MishnaBeruraSeifKatan
            unit={sk}
            label={formatGematriya(sk.n)}
            onPress={() => open({ seif: base.n, sk: sk.n })}
          />
        </Stack>
      ))}
    </Stack>
  )
})

/**
 * The Mishna Berura's siman: for each Orach Chaim seif, the seif itself
 * (small, with the words the MB comments on highlighted — tap one to jump to
 * that seif katan) and then the MB's seifim katanim as the main text. Tapping
 * a seif katan opens the Biur Halacha for the seif.
 */
export function MishnaBeruraReader({
  bundle,
  scrollTo,
  register,
  initialSeif,
}: SimanContext & { initialSeif?: number }) {
  const remaInRashi = useCommentaryStore((s) => s.remaInRashi)
  const { selected, open } = useSeifSelection(bundle)

  const bySeif = useMemo(() => {
    const map = new Map<number, Unit[]>()
    for (const sk of bundle.seifim) {
      const seif = sk.saSeif ?? 0
      map.set(seif, [...(map.get(seif) ?? []), sk])
    }
    return map
  }, [bundle.seifim])
  const bases = useMemo(() => bundle.base ?? [], [bundle.base])

  const marked = useMarkedSeifim(bundle)
  useOpenInitialSeif(bundle, initialSeif, scrollTo, open)

  return (
    <Stack gap="lg">
      {bases.map((base) => (
        <MbSeifBlock
          key={base.n}
          base={base}
          seifimKatanim={bySeif.get(base.n) ?? EMPTY}
          remaInRashi={remaInRashi}
          selected={selected === base.n}
          marked={marked.has(base.n)}
          open={open}
          register={register}
          scrollTo={scrollTo}
        />
      ))}
    </Stack>
  )
}

const EMPTY: Unit[] = []
