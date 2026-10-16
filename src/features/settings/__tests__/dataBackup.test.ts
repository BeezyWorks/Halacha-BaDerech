jest.mock('@/lib/storage/zustandStorage', () => ({
  zustandStorage: { getItem: () => null, setItem: () => {}, removeItem: () => {} },
}))

import { useBookmarksStore } from '../../bookmarks/store/bookmarksStore'
import { useNotesStore } from '../../notes/store/notesStore'
import { applyBackup, buildBackup, parseBackup } from '../dataBackup'
import { useCommentaryStore } from '../store/commentaryStore'
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
    usePreferencesStore.setState({ navRailCollapsed: true })
    const json = JSON.stringify(buildBackup())

    useBookmarksStore.setState({ bookmarks: [] })
    useNotesStore.setState({ notes: [] })
    usePreferencesStore.setState({ navRailCollapsed: false })

    const parsed = parseBackup(json)
    if (!parsed.ok) throw new Error(parsed.error)
    applyBackup(parsed.backup)

    expect(useBookmarksStore.getState().bookmarks).toHaveLength(1)
    expect(useNotesStore.getState().notes[0].text).toBe('hi')
    expect(usePreferencesStore.getState().navRailCollapsed).toBe(true)
    // Actions survive the merge.
    expect(typeof usePreferencesStore.getState().toggleNavRailCollapsed).toBe('function')
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
        preferences: { navRailCollapsed: 'yes', bogus: 1, content: { size: 20 } },
      }),
    )
    if (!parsed.ok) throw new Error(parsed.error)
    expect(parsed.backup.bookmarks).toHaveLength(1)
    expect(parsed.backup.notes).toHaveLength(0)
    expect(parsed.backup.preferences).not.toHaveProperty('navRailCollapsed')
    expect(parsed.backup.preferences).not.toHaveProperty('bogus')
    expect(parsed.backup.preferences.content).toMatchObject({ size: 20 })
  })

  it('round-trips the nosei keilim choices and the Rema display', () => {
    useCommentaryStore.setState({
      enabledWorks: { oc: ['magenAvraham'], mb: [] },
      remaInRashi: false,
    })
    const json = JSON.stringify(buildBackup())
    useCommentaryStore.setState({ enabledWorks: {}, remaInRashi: true })

    const parsed = parseBackup(json)
    if (!parsed.ok) throw new Error(parsed.error)
    applyBackup(parsed.backup)

    expect(useCommentaryStore.getState().enabledWorks).toEqual({ oc: ['magenAvraham'], mb: [] })
    expect(useCommentaryStore.getState().remaInRashi).toBe(false)
    expect(typeof useCommentaryStore.getState().toggleWork).toBe('function')
  })

  it('drops malformed commentary settings and keeps current ones when absent', () => {
    useCommentaryStore.setState({ enabledWorks: { yd: ['sifteiKohen'] }, remaInRashi: false })
    const parsed = parseBackup(
      JSON.stringify({
        app: 'halacha-baderech',
        version: 1,
        commentary: { enabledWorks: { oc: ['a', 5, 'a'], bad: 'x' }, remaInRashi: 'no' },
      }),
    )
    if (!parsed.ok) throw new Error(parsed.error)
    expect(parsed.backup.commentary).toEqual({ enabledWorks: { oc: ['a'] } })

    const old = parseBackup('{"app":"halacha-baderech","version":1}')
    if (!old.ok) throw new Error(old.error)
    applyBackup(old.backup)
    expect(useCommentaryStore.getState().enabledWorks).toEqual({ yd: ['sifteiKohen'] })
    expect(useCommentaryStore.getState().remaInRashi).toBe(false)
  })
})
