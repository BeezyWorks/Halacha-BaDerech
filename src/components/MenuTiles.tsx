import { Card, Grid, RtlScope, SemanticColor, Stack, Text } from '@beezyworks/design'
import React from 'react'

const TILE_HEIGHT = 52
const FEATURED_HEIGHT = 80

export interface MenuTile {
  key: string
  label: string
  onPress: () => void
}

interface TileGroupProps {
  /** A part of a sefer — a page-header title. */
  title?: string
  /** A group within it (נביאים ראשונים, תרי עשר) — a quiet serif line. */
  subtitle?: string
  tiles: MenuTile[]
  /** Default 3. */
  columns?: number
}

/** A titled grid of quiet tiles, right to left — the siddur's Books tab
 * layout for a menu of sefarim, parshiyos or haftaros. */
export function TileGroup({ title, subtitle, tiles, columns = 3 }: TileGroupProps) {
  return (
    <RtlScope>
      <Stack gap="xs">
        {title ? (
          <Stack paddingHorizontal="sm" paddingBottom="xs">
            <Text variant="pageHeader" color={SemanticColor.TextPrimary}>
              {title}
            </Text>
          </Stack>
        ) : null}
        {subtitle ? (
          <Stack paddingHorizontal="sm">
            <Text variant="bodySerif" color={SemanticColor.TextSecondary}>
              {subtitle}
            </Text>
          </Stack>
        ) : null}
        <Grid columns={columns} rtl>
          {tiles.map((tile) => (
            <Card
              key={tile.key}
              onPress={tile.onPress}
              accessibilityLabel={tile.label}
              padding="xs"
              radius="md"
              height={TILE_HEIGHT}
              align="center"
              justify="center"
            >
              <Text variant="item" align="center" numberOfLines={1}>
                {tile.label}
              </Text>
            </Card>
          ))}
        </Grid>
      </Stack>
    </RtlScope>
  )
}

export interface FeaturedTile extends MenuTile {
  /** A short detail, in the accent serif under the label. */
  note?: string
}

/** The larger tiles that lead a menu — a work or section. */
export function FeaturedTiles({ tiles }: { tiles: FeaturedTile[] }) {
  return (
    <RtlScope>
      <Grid columns={tiles.length > 1 ? 2 : 1} rtl>
        {tiles.map((tile) => (
          <Card
            key={tile.key}
            onPress={tile.onPress}
            accessibilityLabel={tile.note ? `${tile.label} · ${tile.note}` : tile.label}
            paddingHorizontal="md"
            paddingVertical="none"
            radius="lg"
            height={FEATURED_HEIGHT}
            justify="center"
            gap="xs"
          >
            <Text variant="itemHeader">{tile.label}</Text>
            {tile.note ? (
              <Text variant="bodySerif" color={SemanticColor.TextAccent} numberOfLines={1}>
                {tile.note}
              </Text>
            ) : null}
          </Card>
        ))}
      </Grid>
    </RtlScope>
  )
}
