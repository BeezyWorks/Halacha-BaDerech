import {
  Divider,
  ScrollStack,
  SemanticColor,
  SplitPane,
  Stack,
  Text,
  Touchable,
} from '@beezyworks/design'
import React, { useCallback, useEffect, useRef, useState } from 'react'

import { usePreferencesStore } from '../../settings/store/preferencesStore'
import { useScrollRegistry } from '../hooks/useScrollRegistry'
import type { CommentGroup, ReaderComment, WorkColor } from '../engine/types'

export interface PanelWork {
  id: string
  name: string
  color: WorkColor
  enabled: boolean
}

interface CommentaryPanelProps {
  /** The pinned text. Call `focus(key)` to scroll to a comment (its `commentKey`). */
  renderTop: (focus: (key: string) => void) => React.ReactNode
  groups: CommentGroup[]
  nameOf: (work: string) => string
  /** Comment to scroll to and flash when the panel opens. */
  initialFocus?: string
  /** Works with comments here, to switch on or off. */
  works?: PanelWork[]
  onToggleWork?: (work: string) => void
  /** Shown when no commentary is visible. */
  emptyText?: string
  /** Below the commentary: notes. */
  children?: React.ReactNode
}

const FLASH_MS = 1800

/**
 * The commentary panel: the unit's text pinned on top (resizable, like the
 * pasuk panel), then each work's comments under a heading in the work's
 * color, then whatever the app adds (notes). One engine for any app: it only
 * knows groups of comments.
 */
export function CommentaryPanel({
  renderTop,
  groups,
  nameOf,
  initialFocus,
  works,
  onToggleWork,
  emptyText,
  children,
}: CommentaryPanelProps) {
  const paneRatio = usePreferencesStore((s) => s.seifPaneRatio)
  const setPaneRatio = usePreferencesStore((s) => s.setSeifPaneRatio)
  const { scrollRef, register, scrollToKeys } = useScrollRegistry()
  const [flash, setFlash] = useState<string | undefined>(initialFocus)
  const flashTimer = useRef<ReturnType<typeof setTimeout>>(undefined)

  const focus = useCallback(
    (key: string) => {
      setFlash(key)
      clearTimeout(flashTimer.current)
      flashTimer.current = setTimeout(() => setFlash(undefined), FLASH_MS)
      // Layouts of a freshly opened sheet settle a moment after mount.
      const work = key.split('/')[0]
      const go = () => scrollToKeys([`group:${work}`, key])
      if (!go()) setTimeout(go, 150)
      else setTimeout(go, 350)
    },
    [scrollToKeys],
  )

  useEffect(() => {
    if (initialFocus) focus(initialFocus)
    return () => clearTimeout(flashTimer.current)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only on open
  }, [])

  return (
    <Stack fill>
      <SplitPane ratio={paneRatio} onRatioChange={setPaneRatio} top={renderTop(focus)}>
        <ScrollStack scrollRef={scrollRef} grow padding="md" gap="lg">
          {works && works.length > 0 && onToggleWork ? (
            <Stack direction="rowReverse" wrap gap="sm">
              {works.map((work) => (
                <Touchable
                  key={work.id}
                  onPress={() => onToggleWork(work.id)}
                  accessibilityRole="button"
                  accessibilityState={{ selected: work.enabled }}
                >
                  <Stack
                    paddingHorizontal="md"
                    paddingVertical="xs"
                    radius="full"
                    borderWidth={1}
                    borderColor={work.enabled ? work.color.text : SemanticColor.BorderDefault}
                    background={work.enabled ? work.color.tint : SemanticColor.SurfaceCard}
                  >
                    <Text
                      variant="label"
                      color={work.enabled ? work.color.text : SemanticColor.TextSecondary}
                    >
                      {work.name}
                    </Text>
                  </Stack>
                </Touchable>
              ))}
            </Stack>
          ) : null}

          {groups.map((group) => (
            <Stack
              key={group.work}
              gap="sm"
              onLayout={(e) => register(`group:${group.work}`, e.nativeEvent.layout.y)}
            >
              <Text variant="itemHeader" color={group.color.text} align="right">
                {nameOf(group.work)}
              </Text>
              {group.comments.map((c: ReaderComment) => {
                const key = `${group.work}/${c.seif}/${c.sk}`
                return (
                  <Stack
                    key={key}
                    padding="xs"
                    radius="sm"
                    background={flash === key ? group.color.tint : undefined}
                    onLayout={(e) => register(key, e.nativeEvent.layout.y)}
                  >
                    <Text content secondary>
                      <Text content secondary bold color={group.color.text}>
                        {`${c.label} `}
                      </Text>
                      {c.dh ? (
                        <Text content secondary bold color={group.color.text}>
                          {`${c.dh} `}
                        </Text>
                      ) : null}
                      {c.text}
                    </Text>
                  </Stack>
                )
              })}
            </Stack>
          ))}

          {groups.length === 0 && emptyText ? (
            <Text variant="detail" align="right">
              {emptyText}
            </Text>
          ) : null}

          {children ? (
            <>
              <Divider />
              {children}
            </>
          ) : null}
        </ScrollStack>
      </SplitPane>
    </Stack>
  )
}
