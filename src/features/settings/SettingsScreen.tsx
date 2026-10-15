import {
  Card,
  type FontOption,
  FontSwatchPicker,
  ListRow,
  SemanticColor,
  SettingsCard,
  SettingsStackedRow,
  Text,
  ThemeSwatchPicker,
  Stack,
  ToggleSetting,
  Typeface,
} from '@beezyworks/design'
import Constants from 'expo-constants'
import { useRouter } from 'expo-router'
import React from 'react'

import { PageLayout } from '@/components/PageLayout'
import { SliderRow } from '@/components/SliderRow'
import { DataSettings } from './components/DataSettings'
import {
  type ColorSchemePreference,
  FONT_SIZE_MAX,
  FONT_SIZE_MIN,
  LEADING_MAX,
  LEADING_MIN,
  usePreferencesStore,
} from './store/preferencesStore'

// Display labels are the app's; the values are the DL's persisted option strings.
const TYPEFACE_LABELS: Record<Typeface, string> = {
  [Typeface.Frank]: 'פרנק',
  [Typeface.David]: 'דוד',
  [Typeface.Ezra]: 'עזרא',
  [Typeface.Hadasim]: 'הדסים',
  [Typeface.MekorotVilna]: 'מקורות וילנא',
  [Typeface.Cardo]: 'קרדו',
  [Typeface.FrankRuhlLibre]: 'פרנק ריהל',
  [Typeface.NotoSerifHebrew]: 'נוטו סריף',
  [Typeface.Rubik]: 'רוביק',
}

const TYPEFACE_OPTIONS: FontOption<Typeface>[] = Object.values(Typeface).map((t) => ({
  key: t,
  label: TYPEFACE_LABELS[t],
  typeface: t,
}))

// Orach Chaim 1:1 as the reader sets it, enough to show the typeface, size and
// line spacing together. Sefer text, not UI copy.
const PREVIEW_TEXT = 'יִתְגַּבֵּר כַּאֲרִי לַעֲמֹד בַּבֹּקֶר לַעֲבוֹדַת בּוֹרְאוֹ'

/** A live sample of the reading text on the reader's own page color, so
 * every display control below it shows its effect without leaving settings
 * (the siddur's settings preview). */
function TextPreview() {
  return (
    <Stack paddingBottom="sm">
      <Card
        background={SemanticColor.SurfaceBackground}
        shadow="none"
        radius="md"
        paddingVertical="sm"
        paddingHorizontal="md"
      >
        <Text content>{PREVIEW_TEXT}</Text>
      </Card>
    </Stack>
  )
}

export function SettingsScreen() {
  const router = useRouter()
  const p = usePreferencesStore()

  return (
    <PageLayout title="הגדרות" display>
      <SettingsCard title="Display">
        <TextPreview />
        <SettingsStackedRow title="Appearance">
          <ThemeSwatchPicker
            value={p.colorScheme}
            onChange={(mode) => p.setColorScheme(mode as ColorSchemePreference)}
            modes={['light', 'sepia', 'dark', 'system']}
            glyph="א"
            rtl
          />
        </SettingsStackedRow>
        <SettingsStackedRow title="Typeface">
          <FontSwatchPicker
            script="hebrew"
            options={TYPEFACE_OPTIONS}
            selectedKey={p.content.typeface}
            onSelect={(key) => p.setTypeface(key as Typeface)}
            rtl
          />
        </SettingsStackedRow>
        <SliderRow
          label="Font size"
          value={p.content.size}
          min={FONT_SIZE_MIN}
          max={FONT_SIZE_MAX}
          step={1}
          onChange={p.setContentSize}
        />
        <SliderRow
          label="Line spacing"
          value={p.content.leading}
          min={LEADING_MIN}
          max={LEADING_MAX}
          step={0.1}
          onChange={p.setLeading}
        />
      </SettingsCard>

      <SettingsCard title="English">
        <ToggleSetting
          title="English translation"
          enabled={p.showTranslation}
          onSwitch={p.setShowTranslation}
        />
      </SettingsCard>

      <SettingsCard title="Data">
        <DataSettings />
      </SettingsCard>

      <SettingsCard>
        <ListRow
          title="About & sources"
          showChevron
          onPress={() => router.push('/settings/about')}
        />
        <ListRow
          title="Privacy policy"
          showChevron
          isLast
          onPress={() => router.push('/settings/privacy')}
        />
      </SettingsCard>

      <Text variant="detail">Version {Constants.expoConfig?.version ?? '—'}</Text>
    </PageLayout>
  )
}
