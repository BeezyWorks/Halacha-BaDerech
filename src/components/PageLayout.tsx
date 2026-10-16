import {
  Header,
  type HeaderAction,
  RtlScope,
  Screen,
  ScrollStack,
  Stack,
  Text,
  useIsWideWebNav,
} from '@beezyworks/design'
import React from 'react'
import type { ScrollView } from 'react-native'

interface PageLayoutProps {
  title: string
  subtitle?: string
  onBack?: () => void
  onTitlePress?: () => void
  actions?: HeaderAction[]
  /** A tab's root page: the title set large in the display serif at the
   * top of the scrolling column (as the siddur's Books tab), instead of a
   * header bar. */
  display?: boolean
  /** The long-form reading column (wider than a menu's). */
  reader?: boolean
  /** The page's ScrollView, for scrolling to a section. */
  scrollRef?: React.Ref<ScrollView>
  children: React.ReactNode
}

/** Every screen: the DL `Screen` + `Header` (or a display title) over a
 * scrolling column. */
export function PageLayout({
  title,
  subtitle,
  onBack,
  onTitlePress,
  actions,
  display,
  reader,
  scrollRef,
  children,
}: PageLayoutProps) {
  const wide = useIsWideWebNav()
  return (
    <Screen width={reader ? 'reader' : display ? 'content' : undefined}>
      {display ? null : (
        <Header
          title={title}
          subtitle={subtitle}
          onBack={onBack}
          onTitlePress={onTitlePress}
          actions={actions}
          wide={wide}
        />
      )}
      <ScrollStack scrollRef={scrollRef} padding="md" gap="lg" keyboardShouldPersistTaps="handled">
        {display ? (
          <RtlScope>
            <Stack paddingHorizontal="sm" paddingTop="md">
              <Text variant="displayMedium">{title}</Text>
            </Stack>
          </RtlScope>
        ) : null}
        <Stack gap="lg">{children}</Stack>
      </ScrollStack>
    </Screen>
  )
}
