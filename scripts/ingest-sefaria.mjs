#!/usr/bin/env node
/**
 * Pulls Shulchan Aruch (+ nosei keilim), Mishna Berura (+ Biur Halacha) and
 * Kitzur Shulchan Aruch from Sefaria's public API (v3) and writes one JSON
 * bundle per siman under public/content/, which the app fetches at runtime
 * (Expo's web export copies public/ as-is).
 *
 * What to fetch comes from src/features/halacha/data/catalog.json — the same
 * file the app reads: sefarim (base text + version, nosei keilim) and works
 * (Sefaria title/version/indexing per chelek). The pure parsing/anchoring
 * lives in src/features/halacha/content/*.ts (unit-tested with Jest) and is
 * loaded here via Node's native TypeScript support (Node >= 23.6).
 *
 * Why the API and not the Hugging Face dumps: those are huge, frozen, and mix
 * every version of every work with no per-version license. The API gives us
 * exactly the version we pick plus its license, which we need for attribution.
 * Only Public Domain / CC0 / CC-BY(-SA/-NC) versions are accepted; anything
 * else fails the run (see versionMeta).
 *
 * Per-siman version override: a sefer may list `versions` in the catalog, each
 * `{ version, ranges?, licenseOverride?, note? }`. A siman is read from the
 * first listed version whose ranges contain it (a version without ranges
 * covers everything, so it works as a fallback); if that version is empty
 * there, the next candidate is tried. `licenseOverride` (+ `note`) lets one
 * specific version pass the license check when Sefaria's metadata is wrong or
 * "unknown" but the true license is known — the global list is never loosened.
 * Mishna Berura uses it: "On Your Way" for 187-587 and 589-697.
 * A version may instead be `{ source: 'wikisource', page: 'משנה ברורה על אורח חיים {siman}',
 * ranges, license, note }`: the text is then read straight from Hebrew Wikisource
 * (he.wikisource.org, fetched politely and cached in scripts/.cache/wikisource/) and parsed
 * by features/halacha/content/wikisource.ts. Mishna Berura uses it for simanim 1-186 and
 * 588, where Sefaria has no usable text.
 * Biur Halacha is fetched for every siman, so a siman with only Biur Halacha
 * gets a bundle with the Orach Chaim seifim and no Mishna Berura text.
 *
 * Usage:
 *   node scripts/ingest-sefaria.mjs                         # everything (resumable)
 *   node scripts/ingest-sefaria.mjs --sefer oc,mb           # just these sefarim
 *   node scripts/ingest-sefaria.mjs --simanim 1-10,328      # just these simanim
 *   node scripts/ingest-sefaria.mjs --force                 # re-fetch existing bundles
 *   node scripts/ingest-sefaria.mjs --sources-only          # refresh sources.json only
 *   node scripts/ingest-sefaria.mjs --stats                 # aggregate stats of past runs
 *   node scripts/ingest-sefaria.mjs --verbose               # print a few DH matches per siman
 *
 * Output:
 *   public/content/<sefer>/<siman>.json   SimanBundle (see content/types.ts)
 *   public/content/<sefer>/index.json     SeferIndex: siman number, title, seif count
 *   public/content/sources.json           version + license per work per sefer
 *   scripts/.stats/<sefer>/<siman>.json   per-siman anchor stats (git-ignored)
 * Resumable: existing bundle files are skipped unless --force. Failed simanim
 * are listed at the end and retried on the next run.
 */
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import {
  buildKitzurBundle,
  buildMbBundle,
  buildSaBundle,
} from '../src/features/halacha/content/bundle.ts'
import { flattenSegments } from '../src/features/halacha/content/parse.ts'
import {
  parseWikisourceMb,
  wikisourcePageTitle,
} from '../src/features/halacha/content/wikisource.ts'
import { fetchWikitext } from './lib/wikisource.mjs'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const OUT = join(ROOT, 'public/content')
const STATS = join(ROOT, 'scripts/.stats')
const SEFARIA = 'https://www.sefaria.org/api/'
const CONCURRENCY = 6
const SIMAN_PARALLELISM = 8
const ACCEPTED_LICENSES = /^(Public Domain|CC0|CC-BY|CC-BY-SA|CC-BY-NC|CC-BY-NC-SA)$/

const catalog = JSON.parse(
  readFileSync(join(ROOT, 'src/features/halacha/data/catalog.json'), 'utf8'),
)
const workById = Object.fromEntries(catalog.works.map((w) => [w.id, w]))
const aliases = {}
for (const w of catalog.works) for (const n of w.markerNames) aliases[n] = w.id

