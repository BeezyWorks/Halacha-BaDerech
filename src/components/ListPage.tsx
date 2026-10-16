import {
  Header,
  RtlScope,
  Screen,
  Stack,
  Text,
  useIsWideWebNav,
  useScreenBottomInset,
} from '@beezyworks/design'
import React, { useCallback } from 'react'
import { FlatList } from 'react-native'

interface ListPageProps<T> {
  title: string
  /** A tab's root page: the title set large in the display serif above the list. */
  display?: boolean
  onBack?: () => void
  /** Everything above the rows (search bar, tiles, notes). Keep it a stable element. */
  header?: React.ReactNode
  /** Shown instead of rows when `data` is empty. */
  empty?: React.ReactNode
  data: readonly T[]
  keyExtractor: (item: T) => string
  renderItem: (item: T, index: number) => React.ReactElement
}

/** `PageLayout`'s sibling for long lists: the same `Screen` + title, but the
 * rows sit in a virtualized `FlatList` (a siman list has up to 697 of them)
 * rather than a `ScrollStack`. */
export function ListPage<T>({
  title,
  display,
  onBack,
  header,
  empty,
  data,
  keyExtractor,
  renderItem,
}: ListPageProps<T>) {
  const wide = useIsWideWebNav()
  const bottomInset = useScreenBottomInset()
  const render = useCallback(
    ({ item, index }: { item: T; index: number }) => (
      <Stack paddingHorizontal="md">{renderItem(item, index)}</Stack>
    ),
    [renderItem],
  )
  return (
    <Screen width={display ? 'content' : undefined}>
      {display ? null : <Header title={title} onBack={onBack} wide={wide} />}
      <FlatList
        data={data}
        keyExtractor={keyExtractor}
        renderItem={render}
        keyboardShouldPersistTaps="handled"
        initialNumToRender={24}
        windowSize={9}
        ListHeaderComponent={
          <Stack padding="md" gap="lg">
            {display ? (
              <RtlScope>
                <Stack paddingHorizontal="sm" paddingTop="md">
                  <Text variant="displayMedium">{title}</Text>
                </Stack>
              </RtlScope>
            ) : null}
            {header}
          </Stack>
        }
        ListEmptyComponent={empty ? <Stack padding="md">{empty}</Stack> : null}
        ListFooterComponent={<Stack height={bottomInset + 24} />}
      />
    </Screen>
  )
}
