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
  `{ version, ranges?, licenseOverride?, note? }` (or, for Hebrew Wikisource,
  `{ source: 'wikisource', page: 'משנה ברורה על אורח חיים {siman}', ranges,
  license, url, note }`; see below). A siman is read from the
  first version whose `ranges` contain it (no `ranges` = fallback for
  everything); an empty version falls through to the next. `licenseOverride`
  (+ `note`) lets one named version pass the ingest's license check when
  Sefaria's metadata is wrong or "unknown"; the global accepted list is never
  loosened. `sources.json` records each version with its `ranges` and `note`,
  and the About screen shows them (with a link for Wikisource). Mishna Berura:
  "On Your Way" (Public Domain, Sefaria) for simanim 187-587 and 589-697;
  **Hebrew Wikisource** (CC-BY-SA) for 1-186 and 588, where Sefaria has no
  usable text.
- **Wikisource MB source.** `scripts/lib/wikisource.mjs` fetches wikitext
  politely (descriptive User-Agent, serial requests, `maxlag=5`, batched titles,
  backoff on 429/non-JSON, raw cache in git-ignored `scripts/.cache/wikisource/`).
  `content/wikisource.ts` (pure, Jest-tested) parses a page into MB `Unit`s
  (`n` = sk, `saSeif` from the `===סעיף X===` header or `<קטע התחלה=X/>`,
  `dh` from `{{משע|מב|<sk>|<DH>}}` plus any bold continuation). Templates:
  `משע` (structure), `ררר`/`ממ …`/`להשלים`/`תוכן עניינים שטוח`/header (dropped),
  `צ`/`קטן`/`ב`/`מקור` (their text); unknown ones are dropped and logged.
  Older pages use `'''(א) DH''' — body`; text before a seif's first sk becomes
  an unnumbered unit (`n: 0`, no label); `==משנת סופרים==` after siman 36's seifim
  and stub text like "אין" are dropped. `buildMbBundle({ mbUnits })` anchors by
  the OC text's own MB markers (the marker's seif wins over a misfiled Wikisource
  header) and records alignment in the stats (`mbSkNoMarker`, `mbMarkerNoSk`,
  `mbSeifDisagree`; `--stats` prints them). Alignment on 1-186 + 588: 4426 of
  4428 OC markers have a seif katan (missing in the source: 8 sk לב, 153 sk ק),
  none the other way; 178 of 187 simanim align perfectly; Wikisource's seif
  headers disagree with the OC text for 25 sk in 8 simanim (58, 63, 92, 125,
  154, 160, 174); `end` found for 95.1%. Wikisource page order is irregular in
  8, 125 and 153 (sk skipped/out of order; the bundle sorts by sk).
- **Mishna Berura coverage.** Every siman has MB text, and Biur Halacha is
  fetched for every siman, so the catalog has no MB `coverage` (the list shows
  no gap note). A siman with only Biur Halacha (none now) would have empty
  `seifim` and render the Orach Chaim seifim under a notice.
  Sha'ar HaTziyun is on neither Sefaria nor Wikisource in usable form.
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

- Sha'ar HaTziyun is not on Sefaria; Hebrew Wikisource has an index of ~700
  links but only 7 pages (simanim 1-4, 123, 202, 233), mostly source-abbreviation
  lists or short excerpts, so it was not ingested. Yoreh Deah 169 has no text (skipped).
- Tur and Aruch HaShulchan are planned; super-commentaries were skipped.
- Mishna Berura simanim 1-186 and 588 come from Wikisource and so are only as good as it
  is: sk 32 of siman 8 and sk 100 of siman 153 are missing there, and siman 36's
  Mishnat Sofrim appendix is not included.
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
node scripts/ingest-sefaria.mjs --sefer mb --simanim 1-186,588   # a subset; --force, --stats (MB alignment report)
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
