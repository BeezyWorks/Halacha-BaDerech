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

## Content

Texts come from Sefaria's API via `scripts/ingest-sefaria.mjs` (currently a
stub; the ingest is built in a later step). Every version and its license
is shown in-app under Settings → About & sources.
