import { gematria } from './content/parse'

/** The works a location can point into. Shulchan Aruch's four chelakim, the
 * Mishna Berura (its own sefer) and the Kitzur Shulchan Aruch. */
export const SEFARIM = ['oc', 'yd', 'eh', 'cm', 'mb', 'kitzur'] as const
export type SeferId = (typeof SEFARIM)[number]

/** An addressable seif — what bookmarks, notes and history attach to.
 * `sefer` is a `SeferId` (kept a plain string so persisted data from a newer
 * build with more sefarim still loads). */
export interface SeifLocation {
  sefer: string
  siman: number
  seif: number
}

export const sameLocation = (a: SeifLocation, b: SeifLocation) =>
  a.sefer === b.sefer && a.siman === b.siman && a.seif === b.seif

export const locationKey = (l: SeifLocation) => `${l.sefer}/${l.siman}/${l.seif}`

const SEFER_NAMES: Record<SeferId, string> = {
  oc: 'אורח חיים',
  yd: 'יורה דעה',
  eh: 'אבן העזר',
  cm: 'חושן משפט',
  mb: 'משנה ברורה',
  kitzur: 'קיצור שולחן ערוך',
}

/** Hebrew name of a sefer, falling back to the raw id for unknown ones. */
export const seferName = (sefer: string) => SEFER_NAMES[sefer as SeferId] ?? sefer

const SEFER_SHORT_NAMES: Record<SeferId, string> = {
  oc: 'או״ח',
  yd: 'יו״ד',
  eh: 'אבהע״ז',
  cm: 'חו״מ',
  mb: 'משנה ברורה',
  kitzur: 'קיצור שו״ע',
}

/** Short Hebrew name of a sefer (או״ח, יו״ד…), falling back to the full name. */
export const seferShortName = (sefer: string) =>
  SEFER_SHORT_NAMES[sefer as SeferId] ?? seferName(sefer)

/** "סימן שכח" */
export const simanLabel = (siman: number) => `סימן ${gematria(siman)}`

/** "או״ח סימן שכח סעיף ב" */
export const seifLabel = (l: SeifLocation) =>
  `${seferShortName(l.sefer)} ${simanLabel(l.siman)} סעיף ${gematria(l.seif)}`
