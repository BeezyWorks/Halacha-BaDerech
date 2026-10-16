import { useRouter } from 'expo-router'
import React from 'react'

import { SimanList } from './components/SimanList'

const CHELAKIM = ['oc', 'yd', 'eh', 'cm'] as const

/** `/shulchan-aruch`: the four chelakim as tiles; searching lists simanim across all of them. */
export function ShulchanAruchScreen() {
  const router = useRouter()
  return (
    <SimanList
      scope={CHELAKIM}
      title="שולחן ערוך"
      display
      placeholder="חיפוש · Search simanim (שכח, oc 328)"
      onOpenSefer={(sefer) =>
        router.push({ pathname: '/shulchan-aruch/[sefer]', params: { sefer } })
      }
    />
  )
}
