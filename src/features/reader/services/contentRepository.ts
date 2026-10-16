/**
 * The only place that knows where text comes from. Content is JSON written
 * by `scripts/ingest-sefaria.mjs` into public/content/, which the web export
 * serves from the same origin. Native builds point EXPO_PUBLIC_CONTENT_BASE_URL
 * at the deployed site until content is bundled for offline use.
 */
const BASE = process.env.EXPO_PUBLIC_CONTENT_BASE_URL ?? ''

const cache = new Map<string, Promise<unknown>>()

/** Fetches `/content/<path>` once (failures are not cached, so a retry can succeed). */
export function loadContent<T>(path: string): Promise<T | null> {
  let pending = cache.get(path) as Promise<T | null> | undefined
  if (!pending) {
    pending = fetch(`${BASE}/content/${path}`)
      .then((res) => (res.ok ? (res.json() as Promise<T>) : null))
      .catch(() => null)
    pending.then((value) => value === null && cache.delete(path))
    cache.set(path, pending)
  }
  return pending
}
