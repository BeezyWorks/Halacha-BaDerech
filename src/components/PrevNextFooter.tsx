import { Button, Stack } from '@beezyworks/design'
import React from 'react'

interface PrevNextFooterProps {
  prev?: { label: string; onPress: () => void }
  next?: { label: string; onPress: () => void }
}

/** Hebrew order: "next" sits on the left, "previous" on the right. The arrows
 * are icons, not "‹ ›" in the title: inside a Hebrew label the bidi algorithm
 * moves and mirrors those characters. */
export function PrevNextFooter({ prev, next }: PrevNextFooterProps) {
  return (
    <Stack direction="row" justify="spaceBetween" gap="md" paddingVertical="lg">
      {next ? (
        <Button
          title={next.label}
          rtl
          variant="outline"
          icon="chevron-left"
          iconPosition="end"
          onPress={next.onPress}
        />
      ) : (
        <Stack />
      )}
      {prev ? (
        <Button
          title={prev.label}
          rtl
          variant="outline"
          icon="chevron-right"
          onPress={prev.onPress}
        />
      ) : (
        <Stack />
      )}
    </Stack>
  )
}
