# Halacha BaDerech — project conventions

Expo (SDK 57) + Expo Router app for learning halacha on the way: Shulchan
Aruch (with nosei keilim), Mishna Berura and Kitzur Shulchan Aruch, plus
notes and bookmarks. iOS, Android and web from one codebase; web ships
first (Cloudflare). A sibling of Mikros BaDerech (Tanach) — same shell,
same conventions.

## Architecture

- **Feature-based.** Code lives in `src/features/<feature>/` (`halacha`,
  `reader`, `bookmarks`, `notes`, `history`, `settings`, `home`, `sheet`;
  the content features are built out in later steps). `src/app/` holds
  *only* route files, each a one-line re-export of a feature screen.
- **Design system = `@beezyworks/design`**, the `packages/design` git
  submodule (BeezyWorks/design-system), shared with SiddurOneRN and the
  mishna app — one source of truth, one look. No raw colors or `style`
  props in app code; compose DL primitives (`Stack`, `Text`, `Touchable`,
  …). If something can't be built from them, add it to the DL (commit and
  push there, then bump the submodule pointer here). App-specific
  composites live in `src/components/`.
- **State via zustand**, persisted through `src/lib/storage/zustandStorage.ts`
  (AsyncStorage → localStorage on web). Never return a freshly computed
  array/object from a store selector — select the stable slice and derive in
  `useMemo` (see `NoteInlineEditor`).
- **Navigation.** `(tabs)` uses `expo-router/js-tabs` with the DL tab bar,
  and the DL `SideNavRail` on wide web (ported from SiddurOneRN). Readers are
  nested stacks *inside* the content tabs so the tab bar/rail stays visible.
- **No nested pressables.** RN Web renders `Pressable` as `<button>`;
  `<button>` inside `<button>` is invalid. Make the open-target and any
  action buttons siblings (see `bookmarks/components/LocationRow`).

## Content model

- **Shulchan Aruch**: four chelakim — Orach Chaim (`oc`), Yoreh Deah
  (`yd`), Even HaEzer (`eh`), Choshen Mishpat (`cm`) — with its nosei
  keilim (commentaries).
- **Mishna Berura** (`mb`): its own sefer, on Orach Chaim, with Biur Halacha.
- **Kitzur Shulchan Aruch** (`kitzur`).
- Planned: **Tur** and **Aruch HaShulchan**.
- Content comes from Sefaria (version + license per work, shown on the
  About screen). The ingest (`pnpm ingest`, `scripts/ingest-sefaria.mjs`)
  is a stub until step 2; the app will fetch `public/content/...` at runtime.
- Navigation is **sefer → siman → seif**. Tapping a seif opens its nosei
  keilim in the root `SheetRoot` (DL `BottomSheetModal`: bottom sheet on
  phones, right panel on wide web), with notes and bookmark.
- Locations are `{ sefer, siman, seif }` (`features/halacha/types.ts`;
  `sefer` is one of `oc | yd | eh | cm | mb | kitzur`). Bookmarks, notes
  and history all attach to a `SeifLocation`.
- Tabs: **Home**, **Shulchan Aruch** (`/shulchan-aruch`), **Mishna Berura**
  (`/mishna-berura`), **Kitzur** (`/kitzur`), **Settings**. The three
  content tabs are "coming soon" placeholders (`components/ComingSoon`).
- Home is drawn over a synagogue ark photo (DL `PhotoBackground`; the photo
  is a placeholder), with `GlassTile`s linking to the three works, then
  glass panels for recents, bookmarks and notes; the side rail frosts over it.
- No progress tracking (deliberately).
- The app is free/non-commercial, so CC-BY-NC versions are allowed;
  publisher-copyright versions never are.

## Running

```
git submodule update --init
pnpm install
pnpm web             # dev server
pnpm typecheck && pnpm test
pnpm ingest          # refresh content from Sefaria (stub until step 2)
pnpm deploy:web      # expo export + wrangler deploy (Cloudflare)
```

Package manager is pnpm.

## Commits & releases

[Conventional Commits](https://www.conventionalcommits.org/) are enforced
locally (husky `commit-msg` → commitlint) and in CI (commitlint on PR
commits, semantic PR titles since squash-merge uses the title).
`<type>(<scope>): <summary>` — imperative, lowercase, no trailing period.
semantic-release runs on every push to `main`: computes the version from
the commits, updates `CHANGELOG.md`, `package.json` and `app.json`
(`scripts/sync-app-version.mjs`), tags, and creates the GitHub release.
