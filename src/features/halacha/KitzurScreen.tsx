import React from 'react'

import { ComingSoon } from '@/components/ComingSoon'
import { TestLinks } from './components/TestLinks'

export function KitzurScreen() {
  return (
    <ComingSoon title="קיצור שולחן ערוך" subtitle="The Kitzur Shulchan Aruch.">
      <TestLinks links={[{ title: 'קיצור שולחן ערוך א', sefer: 'kitzur', siman: 1 }]} />
    </ComingSoon>
  )
}
