jest.mock('@/lib/storage/zustandStorage', () => ({
  zustandStorage: { getItem: () => null, setItem: () => {}, removeItem: () => {} },
}))

import { useBookmarksStore } from '../../bookmarks/store/bookmarksStore'
import { useNotesStore } from '../../notes/store/notesStore'
import { applyBackup, buildBackup, parseBackup } from '../dataBackup'
import { usePreferencesStore } from '../store/preferencesStore'

const loc = { sefer: 'oc', siman: 1, seif: 1 }

beforeEach(() => {
  useBookmarksStore.setState({ bookmarks: [] })
  useNotesStore.setState({ notes: [] })
})

describe('data backup', () => {
  it('round-trips notes, bookmarks and preferences', () => {
    useBookmarksStore.setState({ bookmarks: [{ id: 'b1', location: loc, createdAt: 1 }] })
    useNotesStore.setState({
      notes: [{ id: 'n1', location: loc, text: 'hi', createdAt: 1, updatedAt: 2 }],
    })
    usePreferencesStore.setState({ showTranslation: true })
    const json = JSON.stringify(buildBackup())

    useBookmarksStore.setState({ bookmarks: [] })
    useNotesStore.setState({ notes: [] })
    usePreferencesStore.setState({ showTranslation: false })

    const parsed = parseBackup(json)
    if (!parsed.ok) throw new Error(parsed.error)
    applyBackup(parsed.backup)

    expect(useBookmarksStore.getState().bookmarks).toHaveLength(1)
    expect(useNotesStore.getState().notes[0].text).toBe('hi')
    expect(usePreferencesStore.getState().showTranslation).toBe(true)
    // Actions survive the merge.
    expect(typeof usePreferencesStore.getState().setShowTranslation).toBe('function')
  })

  it('rejects non-backups and newer versions', () => {
    expect(parseBackup('nope').ok).toBe(false)
    expect(parseBackup('{"app":"other"}').ok).toBe(false)
    expect(parseBackup('{"app":"halacha-baderech","version":99}').ok).toBe(false)
  })

  it('drops malformed entries and wrongly-typed or unknown settings', () => {
    const parsed = parseBackup(
      JSON.stringify({
        app: 'halacha-baderech',
        version: 1,
        bookmarks: [{ id: 'ok', location: loc, createdAt: 1 }, { id: 5 }],
        notes: [{ id: 'bad' }],
        preferences: { showTranslation: 'yes', bogus: 1, content: { size: 20 } },
      }),
    )
    if (!parsed.ok) throw new Error(parsed.error)
    expect(parsed.backup.bookmarks).toHaveLength(1)
    expect(parsed.backup.notes).toHaveLength(0)
    expect(parsed.backup.preferences).not.toHaveProperty('showTranslation')
    expect(parsed.backup.preferences).not.toHaveProperty('bogus')
    expect(parsed.backup.preferences.content).toMatchObject({ size: 20 })
  })
})
