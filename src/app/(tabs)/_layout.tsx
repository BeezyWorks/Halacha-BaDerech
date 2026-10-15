import {
  SemanticColor,
  SideNavCollapsedContext,
  TabBarBackground,
  TabBarIcon,
  isFloatingTabBar,
  tabBarSafeAreaInsets,
  useColorResolver,
  useFloatingTabBarStyle,
  useIsWideWebNav,
  useThemeMode,
} from '@beezyworks/design'
import { Tabs } from 'expo-router/js-tabs'
import React from 'react'

import { usePreferencesStore } from '@/features/settings/store/preferencesStore'
import { AppSideNav } from '@/navigation/AppSideNav'
import { TabBarHeightBridge } from '@/navigation/TabBarHeightBridge'

export default function TabLayout() {
  const resolve = useColorResolver()
  const mode = useThemeMode()
  const isWideWeb = useIsWideWebNav()
  const tabBarStyle = useFloatingTabBarStyle()
  const railCollapsed = usePreferencesStore((s) => s.navRailCollapsed)

  return (
    <SideNavCollapsedContext.Provider value={railCollapsed}>
      <Tabs
        // The iOS pill positions itself above the home indicator, so it must
        // not add the inset too; the docked bar elsewhere keeps its inset.
        safeAreaInsets={tabBarSafeAreaInsets}
        tabBar={isWideWeb ? (props) => <AppSideNav {...props} /> : undefined}
        screenLayout={({ children }) => <TabBarHeightBridge>{children}</TabBarHeightBridge>}
        screenOptions={{
          headerShown: false,
          tabBarActiveBackgroundColor: 'transparent',
          tabBarInactiveBackgroundColor: 'transparent',
          tabBarActiveTintColor: resolve(SemanticColor.AccentTabActive),
          tabBarInactiveTintColor: resolve(SemanticColor.TextTabInactive),
          tabBarStyle,
          tabBarBackground: isFloatingTabBar
            ? () => <TabBarBackground dark={mode === 'dark'} />
            : undefined,
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            tabBarLabel: 'Home',
            tabBarIcon: ({ focused }) => <TabBarIcon focused={focused} name="home" />,
          }}
        />
        <Tabs.Screen
          name="shulchan-aruch"
          options={{
            tabBarLabel: 'Shulchan Aruch',
            tabBarIcon: ({ focused }) => <TabBarIcon focused={focused} name="bookshelf" />,
          }}
        />
        <Tabs.Screen
          name="mishna-berura"
          options={{
            tabBarLabel: 'Mishna Berura',
            tabBarIcon: ({ focused }) => <TabBarIcon focused={focused} name="book-open" />,
          }}
        />
        <Tabs.Screen
          name="kitzur"
          options={{
            tabBarLabel: 'Kitzur',
            tabBarIcon: ({ focused }) => <TabBarIcon focused={focused} name="scroll-text" />,
          }}
        />
        <Tabs.Screen
          name="settings"
          options={{
            tabBarLabel: 'Settings',
            tabBarIcon: ({ focused }) => <TabBarIcon focused={focused} name="cog" />,
          }}
        />
      </Tabs>
    </SideNavCollapsedContext.Provider>
  )
}
