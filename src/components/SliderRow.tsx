import { IconButton, Slider, Stack, Text } from '@beezyworks/design'

interface SliderRowProps {
  label: string
  value: number
  min: number
  max: number
  step: number
  onChange: (value: number) => void
}

const round = (n: number) => Math.round(n * 100) / 100

/** A labelled slider flanked by −/+ step buttons (same control as mishna-app's typography settings). */
export function SliderRow({ label, value, min, max, step, onChange }: SliderRowProps) {
  return (
    <Stack gap="xs">
      <Text variant="label">{label}</Text>
      <Stack direction="row" align="center" gap="sm">
        <IconButton
          name="remove"
          size={16}
          variant="filled"
          accessibilityLabel={`Decrease ${label.toLowerCase()}`}
          onPress={() => onChange(Math.max(min, round(value - step)))}
        />
        <Stack grow width={0}>
          <Slider
            value={value}
            min={min}
            max={max}
            step={step}
            onValueChange={onChange}
            accessibilityLabel={label}
          />
        </Stack>
        <IconButton
          name="add"
          size={16}
          variant="filled"
          accessibilityLabel={`Increase ${label.toLowerCase()}`}
          onPress={() => onChange(Math.min(max, round(value + step)))}
        />
      </Stack>
    </Stack>
  )
}
