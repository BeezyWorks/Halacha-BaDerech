import { SideNavItem, SideNavRail, useSideNavWidth, useThemeMode } from '@beezyworks/design'
import type { BottomTabBarProps } from 'expo-router/js-tabs'
import React from 'react'

import { usePreferencesStore } from '@/features/settings/store/preferencesStore'

/** Wide-web replacement for the bottom tab bar, driven by the same tab screens (ported from SiddurOneRN), collapsible to icons. */
export function AppSideNav({ state, descriptors, navigation }: BottomTabBarProps) {
  const mode = useThemeMode()
  const width = useSideNavWidth()
  const collapsed = usePreferencesStore((s) => s.navRailCollapsed)
  const toggleCollapsed = usePreferencesStore((s) => s.toggleNavRailCollapsed)
  // Home draws its photo under the rail, so there it frosts the photo like
  // the home's glass; elsewhere it's the plain chrome material.
  const overPhoto = state.routes[state.index]?.name === 'index'
  return (
    <SideNavRail
      width={width}
      blurTint={mode === 'dark' ? 'systemChromeMaterialDark' : 'systemChromeMaterialLight'}
      glass={overPhoto}
      collapsed={collapsed}
      onToggleCollapsed={toggleCollapsed}
    >
      {state.routes.map((route, index) => {
        const { options } = descriptors[route.key]
        const focused = state.index === index
        const label = options.tabBarLabel ?? options.title ?? route.name
        if (typeof label !== 'string') return null
        const onPress = () => {
          const event = navigation.emit({
            type: 'tabPress',
            target: route.key,
            canPreventDefault: true,
          })
          if (!focused && !event.defaultPrevented) navigation.navigate(route.name)
        }
        return (
          <SideNavItem
            key={route.key}
            icon={options.tabBarIcon?.({ focused, color: '', size: 24 })}
            label={label}
            focused={focused}
            collapsed={collapsed}
            onPress={onPress}
          />
        )
      })}
    </SideNavRail>
  )
}
