// VGen snapshot store (Upstash Redis)
// -----------------------------------
// Matches the existing project convention (api/1minutes/.../route.js):
// read the connection from KV_REST_API_URL / KV_REST_API_TOKEN, which
// Vercel auto-injects when an Upstash store is linked. Locally these come
// from `.env.local` (gitignored).
//
// Storage layout (one Redis list of ids + one key per snapshot):
//   vgen:<kind>:index           -> Redis list of snapshot timestamps (oldest->newest)
//   vgen:<kind>:snap:<ts>       -> JSON array of that snapshot's rows
//   vgen:watchlist              -> JSON array of { userID, label }
//   vgen:lock                   -> short-lived run lock (prevents overlap)
//
// Retention caps the number of kept snapshots so the free-tier database
// stays well under its size limit.

import { Redis } from '@upstash/redis'

const NS = 'vgen'
// Per-kind snapshot retention (hourly cadence => 24/day).
//   profiles: 720 ~= 30 days. The per-post trajectory charts read PROFILES, so
//             the watchlist needs a full month to satisfy the "keep >= 1 month"
//             goal. ~200 rows/snapshot (~128 KB) => ~92 MB at 720.
//   trending: 240 ~= 10 days. These are heavy (1000 rows, ~538 KB/snapshot).
//             Their long-term value (the searchIndex floor / cut points) is
//             preserved for ~1 year in the tiny threshold series below, so the
//             full 1000-row lists do not need month-long retention. ~129 MB at 240.
// Combined steady-state ~= 223 MB, under the ~256 MB free-tier ceiling.
const MAX_SNAPSHOTS = { trending: 240, profiles: 720 }
const DEFAULT_MAX_SNAPSHOTS = 240
// Compact threshold records are tiny (~250 bytes each), so keep a much longer
// history than the heavy full snapshots: ~1 year at hourly cadence is ~2 MB.
const MAX_THRESHOLD = 8760
const LOCK_TTL_SEC = 300 // a collect run must finish within 5 min

const HAS_KV = Boolean(
  process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN
)

// Instantiate once at module scope — Next.js keeps the route handler warm
// between requests on the same instance, so we avoid re-creating the client.
const redis = HAS_KV
  ? new Redis({
      url: process.env.KV_REST_API_URL,
      token: process.env.KV_REST_API_TOKEN,
    })
  : null

// Seed list ported from the in-tab profile collector. Used only on first
// boot when vgen:watchlist is empty; edit live via setWatchlist afterwards.
const DEFAULT_WATCHLIST = [
  { userID: '62c4dbaf-bd73-4be1-8629-477c0146d771', label: 'Dan @Dansenak249' },
  { userID: '30783d06-aa56-4ddc-b382-1a38ba564e29', label: 'PalcLikht @palcLikht' },
  { userID: '1351ac42-18d8-4e74-a095-4aade09e4988', label: 'Cuppy卡皮 @CuppyArt' },
  { userID: '6aefc6b1-1a93-49eb-9a90-6f65019b9bc9', label: 'ThangKim @ThangKim' },
  { userID: '22d3507a-f714-4c1a-ac1d-e425fb0c19e0', label: 'Mubai羊羊 @mubai' },
  { userID: '6590d5ce-c0cf-4eff-9b85-e3bffe12475e', label: 'Omorphia @Omorphia' },
  { userID: '891c14dc-0f96-4d0e-87f9-621651ad09f2', label: 'LongTaoShiFu @LONGTAOSHIHU' },
  { userID: 'b4dbe09b-d10c-4979-94dd-f347c6c364a4', label: 'isechoX @isechoX' },
  { userID: '4b992f84-8aa1-4be0-9bd4-eb2b3d5a676d', label: 'kiyu🍀 @kiiyuuuw' },
  { userID: 'f1f56266-0716-47f8-a29c-612c6658d4f6', label: '88 Studio @EightyEightDesign' },
]

const indexKey = (kind) => `${NS}:${kind}:index`
const snapKey = (kind, ts) => `${NS}:${kind}:snap:${ts}`
const THRESHOLD_KEY = `${NS}:threshold:series`
const WATCHLIST_KEY = `${NS}:watchlist`
const LOCK_KEY = `${NS}:lock`

