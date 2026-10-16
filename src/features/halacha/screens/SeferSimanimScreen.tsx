import { EmptyState } from '@beezyworks/design'
import { useLocalSearchParams, useRouter } from 'expo-router'
import React from 'react'

import { PageLayout } from '@/components/PageLayout'
import { SimanList } from '../components/SimanList'
import { coverageNote } from '../coverage'
import { seferById } from '../data/catalog'

const CHELAKIM = ['oc', 'yd', 'eh', 'cm']

/** `/shulchan-aruch/[sefer]`: one chelek's simanim, with headings and a search bar. */
export function SeferSimanimScreen() {
  const router = useRouter()
  const { sefer } = useLocalSearchParams<{ sefer: string }>()
  const info = CHELAKIM.includes(sefer) ? seferById(sefer) : undefined
  const back = () => router.dismissTo('/shulchan-aruch')
  if (!info) {
    return (
      <PageLayout title="שולחן ערוך" onBack={back}>
        <EmptyState title="החלק לא נמצא" subtitle="Chelek not found." />
      </PageLayout>
    )
  }
  return (
    <SimanList
      key={info.id}
      scope={[info.id]}
      title={info.he}
      onBack={back}
      placeholder="חיפוש · Search simanim"
      coverageNote={coverageNote(info.id)}
    />
  )
}