// --- args -------------------------------------------------------------------
const args = process.argv.slice(2)
const argValue = (flag) => {
  const i = args.indexOf(flag)
  return i >= 0 ? args[i + 1] : undefined
}
const force = args.includes('--force')
const verbose = args.includes('--verbose')
const sourcesOnly = args.includes('--sources-only')
const onlySefarim = argValue('--sefer')?.split(',')
const simanSpec = argValue('--simanim')

function parseRanges(spec) {
  const set = new Set()
  for (const part of spec.split(',')) {
    const [a, b] = part.split('-').map(Number)
    for (let n = a; n <= (b ?? a); n++) set.add(n)
  }
  return set
}
const onlySimanim = simanSpec ? parseRanges(simanSpec) : null

// --- http -------------------------------------------------------------------
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

let active = 0
const waiting = []
async function limited(fn) {
  if (active >= CONCURRENCY) await new Promise((r) => waiting.push(r))
  active++
  try {
    return await fn()
  } finally {
    active--
    waiting.shift()?.()
  }
}

class HttpError extends Error {
  constructor(status, url) {
    super(`HTTP ${status} ${url}`)
    this.status = status
  }
}

async function getJson(url, attempt = 1) {
  try {
    return await limited(async () => {
      const res = await fetch(url, { headers: { 'User-Agent': 'halacha-baderech-ingest' } })
      if (res.status === 429 || res.status >= 500) throw new Error(`HTTP ${res.status}`)
      if (!res.ok) throw new HttpError(res.status, url)
      return res.json()
    })
  } catch (err) {
    if (attempt >= 6 || err instanceof HttpError) throw err
    await sleep(700 * 2 ** (attempt - 1))
    return getJson(url, attempt + 1)
  }
}

const encRef = (ref) => encodeURIComponent(ref.replace(/ /g, '_'))
const textUrl = (title, siman, version) =>
  `${SEFARIA}v3/texts/${encRef(`${title} ${siman}`)}?version=${encodeURIComponent(`hebrew|${version}`)}`

/** The siman's text (array) in this exact Hebrew version, or null if the version has none there. */
async function fetchText(title, siman, versions, { lenient = false } = {}) {
  for (const v of versions) {
    let res
    try {
      res = await getJson(textUrl(title, siman, v))
    } catch (err) {
      if (lenient && err instanceof HttpError) continue
      throw err
    }
    const hit = res.versions?.find((x) => x.versionTitle === v)
    if (hit && flattenSegments(hit.text).length) return hit.text
  }
  return null
}

const shapeCache = new Map()
/** Per-siman content check from /api/shape (true if unavailable). */
async function hasContent(title, siman) {
  if (!shapeCache.has(title)) {
    shapeCache.set(
      title,
      getJson(`${SEFARIA}shape/${encRef(title)}`)
        .then((s) => (Array.isArray(s) ? s[0] : s)?.chapters ?? null)
        .catch(() => null),
    )
  }
  const chapters = await shapeCache.get(title)
  if (!chapters) return true
  const c = chapters[siman - 1]
  if (c === undefined) return false
  return Array.isArray(c) ? c.flat(Infinity).some((n) => n > 0) : c > 0
}

/** comment index → seif for each work, from /api/links of the whole siman. */
async function fetchLinkSeif(sefer, siman, works) {
  const links = await getJson(`${SEFARIA}links/${encRef(`${sefer.sefaria} ${siman}`)}?with_text=0`)
  const out = {}
  for (const w of works) {
    const prefix = `${w.title} ${siman}:`
    for (const l of links) {
      if (typeof l.ref !== 'string' || !l.ref.startsWith(prefix)) continue
      const idx = parseInt(l.ref.slice(prefix.length), 10)
      const seif = parseInt(String(l.anchorRef).split(':').pop(), 10)
      if (Number.isFinite(idx) && Number.isFinite(seif)) (out[w.id] ??= {})[idx] ??= seif
    }
  }
  return out
}

// --- sources ----------------------------------------------------------------
const versionCache = new Map()
async function versionMeta(title, versionTitle, extra = {}) {
  if (!versionCache.has(title)) {
    versionCache.set(title, getJson(`${SEFARIA}texts/versions/${encRef(title)}`))
  }
  const all = await versionCache.get(title)
  const v = all.find((x) => x.versionTitle === versionTitle && x.language === 'he')
  if (!v) throw new Error(`Sefaria has no Hebrew version "${versionTitle}" of ${title}`)
  const license = extra.licenseOverride ?? v.license ?? ''
  if (!ACCEPTED_LICENSES.test(license))
    throw new Error(`"${versionTitle}" of ${title} has license "${v.license}" — not allowed`)
  return {
    versionTitle,
    license,
    versionSource: v.versionSource,
    ...(extra.ranges ? { ranges: extra.ranges } : {}),
    ...(extra.note ? { note: extra.note } : {}),
  }
}

