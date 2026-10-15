import { Stack } from 'expo-router'

/** Drill-down stays inside the tab so the tab bar / side rail stays visible. */
export default function Layout() {
  return <Stack screenOptions={{ headerShown: false }} />
}
