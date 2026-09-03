// VGen service-data store (Upstash Redis)
// ---------------------------------------
// Sibling of src/lib/vgen/store.js but for the competitor-analysis tool. Same
// connection convention (KV_REST_API_URL / KV_REST_API_TOKEN, injected by Vercel
// when an Upstash store is linked; locally from `.env.local`).
//
// Unlike the trending collector, review data is append-only and self-timestamped
// on VGen's side: one full fetch already yields the complete history, so there
// are NO periodic snapshots here. We just cache the latest full pull per service
// and overwrite it on refresh.
//
// Storage layout:
//   vgsd:services            -> JSON array of { serviceID, categoryID, serviceName }
//                               (categoryID is VGen's opaque searchCategoryID; the
//                                readable type is resolved DYNAMICALLY from the
//                                category map so a rename never unlinks a service.
//                                serviceName is the harvested title, kept so the
//                                dashboard can show which listing a row is)
//   vgsd:reviews:<serviceID> -> JSON { serviceID, artistUserID, count, reviews, fetchedAt }
//   vgsd:meta:<serviceID>    -> JSON { serviceID, artistUserID, count, fetchedAt } (lightweight)
//
// The watchlist is NOT seeded with defaults (empty is a valid state); the user
// declares services manually in the dashboard.

import { Redis } from '@upstash/redis'

const NS = 'vgsd'

const HAS_KV = Boolean(
  process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN
)

const redis = HAS_KV
  ? new Redis({
      url: process.env.KV_REST_API_URL,
      token: process.env.KV_REST_API_TOKEN,
    })
  : null

const SERVICES_KEY = `${NS}:services`
const CATEGORIES_KEY = `${NS}:categories`
const reviewsKey = (serviceID) => `${NS}:reviews:${serviceID}`
const metaKey = (serviceID) => `${NS}:meta:${serviceID}`
const artistKey = (userID) => `${NS}:artist:${userID}`

function ensureRedis() {
  if (!redis) {
    throw new Error(
      'Upstash Redis is not configured (missing KV_REST_API_URL / KV_REST_API_TOKEN)'
    )
  }
  return redis
}

// Upstash auto-parses JSON object values, but a value written as a raw string
// comes back as a string — tolerate both.
function parseMaybe(value) {
  if (value == null) return null
  return typeof value === 'string' ? JSON.parse(value) : value
}

/**
 * The declared service watchlist. Empty is valid (no default seeding).
 * @returns {Promise<{ serviceID: string, categoryID: string, serviceName: string }[]>}
 */
export async function getServices() {
  const stored = parseMaybe(await ensureRedis().get(SERVICES_KEY))
  return Array.isArray(stored) ? stored : []
}

/**
 * @param {{ serviceID: string, categoryID?: string, serviceName?: string }[]} list
 */
export async function setServices(list) {
  await ensureRedis().set(SERVICES_KEY, JSON.stringify(list))
}

/**
 * The category map: VGen's opaque searchCategoryID -> a readable name, edited
 * from the dashboard GUI (so no code push is needed to rename a category).
 * Stored as an ordered array to preserve the editor's row order. Empty is valid.
 * @returns {Promise<{ categoryID: string, categoryName: string, color?: string }[]>}
 */
export async function getCategoryMap() {
  const stored = parseMaybe(await ensureRedis().get(CATEGORIES_KEY))
  return Array.isArray(stored) ? stored : []
}

/**
 * @param {{ categoryID: string, categoryName: string, color?: string }[]} list
 */
export async function setCategoryMap(list) {
  await ensureRedis().set(CATEGORIES_KEY, JSON.stringify(list))
}

/**
 * Cache one service's full review pull (overwrites any previous pull).
 * @param {string} serviceID
 * @param {{ artistUserID: string|null, count: number, reviews: object[] }} payload
 * @param {string} fetchedAt ISO timestamp of this fetch
 */
export async function setCachedReviews(serviceID, payload, fetchedAt) {
  const r = ensureRedis()
  const record = {
    serviceID,
    artistUserID: payload.artistUserID ?? null,
    count: payload.count ?? (payload.reviews ? payload.reviews.length : 0),
    reviews: Array.isArray(payload.reviews) ? payload.reviews : [],
    fetchedAt,
    // The census's artist review total AT THE TIME OF THIS PULL. The next run
    // compares it against the fresh census to decide whether anything can have
    // changed, which is what lets an unchanged service be skipped instead of
    // re-fetched and re-written.
    sourceTotalReviews: payload.sourceTotalReviews ?? null,
  }
  await r.set(reviewsKey(serviceID), JSON.stringify(record))
  // Lightweight meta lets the dashboard show freshness without loading reviews.
  await r.set(
    metaKey(serviceID),
    JSON.stringify({
      serviceID,
      artistUserID: record.artistUserID,
      count: record.count,
      fetchedAt,
      // Mirrored here so a freshness check can read the tiny meta record
      // instead of the full review payload.
      sourceTotalReviews: record.sourceTotalReviews,
    })
  )
}