/** The sefer's base-text versions: catalog `versions`, or just `baseVersion`. */
const seferVersions = (sefer) => sefer.versions ?? [{ version: sefer.baseVersion }]
const inRanges = (ranges, n) => !ranges || ranges.some(([a, b]) => n >= a && n <= b)
/** Version titles to try for this siman: those whose ranges contain it, in catalog order (ranged entries are exact; a rangeless one is a fallback). */
const versionEntriesForSiman = (sefer, siman) =>
  seferVersions(sefer).filter((v) => inRanges(v.ranges, siman))
/** Sefaria version titles for this siman (Wikisource entries are read separately). */
const versionsForSiman = (sefer, siman) =>
  versionEntriesForSiman(sefer, siman)
    .filter((v) => v.source !== 'wikisource')
    .map((v) => v.version)

/** sources.json entry for a Hebrew Wikisource version. */
function wikisourceMeta(v) {
  if (!ACCEPTED_LICENSES.test(v.license ?? ''))
    throw new Error(`Wikisource version needs a license`)
  return {
    versionTitle: 'Hebrew Wikisource',
    license: v.license,
    versionSource: v.url ?? 'https://he.wikisource.org/wiki/',
    ...(v.ranges ? { ranges: v.ranges } : {}),
    ...(v.note ? { note: v.note } : {}),
  }
}

async function buildSources(sefer) {
  const entry = {
    text: {
      title: sefer.sefaria,
      versions: await Promise.all(
        seferVersions(sefer).map((v) =>
          v.source === 'wikisource' ? wikisourceMeta(v) : versionMeta(sefer.sefaria, v.version, v),
        ),
      ),
    },
  }
  for (const id of sefer.noseiKeilim) {
    const part = workById[id].parts[sefer.id]
    entry[id] = {
      title: part.title,
      versions: await Promise.all(part.versions.map((v) => versionMeta(part.title, v))),
    }
  }
  return entry
}

// --- io ---------------------------------------------------------------------
const writeJson = (path, data) => {
  mkdirSync(dirname(path), { recursive: true })
  writeFileSync(path, JSON.stringify(data))
}
const bundlePath = (sefer, siman) => join(OUT, sefer, `${siman}.json`)

function simanList(sefer) {
  const all = []
  const ranges = sefer.coverage ?? [[1, sefer.simanim]]
  for (const [a, b] of ranges) for (let n = a; n <= b; n++) all.push(n)
  return onlySimanim ? all.filter((n) => onlySimanim.has(n)) : all
}

async function pool(items, limit, worker) {
  let next = 0
  await Promise.all(
    Array.from({ length: limit }, async () => {
      while (next < items.length) await worker(items[next++])
    }),
  )
}

// --- per-siman ----------------------------------------------------------------
async function buildSa(sefer, siman) {
  const baseHtml = await fetchText(sefer.sefaria, siman, versionsForSiman(sefer, siman))
  if (!baseHtml) throw new Error('no base text')
  const present = []
  for (const id of sefer.noseiKeilim) {
    const part = workById[id].parts[sefer.id]
    if (await hasContent(part.title, siman)) present.push({ id, part })
  }
  const works = (
    await Promise.all(
      present.map(async ({ id, part }) => ({
        id,
        unit: part.unit,
        dh: workById[id].dh,
        title: part.title,
        text: await fetchText(part.title, siman, part.versions, { lenient: true }),
      })),
    )
  ).filter((w) => w.text)
  const input = {
    sefer: sefer.id,
    siman,
    baseHtml,
    works,
    aliases,
    ignoredMarkers: catalog.ignoredMarkers,
  }
  let result = buildSaBundle(input)
  if (result.needsLinks) {
    input.linkSeif = await fetchLinkSeif(sefer, siman, works)
    result = buildSaBundle(input)
  }
  return result
}

