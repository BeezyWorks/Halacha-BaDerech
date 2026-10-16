import { EmptyState } from '@beezyworks/design'
import { useLocalSearchParams, useRouter } from 'expo-router'
import React from 'react'

import { PageLayout } from '@/components/PageLayout'
import { MishnaBeruraReader } from '../components/MishnaBeruraReader'
import { SimanPage } from '../components/SimanPage'
import { seferById } from '../data/catalog'

/** `/mishna-berura/[siman]?seif=n` */
export function MishnaBeruraSimanScreen() {
  const router = useRouter()
  const params = useLocalSearchParams<{ siman: string; seif?: string }>()
  const siman = Number(params.siman)
  if (!Number.isInteger(siman) || siman < 1 || siman > (seferById('mb')?.simanim ?? 0)) {
    return (
      <PageLayout title="משנה ברורה" onBack={() => router.dismissTo('/mishna-berura')}>
        <EmptyState title="הסימן לא נמצא" subtitle="Siman not found." />
      </PageLayout>
    )
  }
  const seif = Number(params.seif) || undefined
  return (
    <SimanPage key={siman} sefer="mb" siman={siman} initialSeif={seif}>
      {(ctx) => <MishnaBeruraReader {...ctx} initialSeif={seif} />}
    </SimanPage>
  )
}
