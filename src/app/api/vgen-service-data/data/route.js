// VGen service-data read/refresh endpoint
// ---------------------------------------
// GET               -> analysis built from CACHED reviews only (fast, no VGen hit).
// GET ?refresh=1    -> fetch every declared service live from VGen, cache the
//                      pulls, then build the analysis from the fresh data.
//
// Refresh is on-demand (page reload with ?refresh=1, or a manual button) — there
// is NO cron here. Per-service fetches use allSettled so one service's Cloudflare
// 403 (intermittent) is isolated as a per-service error instead of failing the
// whole survey.
//
// PERFORMANCE: a plain page load reads every service's cached reviews and every
// artist's cached name. Doing that with per-item sequential GETs was the dominant
// load-time cost (~1 min at 300 services = ~600-800 sequential Upstash round
// trips). We now batch: ONE MGET for all review payloads and ONE MGET for all
// cached artist names, then fetch ONLY the still-missing names concurrently. This
// keeps load time roughly flat as the watchlist grows.
//
// AUTH: intentionally open for now. This is a personal, noindex research tool;
// auth will be added later as part of a unified /tools login. Until then refresh
// is unauthenticated (mirrors the existing 1minutes timeline tool).

import { NextResponse } from 'next/server'
import {
  fetchServiceReviews,
  fetchArtistProfile,
} from '@/lib/vgenServiceData/fetchReviews'
import {
  getServices,
  getCachedReviewsMany,
  setCachedReviews,
  getArtistNamesMany,
  setArtistName,
  getCategoryMap,
  getCategoryMeta,
  listCategoryServices,
} from '@/lib/vgenServiceData/store'
import { analyzeService, aggregateByArtist } from '@/lib/vgenServiceData/analyze'
import { serviceScore } from '@/lib/vgenServiceData/fetchCategory'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 0

const NO_STORE = { 'Cache-Control': 'no-store' }
// Fetch services in small concurrent batches to stay polite to VGen/Cloudflare
// and under the serverless time budget.
const FETCH_BATCH = 4

// Default review floor. The census keeps EVERY service VGen lists; this decides
// which ones are worth computing on. It reads artistTotalReviews, which is an
// ARTIST-level total and therefore an upper bound on the service's own count —
// so the gate can let a service through that turns out to be quieter, but it can
// never hide one that qualifies.
const DEFAULT_MIN_REVIEWS = 10

// Cached-review reads are batched. The analysis genuinely needs every review,
// so these payloads cannot be avoided here - but a busy service carries hundreds
// of them, and 200 at a time pushed a single MGET past Upstash's 10 MB request
// ceiling. Smaller batches mean more round trips and no oversized request.
const READ_BATCH = 25

// Ceiling on how many services one response may carry. A census category can
// hold tens of thousands of services; returning them all would mean a
// multi-megabyte payload built in a serverless function and parsed in the
// browser on every page load. Past this, the highest-review services are kept
// and the response says it was truncated, so the shortfall is visible instead of
// looking like missing data. Raise the review floor to see further down.
const MAX_SERVICES_RETURNED = 1000

// Ceiling on how many services one unqualified ?refresh=1 will pull reviews for.
// A full census is far past what a single request can fetch, so the refresh
// becomes incremental: each call takes the next uncached slice.
const MAX_REFRESH_PER_CALL = 40

/**
 * Build the working service list from the category census.
 * Returns [] when nothing has been crawled yet, which is the caller's signal to
 * fall back to the legacy declared list so the dashboard is never blanked.
 */
async function listCensusServices() {
  const map = await getCategoryMap()
  const rows = []
  // What the crawls actually walked, before each was trimmed to its busiest.
  // Without it "1000 services" reads the same whether the category holds 2,700
  // or 200,000 - and those mean very different things about how representative
  // the sample is.
  let seenTotal = 0
  for (const entry of map) {
    const categoryID = (entry.categoryID || '').trim()
    if (!categoryID) continue
    const meta = await getCategoryMeta(categoryID)
    if (!meta || !meta.chunks) continue // never crawled: nothing to read
    seenTotal += meta.seenTotal || meta.count || 0
    rows.push(...(await listCategoryServices(categoryID)))
  }
  return { rows, seenTotal }
}

// Read cached reviews for many services without building one oversized command.
async function readCachedReviews(serviceIDs) {
  const out = {}
  for (let i = 0; i < serviceIDs.length; i += READ_BATCH) {
    const slice = serviceIDs.slice(i, i + READ_BATCH)
    Object.assign(out, await getCachedReviewsMany(slice))
  }
  return out
}