/**
 * Read one service's cached review pull, or null if never fetched.
 * @param {string} serviceID
 * @returns {Promise<null | { serviceID: string, artistUserID: string|null, count: number, reviews: object[], fetchedAt: string }>}
 */
export async function getCachedReviews(serviceID) {
  const stored = parseMaybe(await ensureRedis().get(reviewsKey(serviceID)))
  return stored && typeof stored === 'object' ? stored : null
}

/**
 * Batch-read many services' cached review pulls in ONE round trip (Redis MGET)
 * instead of N sequential GETs. This is what keeps a plain page load fast as the
 * watchlist grows (sequential per-service reads were the dominant load-time cost).
 * @param {string[]} serviceIDs
 * @returns {Promise<Object<string, null | object>>} map serviceID -> record|null
 */
export async function getCachedReviewsMany(serviceIDs) {
  const ids = Array.isArray(serviceIDs) ? serviceIDs : []
  const out = {}
  if (!ids.length) return out
  const values = await ensureRedis().mget(...ids.map(reviewsKey))
  ids.forEach((id, i) => {
    const v = parseMaybe(values[i])
    out[id] = v && typeof v === 'object' ? v : null
  })
  return out
}

/**
 * Batch-read the lightweight freshness records.
 *
 * Deciding whether a service needs re-pulling only needs its last-fetched time
 * and the review total it was fetched against — a couple of hundred bytes. The
 * full cached payload carries every review, so reading those in bulk sends
 * megabytes per batch and trips Upstash's 10 MB request ceiling on services with
 * long review histories. This reads the meta records instead.
 *
 * @param {string[]} serviceIDs
 * @returns {Promise<Object<string, null | object>>}
 */
export async function getMetaMany(serviceIDs) {
  const ids = Array.isArray(serviceIDs) ? serviceIDs : []
  const out = {}
  if (!ids.length) return out
  const values = await ensureRedis().mget(...ids.map(metaKey))
  ids.forEach((id, i) => {
    const v = parseMaybe(values[i])
    out[id] = v && typeof v === 'object' ? v : null
  })
  return out
}

/**
 * Lightweight freshness record for one service (no reviews array).
 * @param {string} serviceID
 * @returns {Promise<null | { serviceID: string, artistUserID: string|null, count: number, fetchedAt: string }>}
 */
export async function getMeta(serviceID) {
  const stored = parseMaybe(await ensureRedis().get(metaKey(serviceID)))
  return stored && typeof stored === 'object' ? stored : null
}

/**
 * Drop a service's cached reviews + meta (called when it leaves the watchlist).
 * @param {string} serviceID
 */
export async function purgeService(serviceID) {
  const r = ensureRedis()
  await r.del(reviewsKey(serviceID))
  await r.del(metaKey(serviceID))
}

/**
 * Cached artist display name (resolved from the portfolio endpoint on refresh),
 * or null if never resolved. Kept separate so a name lookup is a cheap read and
 * survives across refreshes without re-fetching every time.
 * @param {string} userID
 * @returns {Promise<null | { userID: string, username: string|null, displayName: string|null }>}
 */
export async function getArtistName(userID) {
  const stored = parseMaybe(await ensureRedis().get(artistKey(userID)))
  return stored && typeof stored === 'object' ? stored : null
}

/**
 * Batch-read many artists' cached names in ONE round trip (Redis MGET). Used on
 * every request to resolve display names without N sequential reads.
 * @param {string[]} userIDs
 * @returns {Promise<Object<string, null | { userID: string, username: string|null, displayName: string|null }>>}
 */
export async function getArtistNamesMany(userIDs) {
  const ids = Array.isArray(userIDs) ? userIDs : []
  const out = {}
  if (!ids.length) return out
  const values = await ensureRedis().mget(...ids.map(artistKey))
  ids.forEach((id, i) => {
    const v = parseMaybe(values[i])
    out[id] = v && typeof v === 'object' ? v : null
  })
  return out
}

