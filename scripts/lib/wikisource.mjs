/**
 * Fetches raw wikitext from Hebrew Wikisource, politely (see
 * https://www.mediawiki.org/wiki/Wikimedia_APIs/Rate_limits): descriptive
 * User-Agent, serial requests, maxlag=5, titles batched (<= 50 per request),
 * backoff on 429/maxlag/non-JSON replies, and a git-ignored on-disk cache
 * (scripts/.cache/wikisource/) so re-runs never refetch a page.
 */
import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const API = 'https://he.wikisource.org/w/api.php'
const CACHE = join(dirname(fileURLToPath(import.meta.url)), '..', '.cache', 'wikisource')
const USER_AGENT =
  'HalachaBaDerech-ingest/1.0 (https://github.com/BeezyWorks/Halacha-BaDerech; mattaniah@beezyworks.com)'
const BATCH = 50
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

const cachePath = (title) =>
  join(CACHE, `${createHash('sha1').update(title).digest('hex').slice(0, 16)}.json`)

async function apiGet(params, attempt = 1) {
  const url = `${API}?${new URLSearchParams({ format: 'json', maxlag: '5', ...params })}`
  try {
    const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT } })
    const body = await res.text()
    let json
    try {
      json = JSON.parse(body)
    } catch {
      throw new Error(`non-JSON reply (HTTP ${res.status}): ${body.slice(0, 80)}`)
    }
    if (json.error) throw new Error(`API ${json.error.code}: ${json.error.info}`)
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    return json
  } catch (err) {
    if (attempt >= 8) throw err
    const wait = Math.min(120_000, 5_000 * 2 ** (attempt - 1))
    console.warn(`  wikisource: ${err.message}; retrying in ${wait / 1000}s`)
    await sleep(wait)
    return apiGet(params, attempt + 1)
  }
}

/** Raw wikitext of each title: Map title → string, or null when the page does not exist. */
export async function fetchWikitext(titles) {
  const out = new Map()
  const todo = []
  for (const t of titles) {
    if (existsSync(cachePath(t))) out.set(t, JSON.parse(readFileSync(cachePath(t), 'utf8')).text)
    else todo.push(t)
  }
  for (let i = 0; i < todo.length; i += BATCH) {
    const batch = todo.slice(i, i + BATCH)
    const json = await apiGet({
      action: 'query',
      prop: 'revisions',
      rvprop: 'content',
      rvslots: 'main',
      redirects: '1',
      titles: batch.join('|'),
    })
    // Map requested title → canonical title (normalized/redirect).
    const alias = new Map(batch.map((t) => [t, t]))
    for (const n of json.query?.normalized ?? []) alias.set(n.from, n.to)
    for (const r of json.query?.redirects ?? []) {
      for (const [k, v] of alias) if (v === r.from) alias.set(k, r.to)
    }
    const byTitle = new Map(Object.values(json.query?.pages ?? {}).map((p) => [p.title, p]))
    for (const t of batch) {
      const page = byTitle.get(alias.get(t))
      const text =
        page?.revisions?.[0]?.slots?.main?.['*'] ??
        page?.revisions?.[0]?.slots?.main?.content ??
        null
      out.set(t, text)
      if (text !== null) {
        mkdirSync(CACHE, { recursive: true })
        writeFileSync(cachePath(t), JSON.stringify({ title: t, text }))
      }
    }
    if (i + BATCH < todo.length) await sleep(2_000)
  }
  return out
}

/** Page titles with a given prefix (namespace 0), for surveys. */
export async function listPages(prefix) {
  const titles = []
  let cont
  do {
    const json = await apiGet({
      action: 'query',
      list: 'allpages',
      apprefix: prefix,
      aplimit: '500',
      ...(cont ? { apcontinue: cont } : {}),
    })
    titles.push(...json.query.allpages.map((p) => p.title))
    cont = json.continue?.apcontinue
    if (cont) await sleep(1_000)
  } while (cont)
  return titles
}
