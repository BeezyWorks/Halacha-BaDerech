import { EmptyState, ScreenLoader, Stack, Text, formatGematriya, spacing } from '@beezyworks/design'
import { useRouter } from 'expo-router'
import React, { useCallback, useEffect } from 'react'

import { PageLayout } from '@/components/PageLayout'
import { PrevNextFooter } from '@/components/PrevNextFooter'
import { seferRootHref, simanHref } from '@/lib/navigation/hrefs'
import { useHistoryStore } from '../../history/store/historyStore'
import { useScrollRegistry } from '../../reader/hooks/useScrollRegistry'
import type { SimanBundle } from '../content/types'
import { adjacentSiman, isCovered } from '../coverage'
import { useSiman } from '../hooks/useSiman'
import { seferName } from '../types'

export interface SimanContext {
  bundle: SimanBundle
  /** Registers a block's y (from `onLayout`) for `scrollTo`. */
  register: (key: string, y: number) => void
  /** Scrolls to a block of the siman body, addressed by the keys of its ancestors (see `useScrollRegistry`). */
  scrollTo: (keys: string[]) => boolean
}

interface SimanPageProps {
  sefer: string
  siman: number
  /** Opens at this seif (the screen decides what that means). */
  initialSeif?: number
  children: (context: SimanContext) => React.ReactNode
}

/** "דין השכמת הבוקר. ובו ט סעיפים:" → without the closing colon. */
const cleanTitle = (title?: string) => title?.replace(/[:\s]+$/, '')

/**
 * The frame every siman reader shares: header, the siman's heading, loading
 * and "not available" states, and the previous/next-siman footer (which skips
 * simanim the sefer has no content for). The body is the reader's own.
 */
export function SimanPage({ sefer, siman, initialSeif, children }: SimanPageProps) {
  const router = useRouter()
  const state = useSiman(sefer, siman)
  const { scrollRef, register, scrollToKeys } = useScrollRegistry()
  const setLastLocation = useHistoryStore((s) => s.setLastLocation)
  const covered = isCovered(sefer, siman)

  useEffect(() => {
    if (state.status === 'ready') setLastLocation({ sefer, siman, seif: initialSeif ?? 1 })
    // eslint-disable-next-line react-hooks/exhaustive-deps -- record the visit, not each seif param change
  }, [state.status, sefer, siman])

  // The body is the second child of the root column, inside the page's padding.
  const scrollTo = useCallback(
    (keys: string[]) => scrollToKeys(['body', ...keys], spacing.md),
    [scrollToKeys],
  )

  const go = (n: number) => router.replace(simanHref(sefer, n))
  const prev = adjacentSiman(sefer, siman, -1)
  const next = adjacentSiman(sefer, siman, 1)
  const siman_ = formatGematriya(siman)

  return (
    <PageLayout
      reader
      title={seferName(sefer)}
      scrollRef={scrollRef}
      onBack={() => router.dismissTo(seferRootHref(sefer))}
    >
      <Stack gap="lg">
        {state.status === 'ready' ? (
          <Stack gap="xs" paddingHorizontal="sm">
            <Text variant="pageHeader" align="right">{`סימן ${siman_}`}</Text>
            {state.bundle.title ? (
              <Text variant="detail" align="right">
                {cleanTitle(state.bundle.title)}
              </Text>
            ) : null}
          </Stack>
        ) : null}

        <Stack onLayout={(e) => register('body', e.nativeEvent.layout.y)}>
          {state.status === 'loading' ? <ScreenLoader /> : null}
          {state.status === 'missing' ? (
            <EmptyState
              title={covered ? 'הטקסט לא נטען' : `סימן ${siman_} עדיין אינו זמין`}
              subtitle={
                covered
                  ? "Couldn't load this siman. Check your connection and try again."
                  : "This siman isn't available yet."
              }
            />
          ) : null}
          {state.status === 'ready' ? children({ bundle: state.bundle, register, scrollTo }) : null}
        </Stack>

        <PrevNextFooter
          prev={
            prev ? { label: `סימן ${formatGematriya(prev)}`, onPress: () => go(prev) } : undefined
          }
          next={
            next ? { label: `סימן ${formatGematriya(next)}`, onPress: () => go(next) } : undefined
          }
        />
      </Stack>
    </PageLayout>
  )
}
