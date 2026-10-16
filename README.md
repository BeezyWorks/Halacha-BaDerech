# Halacha BaDerech

Shulchan Aruch with nosei keilim, Mishna Berura and Kitzur — learn halacha
on the way. Browse by sefer, siman and seif; tap a seif to open its nosei
keilim. Notes and bookmarks attach to a seif. Tur and Aruch HaShulchan are
planned.

Built with Expo + Expo Router on the shared `@beezyworks/design` design
system. Web first (Cloudflare); iOS/Android via EAS later. A sibling of
Mikros BaDerech.

See `AGENTS.md` for architecture and conventions.

## Getting started

```
git clone --recurse-submodules git@github.com:BeezyWorks/Halacha-BaDerech.git
pnpm install
pnpm web
```

## Features

- Shulchan Aruch (Orach Chaim, Yoreh Deah, Even HaEzer, Choshen Mishpat)
  with its nosei keilim, Mishna Berura with Biur Halacha, and Kitzur.
- Seifim show colored dibur hamaschil spans; tap a seif for a panel of the
  nosei keilim, tap a span to jump to its comment; in the Mishna Berura, tap
  a highlighted span to jump to its seif katan, and a seif katan for the
  Biur Halacha.
- Notes, bookmarks, recents; search by siman, chelek or heading; settings
  for which commentaries to show; data export/import.

## Content

Texts come from Sefaria's API via `scripts/ingest-sefaria.mjs` (Node >= 23.6)
into `public/content/<sefer>/<siman>.json`, driven by
`src/features/halacha/data/catalog.json` (sefarim, versions, works).

```
node scripts/ingest-sefaria.mjs                      # everything, resumable
node scripts/ingest-sefaria.mjs --sefer mb --simanim 1-186,588
node scripts/ingest-sefaria.mjs --force | --sources-only | --stats
```

A sefer's catalog entry may list several `versions` with siman `ranges`; a
version Sefaria mislabels can carry a `licenseOverride` and a `note` (Mishna
Berura uses Hebrew Wikisource's text, CC-BY-SA, for simanim 1-186 and 588 via a
`source: 'wikisource'` version; it is fetched politely and cached in
`scripts/.cache/wikisource/`, git-ignored).
Every version and its license is shown in-app under Settings, About.

The reader engine (`src/features/reader`) is generic and intended for reuse
by Mikros BaDerech, the mishna app and a Rambam app. Known gaps and the
design-system additions are listed in `AGENTS.md`.
