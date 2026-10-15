import { Divider, IconButton, SemanticColor, Stack, Text, Touchable } from '@beezyworks/design'
import React from 'react'

interface LocationRowProps {
  title: string
  subtitle?: string
  onPress: () => void
  onDelete: () => void
  deleteLabel: string
  /** Omits the bottom divider — set on the last row in a list. */
  isLast?: boolean
}

/**
 * A bookmark/note row. The open-target and the delete button are siblings,
 * not nested: RN Web renders both as <button>, and a <button> inside a
 * <button> is invalid HTML with undefined click handling (the mishna app
 * hit the same thing — see its MishnaLine).
 */
export function LocationRow({
  title,
  subtitle,
  onPress,
  onDelete,
  deleteLabel,
  isLast,
}: LocationRowProps) {
  return (
    <Stack>
      <Stack direction="row" align="center" gap="sm" paddingVertical="sm">
        <IconButton
          name="delete"
          size={18}
          color={SemanticColor.TextSecondary}
          accessibilityLabel={deleteLabel}
          onPress={onDelete}
        />
        <Stack grow>
          <Touchable onPress={onPress} accessibilityRole="button" accessibilityLabel={title}>
            <Stack gap="xs" paddingVertical="xs">
              <Text variant="itemHeader" align="right">
                {title}
              </Text>
              {subtitle ? (
                <Text variant="detail" numberOfLines={2}>
                  {subtitle}
                </Text>
              ) : null}
            </Stack>
          </Touchable>
        </Stack>
      </Stack>
      {isLast ? null : <Divider />}
    </Stack>
  )
}