// Live-fetch every declared service, caching each successful pull. Failures are
// isolated per service (Cloudflare 403 etc.) and returned as errors[].
async function refreshAll(services, fetchedAt) {
  const errors = []
  for (let i = 0; i < services.length; i += FETCH_BATCH) {
    const batch = services.slice(i, i + FETCH_BATCH)
    const settled = await Promise.allSettled(
      batch.map((s) => fetchServiceReviews(s.serviceID))
    )
    for (let j = 0; j < settled.length; j++) {
      const svc = batch[j]
      const result = settled[j]
      if (result.status === 'fulfilled') {
        await setCachedReviews(svc.serviceID, result.value, fetchedAt)
      } else {
        errors.push({
          serviceID: svc.serviceID,
          categoryID: svc.categoryID,
          message: String(result.reason && result.reason.message),
        })
      }
    }
  }
  return errors
}

// Resolve human-readable artist names. Cached names are read in ONE MGET; only
// the artists we still have no cached name for are fetched live (concurrently,
// in small batches). This is best-effort and self-healing:
//   - a successful lookup (even one returning null fields for an artist with no
//     public showcase) is cached, so we never re-fetch it;
//   - a failed lookup (intermittent Cloudflare 403) caches nothing, so the next
//     read retries until one succeeds.
// Returns { nameMap, handleMap }: artistUserID -> display string
// (displayName || username) and artistUserID -> bare username (the VGen profile
// handle, i.e. vgen.co/<username>). Both entries are null when unknown.
async function resolveArtistNames(artistIDs) {
  const ids = [...artistIDs]
  const nameMap = {}
  const handleMap = {}
  if (!ids.length) return { nameMap, handleMap }

  const cached = await getArtistNamesMany(ids)
  const missing = ids.filter((id) => !cached[id])

  // Fetch only the missing names, in small concurrent batches.
  for (let i = 0; i < missing.length; i += FETCH_BATCH) {
    const batch = missing.slice(i, i + FETCH_BATCH)
    const settled = await Promise.allSettled(
      batch.map((id) => fetchArtistProfile(id))
    )
    for (let j = 0; j < settled.length; j++) {
      const id = batch[j]
      const result = settled[j]
      if (result.status === 'fulfilled') {
        await setArtistName(id, result.value)
        cached[id] = {
          userID: id,
          username: result.value.username ?? null,
          displayName: result.value.displayName ?? null,
        }
      }
      // On failure: leave uncached so a later request retries.
    }
  }

  for (const id of ids) {
    const n = cached[id]
    if (n) {
      nameMap[id] = n.displayName || n.username || null
      handleMap[id] = n.username || null
    }
  }
  return { nameMap, handleMap }
}

