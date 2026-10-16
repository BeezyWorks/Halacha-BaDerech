import { SemanticColor, Text } from '@beezyworks/design'
import React from 'react'

import type { Run, SpanAnchor } from '../engine/types'

interface UnitTextProps {
  runs: Run[]
  /** A leading mark, e.g. the seif's Hebrew letter. */
  label?: string
  /** Quieter, smaller type for text that is context rather than the thing being read. */
  muted?: boolean
  /** Hagah runs in ktav Rashi (else just smaller regular type). */
  hagahInRashi?: boolean
  onPress?: () => void
  onPressSpan?: (span: SpanAnchor) => void
}

/**
 * One unit's text as running Hebrew: hagah runs set apart, commentary spans
 * underlined and tinted in their work's color with a small raised label after
 * them. Spans and the unit are nested `Text`s (not buttons), so tapping a
 * span runs its handler and not the unit's — on RN and RN Web alike.
 */
export const UnitText = React.memo(function UnitText({
  runs,
  label,
  muted,
  hagahInRashi = true,
  onPress,
  onPressSpan,
}: UnitTextProps) {
  const color = muted ? SemanticColor.TextSecondary : undefined
  return (
    <Text content secondary={muted} selectable={false} color={color} onPress={onPress}>
      {label ? (
        <Text content secondary={muted} bold color={SemanticColor.TextMarker}>
          {`${label} `}
        </Text>
      ) : null}
      {runs.map((run, i) => (
        <React.Fragment key={i}>
          <Text
            content
            secondary={muted || (run.hagah && !hagahInRashi)}
            rashiScript={run.hagah && hagahInRashi}
            color={color}
            underline={run.span?.color.text}
            highlight={run.span?.color.tint}
            onPress={run.span && onPressSpan ? () => onPressSpan(run.span!) : undefined}
          >
            {run.text}
          </Text>
          {run.labels.map((span) => (
            <Text
              key={span.key}
              content
              superscript
              bold
              color={span.color.text}
              onPress={onPressSpan ? () => onPressSpan(span) : undefined}
            >
              {` ${span.label} `}
            </Text>
          ))}
        </React.Fragment>
      ))}
    </Text>
  )
})
