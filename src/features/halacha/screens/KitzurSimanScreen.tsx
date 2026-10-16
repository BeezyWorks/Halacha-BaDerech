import { EmptyState } from '@beezyworks/design'
import { useLocalSearchParams, useRouter } from 'expo-router'
import React from 'react'

import { PageLayout } from '@/components/PageLayout'
import { SeifListReader } from '../components/SeifListReader'
import { SimanPage } from '../components/SimanPage'
import { seferById } from '../data/catalog'

/** `/kitzur/[siman]?seif=n` */
export function KitzurSimanScreen() {
  const router = useRouter()
  const params = useLocalSearchParams<{ siman: string; seif?: string }>()
  const siman = Number(params.siman)
  if (!Number.isInteger(siman) || siman < 1 || siman > (seferById('kitzur')?.simanim ?? 0)) {
    return (
      <PageLayout title="קיצור שולחן ערוך" onBack={() => router.dismissTo('/kitzur')}>
        <EmptyState title="הסימן לא נמצא" subtitle="Siman not found." />
      </PageLayout>
    )
  }
  const seif = Number(params.seif) || undefined
  return (
    <SimanPage key={siman} sefer="kitzur" siman={siman} initialSeif={seif}>
      {(ctx) => <SeifListReader {...ctx} initialSeif={seif} />}
    </SimanPage>
  )
}