async function buildMb(sefer, siman) {
  const oc = catalog.sefarim.find((s) => s.id === 'oc')
  const wikiEntry = versionEntriesForSiman(sefer, siman).find((v) => v.source === 'wikisource')
  let wiki = null
  if (wikiEntry) {
    const title = wikisourcePageTitle(wikiEntry.page, siman)
    const wikitext = (await fetchWikitext([title])).get(title)
    if (wikitext) {
      wiki = parseWikisourceMb(wikitext)
      for (const w of wiki.warnings) console.warn(`  wikisource ${siman}: ${w}`)
    } else console.warn(`  wikisource ${siman}: page "${title}" not found`)
  }
  const [baseHtml, mbText, bhText] = await Promise.all([
    fetchText(oc.sefaria, siman, versionsForSiman(oc, siman)),
    wiki?.units.length ? null : fetchText(sefer.sefaria, siman, versionsForSiman(sefer, siman)),
    (async () => {
      const part = workById.biurHalacha.parts.mb
      return (await hasContent(part.title, siman))
        ? fetchText(part.title, siman, part.versions, { lenient: true })
        : null
    })(),
  ])
  if (!baseHtml) throw new Error('missing OC text')
  // Neither MB nor Biur Halacha: nothing to show. Biur Halacha alone is kept (MB text empty).
  if (!wiki?.units.length && !mbText && !bhText) return null
  return buildMbBundle({
    siman,
    baseHtml,
    ...(wiki?.units.length ? { mbUnits: wiki.units } : { mbText: mbText ?? [] }),
    bhText,
  })
}

let kitzurTitles
async function kitzurTitle(sefer, siman) {
  kitzurTitles ??= getJson(`${SEFARIA}v2/index/${encRef(sefer.sefaria)}`).then((idx) => {
    const map = {}
    for (const node of idx.alts?.Topic?.nodes ?? []) {
      const n = parseInt(String(node.wholeRef).split(' ').pop(), 10)
      const title = String(node.heTitle ?? '')
        .replace(/^\s*\[[^\]]*\]\s*/, '')
        .trim()
      if (n && title) map[n] = title
    }
    return map
  })
  return (await kitzurTitles)[siman]
}

async function ingestSiman(sefer, siman) {
  const path = bundlePath(sefer.id, siman)
  if (!force && existsSync(path)) return 'skipped'
  let bundle
  let stats
  if (sefer.group === 'kitzur') {
    const html = await fetchText(sefer.sefaria, siman, versionsForSiman(sefer, siman))
    if (!html) throw new Error('no text')
    bundle = buildKitzurBundle(siman, html, await kitzurTitle(sefer, siman))
  } else {
    const result = sefer.id === 'mb' ? await buildMb(sefer, siman) : await buildSa(sefer, siman)
    if (!result) return 'missing'
    bundle = result.bundle
    stats = { ...result.stats, otherSmall: result.otherSmall.slice(0, 3) }
    if (verbose) logMatches(bundle)
  }
  // Stats first, bundle last: the bundle's presence marks the siman complete.
  if (stats) writeJson(join(STATS, sefer.id, `${siman}.json`), stats)
  writeJson(path, bundle)
  return 'written'
}

function logMatches(bundle) {
  const units = bundle.base ?? bundle.seifim
  let shown = 0
  for (const u of units) {
    for (const a of u.anchors ?? []) {
      if (shown++ >= 4) return
      console.log(
        `  ${bundle.sefer} ${bundle.siman}:${u.n} ${a.work}#${a.sk} → "${u.text.slice(a.at, a.end ?? a.at + 12)}"${a.end ? '' : ' (no end)'}`,
      )
    }
  }
}

function writeIndex(sefer) {
  const dir = join(OUT, sefer.id)
  if (!existsSync(dir)) return
  const simanim = readdirSync(dir)
    .filter((f) => /^\d+\.json$/.test(f))
    .map((f) => {
      const b = JSON.parse(readFileSync(join(dir, f), 'utf8'))
      return {
        n: b.siman,
        ...(b.title ? { title: b.title } : {}),
        seifim: (b.base ?? b.seifim).length,
      }
    })
    .sort((a, b) => a.n - b.n)
  writeJson(join(dir, 'index.json'), { sefer: sefer.id, simanim })
}

