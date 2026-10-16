import React from 'react'

import { SimanList } from './components/SimanList'

const SCOPE = ['kitzur']

/** `/kitzur`: the 221 simanim of the Kitzur Shulchan Aruch. */
export function KitzurScreen() {
  return (
    <SimanList
      scope={SCOPE}
      title="קיצור שולחן ערוך"
      display
      placeholder="חיפוש · Search simanim"
    />
  )
}
