import React from 'react'

import { ComingSoon } from '@/components/ComingSoon'
import { TestLinks } from './components/TestLinks'

export function ShulchanAruchScreen() {
  return (
    <ComingSoon
      title="שולחן ערוך"
      subtitle="Orach Chaim, Yoreh Deah, Even HaEzer and Choshen Mishpat, with nosei keilim."
    >
      <TestLinks
        links={[
          { title: 'אורח חיים א', sefer: 'oc', siman: 1 },
          { title: 'אורח חיים שכח', sefer: 'oc', siman: 328 },
          { title: 'יורה דעה קסח', sefer: 'yd', siman: 168 },
          { title: 'אבן העזר א', sefer: 'eh', siman: 1 },
          { title: 'חושן משפט כה', sefer: 'cm', siman: 25 },
        ]}
      />
    </ComingSoon>
  )
}