// --- stats report -------------------------------------------------------------
function reportStats() {
  const total = {}
  const per = {}
  const unmapped = new Set()
  const otherSmall = new Set()
  const conflicts = []
  for (const sefer of existsSync(STATS) ? readdirSync(STATS) : []) {
    for (const f of readdirSync(join(STATS, sefer))) {
      const s = JSON.parse(readFileSync(join(STATS, sefer, f), 'utf8'))
      for (const [k, v] of Object.entries(s))
        if (typeof v === 'number') total[k] = (total[k] ?? 0) + v
      for (const [id, w] of Object.entries(s.perWork)) {
        const p = (per[id] ??= { markers: 0, anchors: 0, withEnd: 0, withDh: 0, searched: 0 })
        for (const k of Object.keys(p)) p[k] += w[k]
      }
      s.unmappedNames.forEach((n) => unmapped.add(n))
      s.otherSmall.forEach((n) => otherSmall.add(n))
      s.conflictExamples?.forEach((n) => conflicts.push(`${sefer} ${f.replace('.json', '')}: ${n}`))
    }
  }
  const pct = (a, b) => (b ? `${((100 * a) / b).toFixed(1)}%` : 'n/a')
  const relevant = (total.markers ?? 0) - (total.markersIgnored ?? 0)
  console.log('--- anchor stats ---')
  console.log(`markers for included works: ${relevant}`)
  console.log(
    `  mapped to a comment:      ${total.markersMapped} (${pct(total.markersMapped, relevant)})`,
  )
  console.log(`  orphan (no comment/dupe): ${total.markersOrphan}`)
  if (total.mbSkNoMarker !== undefined || total.mbMarkerNoSk !== undefined)
    console.log(
      `wikisource MB alignment: sk without an OC marker ${total.mbSkNoMarker ?? 0}; OC markers without a sk ${total.mbMarkerNoSk ?? 0}; sk placed in a different seif than the OC marker ${total.mbSeifDisagree ?? 0}`,
    )
  console.log(`anchors: ${total.anchors} (found by DH search, no marker: ${total.anchorsSearched})`)
  console.log(
    `  with a DH to match:       ${total.anchorsWithDh} (${pct(total.anchorsWithDh, total.anchors)})`,
  )
  console.log(
    `  with end (DH located):    ${total.anchorsWithEnd} (${pct(total.anchorsWithEnd, total.anchors)} of all, ${pct(total.anchorsWithEnd, total.anchorsWithDh)} of those with DH)`,
  )
  console.log(
    `comments: ${total.comments}; seif inferred: ${total.commentsSeifInferred}; marker/link seif conflicts: ${total.seifConflicts}`,
  )
  console.log('per work:')
  for (const [id, p] of Object.entries(per))
    console.log(
      `  ${id.padEnd(16)} markers ${String(p.markers).padStart(6)}  anchors ${String(p.anchors).padStart(6)}  with-dh ${pct(p.withDh, p.anchors).padStart(6)}  end/dh ${pct(p.withEnd, p.withDh).padStart(6)}  (searched ${p.searched})`,
    )
  if (conflicts.length)
    console.log('seif conflicts (marker vs link):\n  ' + conflicts.slice(0, 12).join('\n  '))
  console.log('unmapped commentator names:', [...unmapped].join(', ') || '(none)')
  if (otherSmall.size)
    console.log('non-הגה <small> samples:', [...otherSmall].slice(0, 8).join(' | '))
}

// --- main -------------------------------------------------------------------
if (args.includes('--stats')) {
  reportStats()
  process.exit(0)
}

const selected = catalog.sefarim.filter((s) => !onlySefarim || onlySefarim.includes(s.id))
const sourcesPath = join(OUT, 'sources.json')
const sources = existsSync(sourcesPath) ? JSON.parse(readFileSync(sourcesPath, 'utf8')) : {}
for (const sefer of selected) {
  sources[sefer.id] = await buildSources(sefer)
  const names = sefer.noseiKeilim.join(', ') || '(none)'
  console.log(
    `${sefer.id}: ${sefer.sefaria} [${seferVersions(sefer)
      .map((v) => v.version)
      .join(' + ')}]; nosei keilim: ${names}`,
  )
}
writeJson(sourcesPath, sources)
if (sourcesOnly) {
  console.log(`Done: sources.json for ${selected.length} sefarim`)
  process.exit(0)
}

const failures = []
for (const sefer of selected) {
  const list = simanList(sefer)
  let written = 0
  let skipped = 0
  const missing = []
  await pool(list, SIMAN_PARALLELISM, async (siman) => {
    try {
      const r = await ingestSiman(sefer, siman)
      if (r === 'written') written++
      else if (r === 'missing') missing.push(siman)
      else skipped++
      if ((written + skipped) % 50 === 0)
        console.log(`  ${sefer.id}: ${written + skipped}/${list.length}`)
    } catch (err) {
      failures.push(`${sefer.id} ${siman}: ${err.message}`)
      console.error(`FAILED ${sefer.id} ${siman}: ${err.message}`)
    }
  })
  writeIndex(sefer)
  console.log(`${sefer.id}: ${written} written, ${skipped} skipped (${list.length} simanim)`)
  if (missing.length)
    console.log(
      `  no text on Sefaria for ${missing.length} simanim: ${missing.sort((a, b) => a - b).join(' ')}`,
    )
}
if (failures.length) {
  console.error(`\n${failures.length} failures (re-run to retry):\n  ${failures.join('\n  ')}`)
  process.exitCode = 1
}
console.log(`Done → ${OUT}`)