function ensureRedis() {
  if (!redis) {
    throw new Error(
      'Upstash Redis is not configured (missing KV_REST_API_URL / KV_REST_API_TOKEN)'
    )
  }
  return redis
}

// Upstash auto-parses JSON object values, but a value written as a raw
// string comes back as a string — tolerate both.
function parseMaybe(value) {
  if (value == null) return null
  return typeof value === 'string' ? JSON.parse(value) : value
}

/**
 * Try to claim the run lock so two collect runs never overlap.
 * @returns {Promise<boolean>} true if the lock was acquired
 */
export async function acquireLock() {
  const r = ensureRedis()
  const ok = await r.set(LOCK_KEY, new Date().toISOString(), {
    nx: true,
    ex: LOCK_TTL_SEC,
  })
  return ok === 'OK' || ok === true
}

export async function releaseLock() {
  await ensureRedis().del(LOCK_KEY)
}

/**
 * @returns {Promise<{ userID: string, label: string }[]>}
 */
export async function getWatchlist() {
  const r = ensureRedis()
  const stored = parseMaybe(await r.get(WATCHLIST_KEY))
  if (Array.isArray(stored) && stored.length > 0) return stored
  await r.set(WATCHLIST_KEY, JSON.stringify(DEFAULT_WATCHLIST))
  return DEFAULT_WATCHLIST
}

/**
 * @param {{ userID: string, label: string }[]} list
 */
export async function setWatchlist(list) {
  await ensureRedis().set(WATCHLIST_KEY, JSON.stringify(list))
}

/**
 * Persist one snapshot's rows and register it in the index, then drop the
 * oldest snapshots beyond the retention cap.
 * @param {'trending'|'profiles'} kind
 * @param {string} ts ISO timestamp identifying the snapshot
 * @param {object[]} rows
 * @returns {Promise<{ kept: number }>}
 */
export async function appendSnapshot(kind, ts, rows) {
  const r = ensureRedis()
  await r.set(snapKey(kind, ts), JSON.stringify(rows))
  await r.rpush(indexKey(kind), ts)

  const cap = MAX_SNAPSHOTS[kind] ?? DEFAULT_MAX_SNAPSHOTS
  let len = await r.llen(indexKey(kind))
  while (len > cap) {
    const oldest = await r.lpop(indexKey(kind))
    if (!oldest) break
    await r.del(snapKey(kind, oldest))
    len--
  }
  return { kept: len }
}

/**
 * Append one compact threshold record to the long-retention series and trim
 * to the cap. Stored separately from the heavy snapshots so the searchIndex
 * floor / cutoffs can be tracked far longer than the 240-snapshot window.
 * @param {null | object} record output of thresholdRecord(); a no-op if null
 * @returns {Promise<{ kept: number }>}
 */
export async function appendThreshold(record) {
  if (!record) return { kept: 0 }
  const r = ensureRedis()
  await r.rpush(THRESHOLD_KEY, JSON.stringify(record))
  const len = await r.llen(THRESHOLD_KEY)
  if (len > MAX_THRESHOLD) {
    await r.ltrim(THRESHOLD_KEY, len - MAX_THRESHOLD, -1)
    return { kept: MAX_THRESHOLD }
  }
  return { kept: len }
}

/**
 * Read the full threshold-over-time series (oldest -> newest).
 * @returns {Promise<object[]>}
 */
export async function listThreshold() {
  const r = ensureRedis()
  const items = await r.lrange(THRESHOLD_KEY, 0, -1)
  if (!items || items.length === 0) return []
  const out = []
  for (const value of items) {
    const rec = parseMaybe(value)
    if (rec) out.push(rec)
  }
  return out
}

/**
 * Read every kept snapshot for a kind and flatten the rows into a single
 * array (matches the local viewer's data contract).
 * @param {'trending'|'profiles'} kind
 * @returns {Promise<object[]>}
 */
export async function listSnapshotRows(kind) {
  const r = ensureRedis()
  const ids = await r.lrange(indexKey(kind), 0, -1)
  if (!ids || ids.length === 0) return []

  const keys = ids.map((ts) => snapKey(kind, ts))
  const values = await r.mget(...keys)

  const rows = []
  for (const value of values) {
    const list = parseMaybe(value)
    if (Array.isArray(list)) rows.push(...list)
  }
  return rows
}
