import {
  GlassSurface,
  Icon,
  type IconName,
  SemanticColor,
  Text,
  ThemeScope,
  Touchable,
} from '@beezyworks/design'
import React from 'react'

interface GlassTileProps {
  icon: IconName
  title: string
  /** A short detail under the title. */
  detail?: string
  onPress: () => void
  /** The one to open first: frosted light glass with an accent icon,
   * instead of the smoky glass around it. */
  current?: boolean
}

const HEIGHT = 104

/** A button over the home photo: an icon over a title (and a detail), in glass. Ported from the siddur's `TefilaTile`. */
export function GlassTile({ icon, title, detail, onPress, current }: GlassTileProps) {
  return (
    <ThemeScope mode={current ? 'light' : 'dark'}>
      <Touchable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={detail ? `${title} · ${detail}` : title}
      >
        <GlassSurface
          radius="lg"
          height={HEIGHT}
          align="center"
          justify="center"
          gap="xs"
          paddingHorizontal="xs"
          raised={current}
        >
          <Icon
            name={icon}
            size={26}
            color={current ? SemanticColor.AccentPrimary : SemanticColor.TextPrimary}
          />
          <Text variant="itemHeader" align="center" numberOfLines={1}>
            {title}
          </Text>
          {detail ? (
            <Text variant="detail" align="center" numberOfLines={1}>
              {detail}
            </Text>
          ) : null}
        </GlassSurface>
      </Touchable>
    </ThemeScope>
  )
}
