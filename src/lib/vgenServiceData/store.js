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
