# Halacha BaDerech — project conventions

Expo (SDK 57) + Expo Router app for learning halacha on the way: Shulchan
Aruch (with nosei keilim), Mishna Berura and Kitzur Shulchan Aruch, plus
notes and bookmarks. iOS, Android and web from one codebase; web ships
first (Cloudflare). A sibling of Mikros BaDerech (Tanach) — same shell,
same conventions.

## Architecture

- **Feature-based.** Code lives in `src/features/<feature>/` (`halacha`,
  `reader`, `bookmarks`, `notes`, `history`, `settings`, `home`, `sheet`).
  `src/app/` holds
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
- Planned: **Tur** and **Aruch HaShulchan**. Super-commentaries (on Rashi
  etc.) were skipped.
- Content comes from Sefaria (version + license per work, shown on the About
  screen from `public/content/sources.json`). `pnpm ingest`
  (`scripts/ingest-sefaria.mjs`, Node >= 23.6) writes one bundle per siman,
  `public/content/<sefer>/<siman>.json` (type `SimanBundle` in
  `features/halacha/content/types.ts`), plus `<sefer>/index.json` (siman
  list) and `sources.json`. The catalog `features/halacha/data/catalog.json`
  (typed wrapper `catalog.ts`) is read by both the ingest and the app:
  sefarim, base versions, and works (stable camelCase ids like
  `magenAvraham`, abbreviation, Sefaria title/version per chelek, how each is
  indexed). Parsing/anchoring is pure TS in `features/halacha/content/`
  (Jest-tested): inline `<i data-commentator>` markers give each comment's
  seif and an anchor offset, matched to its dibur hamaschil for `end`.
- **Versions per sefer.** A catalog sefer may list `versions`: each
  `{ version, ranges?, licenseOverride?, note? }`. A siman is read from the
  first version whose `ranges` contain it (no `ranges` = fallback for
  everything); an empty version falls through to the next. `licenseOverride`
  (+ `note`) lets one named version pass the ingest's license check when
  Sefaria's metadata is wrong or "unknown"; the global accepted list is never
  loosened. `sources.json` records each version with its `ranges` and `note`,
  and the About screen shows them. Mishna Berura: "On Your Way" (Public
  Domain) for simanim 187-587 and 589-697; Hebrew Wikisource's "Wikitext"
  (recorded as CC-BY-SA) for the only early simanim it has: 1-2, 8, 25, 58, 89.
- **Mishna Berura coverage.** Biur Halacha is fetched for every siman, so
  MB `coverage` (catalog) is every siman with MB text *or* Biur Halacha (659
  of 697). A siman with only Biur Halacha has empty `seifim` and renders the
  Orach Chaim seifim (tap one for its Biur Halacha) under a notice; the other
  38 are dimmed in the list. MB anchors for the Wikitext simanim: 211 of 211
  markers mapped, 203 with `end` (DH located); the format is the same
  `(א) DH – body` that `splitMb` handles. Sha'ar HaTziyun is not on Sefaria.
- Navigation is **sefer → siman → seif**. Tapping a seif opens its nosei
  keilim in the root `SheetRoot` (DL `BottomSheetModal`: bottom sheet on
  phones, right panel on wide web), with notes and bookmark.
- Locations are `{ sefer, siman, seif }` (`features/halacha/types.ts`;
  `sefer` is one of `oc | yd | eh | cm | mb | kitzur`). Bookmarks, notes
  and history all attach to a `SeifLocation`.
- Tabs: **Home**, **Shulchan Aruch** (`/shulchan-aruch`: four chelek tiles,
  then `/shulchan-aruch/[sefer]` lists its simanim), **Mishna Berura**
  (`/mishna-berura`) and **Kitzur** (`/kitzur`) — the last two are the siman
  list itself. Lists are virtualized (`components/ListPage`, a `FlatList`;
  OC has 697 simanim), show Hebrew-numeral simanim with their headings, and
  dim simanim without text. Search (`halacha/search/searchSimanim.ts`) takes a
  siman number (שכח / 328), a chelek + number (oc 328, או״ח א) or a heading
  substring. Settings: nosei keilim per chelek and for the Mishna Berura
  (Biur Halacha), each toggle beside its color swatch.
- Home is drawn over a synagogue ark photo (DL `PhotoBackground`; the photo
  is a placeholder), with `GlassTile`s linking to the three works, then
  glass panels for recents, bookmarks and notes; the side rail frosts over it.
- No progress tracking (deliberately).
- The app is free/non-commercial, so CC-BY-NC versions are allowed;
  publisher-copyright versions never are.

## Reader engine (`src/features/reader`)

Generic and structural, so the same engine can serve Mikros BaDerech, the
mishna app and a Rambam app: input shapes are `ReaderUnit`, `ReaderMark`,
`ReaderAnchor` and `ReaderComment` (`engine/types.ts`), offsets are UTF-16
indices. Pure functions: `buildRuns(text, marks, spans)` (styled runs),
`visibleAnchors` (anchors of enabled works, `end` or an implicit end),
`groupComments` / `indexComments` / `worksWithComments`. Components:
`UnitText` (runs, tappable colored spans, superscript markers) and
`CommentaryPanel` (per-work chips, comments, scrolls to a tapped DH);
hooks: `useScrollRegistry` (register block y's, `scrollToKeys`);
`services/contentRepository.loadContent` fetches JSON from `/content`
(`EXPO_PUBLIC_CONTENT_BASE_URL` prefix). Halacha-specific glue lives in
`features/halacha` (`runs.ts`, `components/*Reader`, `SeifPanel`).
To reuse: map your units/comments to the Reader* shapes, give each work a
`WorkStyle` (categorical palette color), render `UnitText`.

## Design system additions

Added to `@beezyworks/design` for this app: a categorical palette (18 hues
with light/dark values, used for per-work colors), `Text` props `underline`,
`highlight` and `superscript`, and `ScrollStack` `scrollRef` (programmatic
scrolling).

## Known gaps

- Sha'ar HaTziyun is not on Sefaria; Yoreh Deah 169 has no text (skipped).
- Tur and Aruch HaShulchan are planned; super-commentaries were skipped.
- 38 Mishna Berura simanim have neither MB nor Biur Halacha text.
- The home photo is a placeholder.
- No EAS project is linked yet, and `eas.json` has no content base URL
  (`EXPO_PUBLIC_CONTENT_BASE_URL`) yet; native builds need one.
- `dist` is ~2.7k files / ~160 MB (content ~137 MB); Cloudflare allows 20k
  files and 25 MiB per file.

## Running

```
git submodule update --init
pnpm install
pnpm web             # dev server
pnpm typecheck && pnpm test
pnpm ingest          # refresh content from Sefaria (resumable; usage in the file header)
node scripts/ingest-sefaria.mjs --sefer mb --simanim 1-186,588   # a subset; --force, --stats
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
