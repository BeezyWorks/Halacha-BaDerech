import { BottomSheetModal, ScrollStack, SheetHostContext } from '@beezyworks/design'
import React, { createContext, useCallback, useContext, useMemo, useState } from 'react'

export interface SheetConfig {
  title?: string
  headerRight?: React.ReactNode
  content: React.ReactNode
  /** Wrap the content in a scroller (default). Pass false when the content
   * manages its own scrolling, like the pasuk panel's split pane. */
  scroll?: boolean
  /** Called once the sheet has fully closed. */
  onClosed?: () => void
}

interface SheetApi {
  show: (config: SheetConfig) => void
  dismiss: () => void
}

const SheetContext = createContext<SheetApi>({ show: () => {}, dismiss: () => {} })

export const useSheet = () => useContext(SheetContext)

/**
 * Hosts one design-system `BottomSheetModal` at the app root — a bottom
 * sheet on phones, a right-docked panel on wide web (the DL switches at
 * SIDE_NAV_BREAKPOINT). Same contract as SiddurOneRN's `ModalRoot`: the
 * sheet asks to close via `dismiss`, animates out, then `onClosed` unmounts it.
 */
export function SheetRoot({ children }: { children: React.ReactNode }) {
  const [config, setConfig] = useState<SheetConfig>()
  const [dismissed, setDismissed] = useState(false)

  const show = useCallback((next: SheetConfig) => {
    setDismissed(false)
    setConfig(next)
  }, [])
  const dismiss = useCallback(() => setDismissed(true), [])
  const onClosed = useCallback(() => {
    setConfig((current) => {
      current?.onClosed?.()
      return undefined
    })
  }, [])

  const api = useMemo(() => ({ show, dismiss }), [show, dismiss])
  const host = useMemo(() => ({ dismissed, dismiss, onClosed }), [dismissed, dismiss, onClosed])

  return (
    <SheetContext.Provider value={api}>
      <SheetHostContext.Provider value={host}>
        {children}
        {config ? (
          <BottomSheetModal fullScreen title={config.title} headerRight={config.headerRight}>
            {config.scroll === false ? config.content : <ScrollStack>{config.content}</ScrollStack>}
          </BottomSheetModal>
        ) : null}
      </SheetHostContext.Provider>
    </SheetContext.Provider>
  )
}
