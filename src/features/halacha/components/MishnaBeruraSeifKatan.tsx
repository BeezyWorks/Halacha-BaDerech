import { SemanticColor, Text } from '@beezyworks/design'
import React from 'react'

import type { Unit } from '../content/types'

interface Props {
  unit: Unit
  label: string
  onPress?: () => void
}

/** One seif katan of the Mishna Berura: "(א)", its dibur hamaschil in bold, then the rest. An empty `label` is unnumbered text (Wikisource `n: 0`). */
export const MishnaBeruraSeifKatan = React.memo(function MishnaBeruraSeifKatan({
  unit,
  label,
  onPress,
}: Props) {
  const dh = unit.dh && unit.text.startsWith(unit.dh) ? unit.dh : ''
  return (
    <Text content selectable={false} onPress={onPress}>
      {label ? (
        <Text content bold color={SemanticColor.TextMarker}>
          {`(${label}) `}
        </Text>
      ) : null}
      {dh ? (
        <Text content bold>
          {dh}
        </Text>
      ) : null}
      {unit.text.slice(dh.length)}
    </Text>
  )
})
