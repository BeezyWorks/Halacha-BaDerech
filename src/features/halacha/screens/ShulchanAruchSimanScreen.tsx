import { EmptyState } from '@beezyworks/design'
import { useLocalSearchParams, useRouter } from 'expo-router'
import React from 'react'

import { PageLayout } from '@/components/PageLayout'
import { SeifListReader } from '../components/SeifListReader'
import { SimanPage } from '../components/SimanPage'
import { seferById } from '../data/catalog'
import { seferName } from '../types'

const CHELAKIM = ['oc', 'yd', 'eh', 'cm']

/** `/shulchan-aruch/[sefer]/[siman]?seif=n` */
export function ShulchanAruchSimanScreen() {
  const router = useRouter()
  const params = useLocalSearchParams<{ sefer: string; siman: string; seif?: string }>()
  const siman = Number(params.siman)
  const valid =
    CHELAKIM.includes(params.sefer) &&
    Number.isInteger(siman) &&
    siman >= 1 &&
    siman <= (seferById(params.sefer)?.simanim ?? 0)
  if (!valid) {
    return (
      <PageLayout
        title={CHELAKIM.includes(params.sefer) ? seferName(params.sefer) : 'שולחן ערוך'}
        onBack={() => router.dismissTo('/shulchan-aruch')}
      >
        <EmptyState title="הסימן לא נמצא" subtitle="Siman not found." />
      </PageLayout>
    )
  }
  const seif = Number(params.seif) || undefined
  return (
    <SimanPage
      key={`${params.sefer}/${siman}`}
      sefer={params.sefer}
      siman={siman}
      initialSeif={seif}
    >
      {(ctx) => <SeifListReader {...ctx} initialSeif={seif} />}
    </SimanPage>
  )
}