/**
 * @param {string} userID
 * @param {{ username: string|null, displayName: string|null }} name
 */
export async function setArtistName(userID, name) {
  await ensureRedis().set(
    artistKey(userID),
    JSON.stringify({
      userID,
      username: name.username ?? null,
      displayName: name.displayName ?? null,
    })
  )
}

// ---------------------------------------------------------------------------
// Category listing layer (the census produced by fetchCategory.js)
// ---------------------------------------------------------------------------
// Layout:
//   vgsd:cat:<categoryID>:meta       -> { categoryID, count, chunks, pages,
//                                         duplicates, offCategory, startedAt,
//                                         finishedAt }
//   vgsd:cat:<categoryID>:chunk:<i>  -> slim service records (CHUNK_SIZE each)
//   vgsd:cat:<categoryID>:job        -> in-progress crawl state
//
// Services are stored in CHUNKS rather than one key per service. A category runs
// to a few thousand services; one key each would mean thousands of Redis writes
// per refresh (the metered cost here is commands, not bytes), while one key for
// the whole category would push a single value past the request size limit.
// A few hundred per chunk keeps both in bounds.
const CHUNK_SIZE = 300

const catMetaKey = (categoryID) => `${NS}:cat:${categoryID}:meta`
const catChunkKey = (categoryID, i) => `${NS}:cat:${categoryID}:chunk:${i}`
const catJobKey = (categoryID) => `${NS}:cat:${categoryID}:job`
// The best CENSUS_KEEP services found so far, carried through a running crawl.
// Kept OUT of the job record on purpose: the job is read and written on every
// slice, while this is only touched when a slice actually beats the current
// worst score - which, after the first few slices, it usually does not.
const catTopKey = (categoryID) => `${NS}:cat:${categoryID}:top`

/**
 * In-progress crawl state, or null when no crawl is running.
 * @param {string} categoryID
 */
export async function getCategoryJob(categoryID) {
  const stored = parseMaybe(await ensureRedis().get(catJobKey(categoryID)))
  return stored && typeof stored === 'object' ? stored : null
}

/**
 * @param {string} categoryID
 * @param {object} job
 */
export async function setCategoryJob(categoryID, job) {
  await ensureRedis().set(catJobKey(categoryID), JSON.stringify(job))
}

/** @param {string} categoryID */
export async function clearCategoryJob(categoryID) {
  await ensureRedis().del(catJobKey(categoryID))
}

/**
 * Write one chunk of slim service records.
 * @param {string} categoryID
 * @param {number} index
 * @param {object[]} services
 */
export async function setCategoryChunk(categoryID, index, services) {
  await ensureRedis().set(catChunkKey(categoryID, index), JSON.stringify(services))
}

/**
 * The finished census summary for one category, or null if never crawled.
 * @param {string} categoryID
 */
export async function getCategoryMeta(categoryID) {
  const stored = parseMaybe(await ensureRedis().get(catMetaKey(categoryID)))
  return stored && typeof stored === 'object' ? stored : null
}

/**
 * @param {string} categoryID
 * @param {object} meta
 */
export async function setCategoryMeta(categoryID, meta) {
  await ensureRedis().set(catMetaKey(categoryID), JSON.stringify(meta))
}

/**
 * Read every stored service for one category (all chunks, in order). Chunks are
 * read in ONE round trip so load time stays flat as a category grows.
 * @param {string} categoryID
 * @returns {Promise<object[]>}
 */
export async function listCategoryServices(categoryID) {
  const meta = await getCategoryMeta(categoryID)
  if (!meta || !meta.chunks) return []
  const keys = []
  for (let i = 0; i < meta.chunks; i++) keys.push(catChunkKey(categoryID, i))
  const values = await ensureRedis().mget(...keys)
  const out = []
  // Duplicates are only suppressed within a crawl slice, so a service can land
  // in two chunks when VGen reshuffles mid-crawl. De-duplicate on the way out;
  // first occurrence wins.
  const seen = new Set()
  for (const value of values) {
    const rows = parseMaybe(value)
    if (!Array.isArray(rows)) continue
    for (const row of rows) {
      if (!row || typeof row.serviceID !== 'string') continue
      if (seen.has(row.serviceID)) continue
      seen.add(row.serviceID)
      out.push(row)
    }
  }
  return out
}

