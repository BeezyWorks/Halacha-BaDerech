import { useBookmarksStore } from '../bookmarks/store/bookmarksStore'
import type { Bookmark } from '../bookmarks/types'
import { useNotesStore } from '../notes/store/notesStore'
import type { Note } from '../notes/types'
import { useCommentaryStore } from './store/commentaryStore'
import { usePreferencesStore } from './store/preferencesStore'

/** Bump when the backup shape changes incompatibly. */
export const BACKUP_VERSION = 1
const BACKUP_APP = 'halacha-baderech'

export interface Backup {
  app: typeof BACKUP_APP
  version: number
  exportedAt: string
  preferences: Record<string, unknown>
  /** Nosei keilim chosen per sefer, and the Rema display. Absent in backups from before they existed. */
  commentary: CommentaryBackup
  bookmarks: Bookmark[]
  notes: Note[]
}

export interface CommentaryBackup {
  enabledWorks?: Record<string, string[]>
  remaInRashi?: boolean
}

type Plain = Record<string, unknown>

const isPlain = (v: unknown): v is Plain => typeof v === 'object' && v !== null && !Array.isArray(v)

const isLocation = (v: unknown) =>
  isPlain(v) && typeof v.sefer === 'string' && Number.isInteger(v.siman) && Number.isInteger(v.seif)

const isBookmark = (v: unknown): v is Bookmark =>
  isPlain(v) &&
  typeof v.id === 'string' &&
  typeof v.createdAt === 'number' &&
  isLocation(v.location)

const isNote = (v: unknown): v is Note =>
  isPlain(v) &&
  typeof v.id === 'string' &&
  typeof v.text === 'string' &&
  typeof v.createdAt === 'number' &&
  typeof v.updatedAt === 'number' &&
  isLocation(v.location)

/** Keeps only the well-typed parts of a commentary backup: a list of work ids per sefer, and the Rema flag. */
function parseCommentary(raw: unknown): CommentaryBackup {
  if (!isPlain(raw)) return {}
  const out: CommentaryBackup = {}
  if (isPlain(raw.enabledWorks)) {
    const works: Record<string, string[]> = {}
    for (const [sefer, list] of Object.entries(raw.enabledWorks)) {
      if (Array.isArray(list))
        works[sefer] = [...new Set(list.filter((w) => typeof w === 'string'))]
    }
    out.enabledWorks = works
  }
  if (typeof raw.remaInRashi === 'boolean') out.remaInRashi = raw.remaInRashi
  return out
}

/** The plain-data part of a store's state (drops the action functions). */
function dataOf(state: object): Plain {
  return Object.fromEntries(Object.entries(state).filter(([, v]) => typeof v !== 'function'))
}

/**
 * Take from `incoming` only the keys `current` already has, with a matching
 * type — so a hand-edited or older/newer file can't inject unknown or
 * wrongly-typed settings.
 */
function pickKnown(current: Plain, incoming: unknown): Plain {
  if (!isPlain(incoming)) return {}
  const out: Plain = {}
  for (const [key, cur] of Object.entries(current)) {
    const inc = incoming[key]
    if (isPlain(cur)) {
      if (isPlain(inc)) out[key] = { ...cur, ...pickKnown(cur, inc) }
    } else if (Array.isArray(cur)) {
      if (Array.isArray(inc)) out[key] = inc
    } else if (typeof inc === typeof cur) {
      out[key] = inc
    }
  }
  return out
}

export function buildBackup(): Backup {
  return {
    app: BACKUP_APP,
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    preferences: dataOf(usePreferencesStore.getState()),
    commentary: dataOf(useCommentaryStore.getState()),
    bookmarks: useBookmarksStore.getState().bookmarks,
    notes: useNotesStore.getState().notes,
  }
}

export const backupFilename = () =>
  `halacha-baderech-backup-${new Date().toISOString().slice(0, 10)}.json`

export type ParsedBackup = { ok: true; backup: Backup } | { ok: false; error: string }

export function parseBackup(text: string): ParsedBackup {
  let raw: unknown
  try {
    raw = JSON.parse(text)
  } catch {
    return { ok: false, error: "That isn't valid JSON." }
  }
  if (!isPlain(raw) || raw.app !== BACKUP_APP) {
    return { ok: false, error: "That isn't a Halacha BaDerech backup." }
  }
  if (typeof raw.version !== 'number' || raw.version > BACKUP_VERSION) {
    return { ok: false, error: 'This backup is from a newer version of the app.' }
  }
  return {
    ok: true,
    backup: {
      app: BACKUP_APP,
      version: raw.version,
      exportedAt: typeof raw.exportedAt === 'string' ? raw.exportedAt : '',
      preferences: pickKnown(dataOf(usePreferencesStore.getState()), raw.preferences),
      commentary: parseCommentary(raw.commentary),
      bookmarks: Array.isArray(raw.bookmarks) ? raw.bookmarks.filter(isBookmark) : [],
      notes: Array.isArray(raw.notes) ? raw.notes.filter(isNote) : [],
    },
  }
}

/** Replaces the current notes, bookmarks, nosei keilim choices and preferences with the backup's. */
export function applyBackup(backup: Backup) {
  usePreferencesStore.setState(backup.preferences)
  // A backup without commentary settings (older file) leaves the current ones alone.
  useCommentaryStore.setState({
    ...(backup.commentary.enabledWorks ? { enabledWorks: backup.commentary.enabledWorks } : {}),
    ...(backup.commentary.remaInRashi !== undefined
      ? { remaInRashi: backup.commentary.remaInRashi }
      : {}),
  })
  useBookmarksStore.setState({ bookmarks: backup.bookmarks })
  useNotesStore.setState({ notes: backup.notes })
}
