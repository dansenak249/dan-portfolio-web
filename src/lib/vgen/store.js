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
// Per-kind snapshot retention (hourly cadence => 24/day). 720 = ~30 days: rows
// older than that are dropped to save space (appendSnapshot trims past the cap).
// Storage is NOT the binding constraint (plan allows 100 GB); the real limits
// are the ~10 MB per-request cap (see batching below) and per-command billing.
// Both kinds are now lazy-read by the dashboard (latest snapshot up front, older
// loaded on demand), so trending can keep a full month like profiles.
const MAX_SNAPSHOTS = { trending: 720, profiles: 720 }
const DEFAULT_MAX_SNAPSHOTS = 720
// Compact threshold records are tiny (~250 bytes each) and ARE the long-term
// searchIndex-floor-drift signal the project tracks, so they are kept far longer
// than the heavy snapshots: ~1 year at hourly cadence is only ~2 MB.
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

// Upstash caps a single request/response at ~10 MB. A naive mget of every
// snapshot key returns ALL snapshots in ONE response (e.g. 240 trending
// snapshots x ~538 KB ~= 129 MB), which blows past that 10 MB limit and 500s
// the route. Read in small batches so each mget response stays well under it:
// 8 trending snapshots ~= 4.3 MB worst case.
const MGET_BATCH = 8

/**
 * Read every kept snapshot for a kind and flatten the rows into a single
 * array (matches the local viewer's data contract). Reads are batched to keep
 * each Upstash request under the ~10 MB per-request limit.
 * NOTE: prefer the lighter helpers below for the dashboard read path; this
 * pulls the full history (can be ~100+ MB) and is meant for the streamed export.
 * @param {'trending'|'profiles'} kind
 * @returns {Promise<object[]>}
 */
export async function listSnapshotRows(kind) {
  const r = ensureRedis()
  const ids = await r.lrange(indexKey(kind), 0, -1)
  if (!ids || ids.length === 0) return []

  const rows = []
  for (let i = 0; i < ids.length; i += MGET_BATCH) {
    const batch = ids.slice(i, i + MGET_BATCH).map((ts) => snapKey(kind, ts))
    const values = await r.mget(...batch)
    for (const value of values) {
      const list = parseMaybe(value)
      if (Array.isArray(list)) rows.push(...list)
    }
  }
  return rows
}

/**
 * The list of snapshot timestamps kept for a kind (oldest -> newest). Tiny;
 * used to populate the dashboard's snapshot picker without shipping any rows.
 * @param {'trending'|'profiles'} kind
 * @returns {Promise<string[]>}
 */
export async function listSnapshotIds(kind) {
  const r = ensureRedis()
  return (await r.lrange(indexKey(kind), 0, -1)) || []
}

/**
 * Rows of the most recent snapshot for a kind (one Redis read, ~<1 MB). This is
 * all the dashboard needs by default; older snapshots load on demand.
 * @param {'trending'|'profiles'} kind
 * @returns {Promise<object[]>}
 */
export async function listLatestSnapshotRows(kind) {
  const r = ensureRedis()
  const ts = await r.lindex(indexKey(kind), -1)
  if (!ts) return []
  const list = parseMaybe(await r.get(snapKey(kind, ts)))
  return Array.isArray(list) ? list : []
}

/**
 * Rows of one specific snapshot, loaded on demand when the user picks it.
 * @param {'trending'|'profiles'} kind
 * @param {string} ts ISO timestamp of the snapshot
 * @returns {Promise<object[]>}
 */
export async function getSnapshotRows(kind, ts) {
  const r = ensureRedis()
  const list = parseMaybe(await r.get(snapKey(kind, ts)))
  return Array.isArray(list) ? list : []
}

/**
 * The timestamp of the most recent snapshot for a kind (one tiny Redis read).
 * Used by the /status sync check so the client can skip a full /data refresh
 * when its cached latest snapshot already matches the server.
 * @param {'trending'|'profiles'} kind
 * @returns {Promise<string|null>}
 */
export async function lastSnapshotId(kind) {
  const r = ensureRedis()
  return (await r.lindex(indexKey(kind), -1)) ?? null
}

/**
 * Rows of the last N snapshots for a kind, flattened oldest -> newest. Used to
 * ship just the recent profile snapshots to the dashboard (it needs the latest
 * plus the previous one to compute per-post deltas) without pulling the whole
 * history. N stays small so the single mget response is well under ~10 MB.
 * @param {'trending'|'profiles'} kind
 * @param {number} n how many of the most recent snapshots to read
 * @returns {Promise<object[]>}
 */
export async function listRecentSnapshotRows(kind, n) {
  const r = ensureRedis()
  const ids = (await r.lrange(indexKey(kind), -n, -1)) || []
  if (ids.length === 0) return []
  const rows = []
  for (let i = 0; i < ids.length; i += MGET_BATCH) {
    const batch = ids.slice(i, i + MGET_BATCH).map((ts) => snapKey(kind, ts))
    const values = await r.mget(...batch)
    for (const value of values) {
      const list = parseMaybe(value)
      if (Array.isArray(list)) rows.push(...list)
    }
  }
  return rows
}

/**
 * Full time series for one profile post across every kept profiles snapshot,
 * oldest -> newest. Powers the per-post chart, fetched on demand so the heavy
 * profiles history never ships to the browser up front. Reads are batched via
 * iterateSnapshots (<10 MB/request).
 * NOTE: this scans all profiles snapshots; cheap at the current count but O(N)
 * in snapshots. If profiles retention grows large, append a per-post series at
 * collect time instead (mirrors the threshold series).
 * @param {string} showcaseID
 * @returns {Promise<object[]>}
 */
export async function getPostSeries(showcaseID) {
  const out = []
  for await (const { rows } of iterateSnapshots('profiles')) {
    for (const row of rows) {
      if (row && row.showcaseID === showcaseID) out.push(row)
    }
  }
  out.sort((a, b) =>
    String(a.snapshot_ts ?? '').localeCompare(String(b.snapshot_ts ?? ''))
  )
  return out
}

/**
 * Async generator yielding { ts, rows } per snapshot for a kind, oldest first,
 * reading in batches so each Upstash request stays under the ~10 MB limit. Lets
 * callers stream the full history without ever holding it all in memory.
 * @param {'trending'|'profiles'} kind
 * @returns {AsyncGenerator<{ ts: string, rows: object[] }>}
 */
export async function* iterateSnapshots(kind) {
  const r = ensureRedis()
  const ids = await r.lrange(indexKey(kind), 0, -1)
  if (!ids || ids.length === 0) return

  for (let i = 0; i < ids.length; i += MGET_BATCH) {
    const slice = ids.slice(i, i + MGET_BATCH)
    const values = await r.mget(...slice.map((ts) => snapKey(kind, ts)))
    for (let j = 0; j < slice.length; j++) {
      const list = parseMaybe(values[j])
      yield { ts: slice[j], rows: Array.isArray(list) ? list : [] }
    }
  }
}