/**
 * Read chunks 0..count-1 without consulting meta.
 *
 * listCategoryServices() derives the chunk count from meta, which is only
 * written once a crawl finishes — so a crawl that wants to read back what it
 * just stored cannot use it. Doing so returned an empty list and, in the trim
 * step, took that to mean "nothing to keep".
 *
 * @param {string} categoryID
 * @param {number} count number of chunks written
 * @returns {Promise<object[]>}
 */
export async function readCategoryChunks(categoryID, count) {
  const out = []
  const seen = new Set()
  for await (const rows of iterateCategoryChunks(categoryID, count)) {
    for (const row of rows) {
      if (seen.has(row.serviceID)) continue
      seen.add(row.serviceID)
      out.push(row)
    }
  }
  return out
}

// How many chunks to pull per round trip while streaming. Twenty chunks is a few
// megabytes: enough to be efficient, small enough that a category in the
// hundreds of thousands never lands in memory all at once.
const CHUNK_READ_BATCH = 20
// Keys per DEL command. Same reasoning as CHUNK_READ_BATCH: bounded so one
// command cannot grow past what the server will accept.
const DELETE_BATCH = 20

/**
 * Yield stored services a batch of chunks at a time.
 *
 * readCategoryChunks() loads everything at once, which is fine for a few
 * thousand services and impossible for a few hundred thousand — a single MGET of
 * every chunk would be tens of megabytes inside one serverless invocation. The
 * trim step streams instead, so its cost is bounded by the batch rather than by
 * how large the category turned out to be.
 *
 * @param {string} categoryID
 * @param {number} count number of chunks written
 */
export async function* iterateCategoryChunks(categoryID, count) {
  if (!count) return
  const r = ensureRedis()
  for (let start = 0; start < count; start += CHUNK_READ_BATCH) {
    const keys = []
    for (let i = start; i < Math.min(start + CHUNK_READ_BATCH, count); i++) {
      keys.push(catChunkKey(categoryID, i))
    }
    const values = await r.mget(...keys)
    for (const value of values) {
      const rows = parseMaybe(value)
      if (!Array.isArray(rows)) continue
      yield rows.filter((row) => row && typeof row.serviceID === 'string')
    }
  }
}

/**
 * The running top-N of an in-flight crawl, or [] if there is none.
 * @param {string} categoryID
 * @returns {Promise<object[]>}
 */
export async function getCategoryTop(categoryID) {
  const stored = parseMaybe(await ensureRedis().get(catTopKey(categoryID)))
  return Array.isArray(stored) ? stored : []
}

/**
 * Replace the running top-N.
 * @param {string} categoryID
 * @param {object[]} rows
 */
export async function setCategoryTop(categoryID, rows) {
  await ensureRedis().set(catTopKey(categoryID), JSON.stringify(rows))
}

/**
 * Drop the running top-N. Called once a crawl finishes and its result has been
 * written to chunks, so a finished category does not keep a second copy.
 * @param {string} categoryID
 */
export async function clearCategoryTop(categoryID) {
  await ensureRedis().del(catTopKey(categoryID))
}

/**
 * Delete chunks from `fromIndex` upward. Used after a crawl trims itself down to
 * the busiest services: the earlier, larger run left chunks the shorter one no
 * longer covers, and meta.chunks alone would just orphan them.
 * @param {string} categoryID
 * @param {number} fromIndex
 * @param {number} throughIndex last index to try, inclusive
 */
export async function deleteCategoryChunks(categoryID, fromIndex, throughIndex) {
  const r = ensureRedis()
  // Batched: one round trip per DELETE_BATCH keys rather than per key. A
  // category that once held hundreds of chunks made this the slowest step in
  // the whole crawl, at one Upstash round trip apiece.
  const keys = []
  for (let i = fromIndex; i <= throughIndex; i++) keys.push(catChunkKey(categoryID, i))
  for (let i = 0; i < keys.length; i += DELETE_BATCH) {
    await r.del(...keys.slice(i, i + DELETE_BATCH))
  }
}

/**
 * Drop a category's stored census (chunks + meta + any half-finished job). Used
 * before a fresh crawl so a shrunk category cannot leave stale rows behind.
 * @param {string} categoryID
 */
export async function purgeCategory(categoryID) {
  const r = ensureRedis()
  const meta = await getCategoryMeta(categoryID)
  const chunks = (meta && meta.chunks) || 0
  if (chunks) await deleteCategoryChunks(categoryID, 0, chunks - 1)
  await r.del(catMetaKey(categoryID))
  await r.del(catJobKey(categoryID))
  await r.del(catTopKey(categoryID))
}

