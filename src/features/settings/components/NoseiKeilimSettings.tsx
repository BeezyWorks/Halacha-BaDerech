import { Stack, ToggleSetting } from '@beezyworks/design'
import React from 'react'

import { noseiKeilimOf } from '../../halacha/data/catalog'
import { workColor } from '../../halacha/colors'
import { useCommentaryStore, useEnabledWorks } from '../store/commentaryStore'

const SWATCH_SIZE = 14

/** Show/hide switches for one sefer's nosei keilim, in catalog order, each beside a swatch of
 * the color its comments are drawn in (Shulchan Aruch's chelakim and the Mishna Berura are set separately). */
export function NoseiKeilimSettings({ sefer }: { sefer: string }) {
  const enabled = useEnabledWorks(sefer)
  const toggle = useCommentaryStore((s) => s.toggleWork)
  return (
    <>
      {noseiKeilimOf(sefer).map((w) => (
        <Stack key={w.id} direction="row" align="center" gap="sm">
          <Stack
            width={SWATCH_SIZE}
            height={SWATCH_SIZE}
            radius="full"
            background={workColor(w.id).text}
          />
          <Stack grow width={0}>
            <ToggleSetting
              title={`${w.he} · ${w.en}`}
              enabled={enabled.includes(w.id)}
              onSwitch={() => toggle(sefer, w.id)}
            />
          </Stack>
        </Stack>
      ))}
    </>
  )
}
