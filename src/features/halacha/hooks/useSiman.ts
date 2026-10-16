import { useEffect, useState } from 'react'

import type { SimanBundle } from '../content/types'
import { simanRepository } from '../services/simanRepository'

export type SimanState =
  { status: 'loading' } | { status: 'missing' } | { status: 'ready'; bundle: SimanBundle }

export function useSiman(sefer: string, siman: number): SimanState {
  const [state, setState] = useState<SimanState>({ status: 'loading' })
  useEffect(() => {
    let cancelled = false
    setState({ status: 'loading' })
    simanRepository.getSiman(sefer, siman).then((bundle) => {
      if (!cancelled) setState(bundle ? { status: 'ready', bundle } : { status: 'missing' })
    })
    return () => {
      cancelled = true
    }
  }, [sefer, siman])
  return state
}