export { CHUNK_SIZE }

// ---------------------------------------------------------------------------
// Exchange-rate cache
// ---------------------------------------------------------------------------
// VGen's rate matrix is ~347 KB and its numbers move slowly, so the reduced
// "<CODE> -> USD" map is cached and only refetched when stale. Cached, not
// stored per price: basePrice + currency stay raw in the census, so re-rating is
// always just a re-render.
const FX_KEY = `${NS}:fx`

/** @returns {Promise<null | { fetchedAt: string, count: number, rates: Record<string, number> }>} */
export async function getExchangeRates() {
  const stored = parseMaybe(await ensureRedis().get(FX_KEY))
  return stored && typeof stored === 'object' ? stored : null
}

/** @param {{ fetchedAt: string, count: number, rates: Record<string, number> }} payload */
export async function setExchangeRates(payload) {
  await ensureRedis().set(FX_KEY, JSON.stringify(payload))
}

// ---------------------------------------------------------------------------
// Rotation state
// ---------------------------------------------------------------------------
// Where the automatic refresh has got to: which category it is working on and
// whether it is still crawling the listing or pulling reviews.
//
// Deliberately just a cursor into the work, not a schedule. Each tick reads it,
// does ONE bounded slice, and writes it back — so a missed tick, an overlapping
// tick, or a deploy mid-run costs at most a repeated slice. Nothing has to
// detect that a category "finished"; the state says what is left to do.
const ROTATION_KEY = `${NS}:rotation`

/**
 * @returns {Promise<null | { categoryID: string|null, phase: string, startedAt: string,
 *   updatedAt: string, cycles: number, lastNote: string|null }>}
 */
export async function getRotation() {
  const stored = parseMaybe(await ensureRedis().get(ROTATION_KEY))
  return stored && typeof stored === 'object' ? stored : null
}

/** @param {object} state */
export async function setRotation(state) {
  await ensureRedis().set(ROTATION_KEY, JSON.stringify(state))
}

/** Stop the rotation entirely. */
export async function clearRotation() {
  await ensureRedis().del(ROTATION_KEY)
}

// ---------------------------------------------------------------------------
// Legacy cleanup
// ---------------------------------------------------------------------------
// Keys written by the OLD flow (declare services one by one, then pull each
// service's review feed). The category census replaces all of it: services now
// arrive from the crawl, and artist names ride along in the listing instead of
// needing their own lookup + cache.
//
// Everything still in use is deliberately absent from this list:
//   vgsd:categories  the hand-curated category map (names + colours)
//   vgsd:cat:*       the new census (chunks / meta / in-flight jobs)
//   vgsd:fx          the cached exchange rates
// Note `vgsd:meta:*` matches only the old per-service freshness records; the
// census keys are `vgsd:cat:<id>:meta`, which that pattern does not touch.
const LEGACY_PATTERNS = [
  `${NS}:services`,
  `${NS}:reviews:*`,
  `${NS}:meta:*`,
  `${NS}:artist:*`,
]

const SCAN_COUNT = 200

async function scanKeys(pattern) {
  const r = ensureRedis()
  const found = []
  let cursor = '0'
  do {
    const [next, keys] = await r.scan(cursor, {
      match: pattern,
      count: SCAN_COUNT,
    })
    cursor = String(next)
    if (Array.isArray(keys)) found.push(...keys)
    // Upstash returns '0' when the sweep is complete.
  } while (cursor !== '0')
  return found
}

/**
 * Find (and optionally delete) every key left over from the pre-census flow.
 *
 * @param {object} [options]
 * @param {boolean} [options.dryRun] when true, only report what WOULD go
 * @returns {Promise<{ dryRun: boolean, deleted: number, byPattern: Record<string, number>, sample: string[] }>}
 */
export async function purgeLegacyServiceData(options = {}) {
  const { dryRun = true } = options
  const r = ensureRedis()

  const byPattern = {}
  const all = []
  for (const pattern of LEGACY_PATTERNS) {
    const keys = await scanKeys(pattern)
    byPattern[pattern] = keys.length
    all.push(...keys)
  }

  if (!dryRun) {
    for (const key of all) await r.del(key)
  }

  return {
    dryRun,
    deleted: dryRun ? 0 : all.length,
    found: all.length,
    byPattern,
    // A short sample so the caller can eyeball that nothing unexpected matched.
    sample: all.slice(0, 10),
  }
}