export async function GET(request) {
  const { searchParams } = new URL(request.url)
  const wantRefresh = searchParams.get('refresh') === '1'
  // Optional `ids` (comma-separated) narrows a refresh to just those services,
  // so adding one new service fetches only that service instead of re-pulling
  // the whole watchlist. Absent = refresh everything (the ↻ Refresh button).
  const idsParam = searchParams.get('ids')
  const onlyIDs = idsParam
    ? new Set(
        idsParam
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean)
      )
    : null

  // Review floor for what gets COMPUTED. The census still stores every service;
  // this only decides what the dashboard works on. `minReviews=0` shows all.
  const minParam = searchParams.get('minReviews')
  const minReviews =
    minParam === null || minParam === '' || !isFinite(Number(minParam))
      ? DEFAULT_MIN_REVIEWS
      : Math.max(0, Number(minParam))

  try {
    // Prefer the census produced by the category crawl. While nothing has been
    // crawled yet, fall back to the legacy declared list so the dashboard is
    // never blanked mid-migration.
    const { rows: census, seenTotal: censusSeenTotal } = await listCensusServices()
    const usingCensus = census.length > 0
    const censusByID = {}
    for (const row of census) censusByID[row.serviceID] = row

    const gated = usingCensus
      ? census.filter((row) => (row.artistTotalReviews ?? 0) >= minReviews)
      : await getServices()

    // Keep the busiest listings when trimming: an arbitrary slice would drop
    // exactly the services the survey is about.
    const truncated = gated.length > MAX_SERVICES_RETURNED
    const services = truncated
      ? [...gated]
          .sort((a, b) => serviceScore(b) - serviceScore(a))
          .slice(0, MAX_SERVICES_RETURNED)
      : gated

    const now = Date.now()
    const fetchedAt = new Date(now).toISOString()

    let refreshErrors = []
    let refreshedCount = 0
    if (wantRefresh) {
      let toFetch = onlyIDs
        ? services.filter((s) => onlyIDs.has(s.serviceID))
        : services
      // With a census in play an unqualified refresh would mean thousands of
      // review pulls in one request, which cannot finish. Cap it, and spend the
      // budget on services with nothing cached yet so repeated calls make
      // progress instead of re-pulling the same head of the list.
      if (!onlyIDs && toFetch.length > MAX_REFRESH_PER_CALL) {
        const already = await readCachedReviews(toFetch.map((s) => s.serviceID))
        toFetch = toFetch
          .filter((s) => !already[s.serviceID])
          .slice(0, MAX_REFRESH_PER_CALL)
      }
      refreshedCount = toFetch.length
      refreshErrors = await refreshAll(toFetch, fetchedAt)
    }

    // Batch-read all cached review payloads in ONE round trip (was N sequential
    // GETs). Fresh if we just refreshed above.
    const serviceIDs = services.map((s) => s.serviceID)
    const reviewsMap = await readCachedReviews(serviceIDs)

    const serviceMetrics = []
    const reviewsByService = {}
    const missing = []
    let lastFetchedAt = null
    for (const svc of services) {
      const cached = reviewsMap[svc.serviceID]
      if (!cached) {
        missing.push(svc.serviceID)
        serviceMetrics.push(
          analyzeService({
            serviceID: svc.serviceID,
            serviceType: svc.categoryID,
            // The census carries the artist even with no reviews pulled yet, so
            // a freshly crawled service still shows who it belongs to.
            artistUserID: svc.userID || null,
            reviews: [],
            now,
          })
        )
        reviewsByService[svc.serviceID] = []
        continue
      }
      reviewsByService[svc.serviceID] = cached.reviews
      serviceMetrics.push(
        analyzeService({
          serviceID: svc.serviceID,
          serviceType: svc.categoryID,
          artistUserID: cached.artistUserID,
          reviews: cached.reviews,
          now,
        })
      )
      // Track the freshest cache timestamp from the records we already loaded
      // (no second read pass needed).
      if (cached.fetchedAt && (!lastFetchedAt || cached.fetchedAt > lastFetchedAt)) {
        lastFetchedAt = cached.fetchedAt
      }
    }

    // Carry over what the census knows and the review analysis cannot: price,
    // currency and the listing title.
    for (const sm of serviceMetrics) {
      const row = censusByID[sm.serviceID]
      if (!row) continue
      sm.basePrice = row.basePrice ?? null
      sm.currency = row.currency || ''
      sm.serviceName = row.serviceName || ''
      // Completed commissions for this service, where VGen publishes them.
      sm.completedComms = row.serviceCompletedComms ?? null
    }

    const artists = aggregateByArtist(serviceMetrics, reviewsByService)

    // Only artists the census does NOT already name need a lookup. The crawl
    // brings username/displayName along with every listing, so on a censused
    // dashboard this set is usually empty — which is what keeps a few thousand
    // services from turning into a few thousand profile requests.
    const artistIDs = new Set()
    for (const sm of serviceMetrics) {
      const row = censusByID[sm.serviceID]
      if (row && (row.displayName || row.username)) continue
      if (sm.artistUserID) artistIDs.add(sm.artistUserID)
    }
    const { nameMap, handleMap } = await resolveArtistNames(artistIDs)

    const nameFor = (userID, row) =>
      (row && (row.displayName || row.username)) ||
      (userID && nameMap[userID]) ||
      null
    const handleFor = (userID, row) =>
      (row && row.username) || (userID && handleMap[userID]) || null

    for (const sm of serviceMetrics) {
      const row = censusByID[sm.serviceID]
      sm.artistName = nameFor(sm.artistUserID, row)
      sm.artistHandle = handleFor(sm.artistUserID, row)
    }
    // Artist rollups have no single census row; fall back to any listing by them.
    const censusByUser = {}
    for (const row of census) {
      if (row.userID && !censusByUser[row.userID]) censusByUser[row.userID] = row
    }
    for (const a of artists) {
      const row = a.artistUserID ? censusByUser[a.artistUserID] : null
      a.artistName = nameFor(a.artistUserID, row)
      a.artistHandle = handleFor(a.artistUserID, row)
    }
    return NextResponse.json(
      {
        refreshed: wantRefresh,
        lastFetchedAt,
        serviceCount: services.length,
        missing,
        refreshErrors,
        services: serviceMetrics,
        artists,
        // Where the list came from, so the UI can say "2709 crawled, 1460 shown"
        // instead of silently looking empty when the floor is set too high.
        source: usingCensus ? 'census' : 'legacy',
        minReviews,
        censusTotal: census.length,
        // Everything the crawls walked, as opposed to what was kept.
        censusSeenTotal,
        matchedCount: gated.length,
        truncated,
        refreshedCount,
      },
      { headers: NO_STORE }
    )
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json(
      { error: `Failed to build service data: ${message}` },
      { status: 500, headers: NO_STORE }
    )
  }
}
