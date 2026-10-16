import React from 'react'

import { SimanList } from './components/SimanList'
import { coverageNote } from './coverage'

const SCOPE = ['mb']

/** `/mishna-berura`: every siman of Orach Chaim, those without text dimmed. */
export function MishnaBeruraScreen() {
  return (
    <SimanList
      scope={SCOPE}
      title="משנה ברורה"
      display
      placeholder="חיפוש · Search simanim"
      coverageNote={coverageNote('mb')}
    />
  )
}
