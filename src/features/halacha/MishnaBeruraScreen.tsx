import React from 'react'

import { ComingSoon } from '@/components/ComingSoon'
import { TestLinks } from './components/TestLinks'

export function MishnaBeruraScreen() {
  return (
    <ComingSoon title="משנה ברורה" subtitle="The Mishna Berura on Orach Chaim, with Biur Halacha.">
      <TestLinks
        links={[
          { title: 'משנה ברורה שכח', sefer: 'mb', siman: 328 },
          { title: 'משנה ברורה קצד (לא זמין)', sefer: 'mb', siman: 100 },
        ]}
      />
    </ComingSoon>
  )
}
