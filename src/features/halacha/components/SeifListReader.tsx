import { SemanticColor, Stack, formatGematriya } from '@beezyworks/design'
import React, { useMemo } from 'react'

import { UnitText } from '../../reader/components/UnitText'
import type { Comment, Unit } from '../content/types'
import { useMarkedSeifim, useOpenInitialSeif } from '../hooks/useSeifReaderEffects'
import { type SeifTarget, useSeifSelection } from '../hooks/useSeifSelection'
import { useWorkSettings } from '../hooks/useWorkSettings'
import { seifRuns } from '../runs'
import type { SimanContext } from './SimanPage'

interface SeifBlockProps {
  unit: Unit
  enabled: ReadonlySet<string>
  comments: ReadonlyMap<string, Comment>
  remaInRashi: boolean
  selected: boolean
  marked: boolean
  open: (target: SeifTarget) => void
  register: SimanContext['register']
}

const SeifBlock = React.memo(function SeifBlock({
  unit,
  enabled,
  comments,
  remaInRashi,
  selected,
  marked,
  open,
  register,
}: SeifBlockProps) {
  const runs = useMemo(() => seifRuns(unit, enabled, comments), [unit, enabled, comments])
  return (
    <Stack
      padding="xs"
      radius="sm"
      background={selected ? SemanticColor.AccentTint : undefined}
      onLayout={(e) => register(`seif:${unit.n}`, e.nativeEvent.layout.y)}
    >
      <UnitText
        runs={runs}
        label={`${marked ? '• ' : ''}${formatGematriya(unit.n)}`}
        hagahInRashi={remaInRashi}
        onPress={() => open({ seif: unit.n })}
        onPressSpan={(span) => open({ seif: unit.n, focus: span.key })}
      />
    </Stack>
  )
})

/**
 * The reading view of a Shulchan Aruch / Kitzur siman: each seif a paragraph
 * with its letter, the Rema set apart, enabled nosei keilim color-coded in the
 * text. Tap a seif (or a highlighted span) for its panel.
 */
export function SeifListReader({
  bundle,
  scrollTo,
  register,
  initialSeif,
}: SimanContext & { initialSeif?: number }) {
  const { enabled, comments, remaInRashi } = useWorkSettings(bundle)
  const { selected, open } = useSeifSelection(bundle)

  const marked = useMarkedSeifim(bundle)
  useOpenInitialSeif(bundle, initialSeif, scrollTo, open)

  return (
    <Stack gap="md">
      {bundle.seifim.map((unit) => (
        <SeifBlock
          key={unit.n}
          unit={unit}
          enabled={enabled}
          comments={comments}
          remaInRashi={remaInRashi}
          selected={selected === unit.n}
          marked={marked.has(unit.n)}
          open={open}
          register={register}
        />
      ))}
    </Stack>
  )
}
