import { SemanticColor, Stack, Text, Touchable } from '@beezyworks/design'
import React from 'react'

export interface Chip<K extends string> {
  key: K
  label: string
}

interface ChipStripProps<K extends string> {
  chips: Chip<K>[]
  selected?: K
  onSelect: (key: K) => void
}

/** A wrapping row of selectable chips (RTL order) — aliyos, chapters, typefaces. */
export function ChipStrip<K extends string>({ chips, selected, onSelect }: ChipStripProps<K>) {
  return (
    <Stack direction="rowReverse" wrap gap="sm">
      {chips.map((chip) => {
        const active = chip.key === selected
        return (
          <Touchable
            key={chip.key}
            onPress={() => onSelect(chip.key)}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
          >
            <Stack
              paddingHorizontal="md"
              paddingVertical="sm"
              radius="full"
              background={active ? SemanticColor.AccentTintSelected : SemanticColor.SurfaceCard}
              borderWidth={1}
              borderColor={active ? SemanticColor.AccentPrimary : SemanticColor.BorderDefault}
            >
              <Text
                variant="label"
                color={active ? SemanticColor.TextAccent : SemanticColor.TextPrimary}
              >
                {chip.label}
              </Text>
            </Stack>
          </Touchable>
        )
      })}
    </Stack>
  )
}
