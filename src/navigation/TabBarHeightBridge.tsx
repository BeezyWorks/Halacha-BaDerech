import { TabBarHeightContext } from '@beezyworks/design'
import { BottomTabBarHeightContext } from 'expo-router/js-tabs'
import React, { useContext } from 'react'

/** Hands the tab bar's height to the DL so `Screen` can reserve room for it. */
export function TabBarHeightBridge({ children }: { children: React.ReactNode }) {
  return (
    <TabBarHeightContext.Provider value={useContext(BottomTabBarHeightContext)}>
      {children}
    </TabBarHeightContext.Provider>
  )
}
