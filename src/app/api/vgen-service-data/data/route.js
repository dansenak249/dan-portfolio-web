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
//
// SIGNAL FILTER: services with fewer than MIN_SERVICE_REVIEWS reviews are treated
// as low-signal noise and dropped from the analysis output AND the artist rollups
// (they never reach aggregation). Declared services are still fetched/cached as
// usual; the threshold only gates what the analysis returns, so raising/lowering
// it later re-reveals the same cached data with no re-fetch.

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
} from '@/lib/vgenServiceData/store'
import { analyzeService, aggregateByArtist } from '@/lib/vgenServiceData/analyze'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 0

const NO_STORE = { 'Cache-Control': 'no-store' }
// Fetch services in small concurrent batches to stay polite to VGen/Cloudflare
// and under the serverless time budget.
const FETCH_BATCH = 4
// Minimum review count for a service to count as signal. Anything below this is
// dropped as junk before the analysis + artist aggregation run.
const MIN_SERVICE_REVIEWS = 10

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

  try {
    const services = await getServices()
    const now = Date.now()
    const fetchedAt = new Date(now).toISOString()

    let refreshErrors = []
    if (wantRefresh) {
      refreshErrors = await refreshAll(services, fetchedAt)
    }

    // Batch-read all cached review payloads in ONE round trip (was N sequential
    // GETs). Fresh if we just refreshed above.
    const serviceIDs = services.map((s) => s.serviceID)
    const reviewsMap = await getCachedReviewsMany(serviceIDs)

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
            artistUserID: null,
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

    // Drop low-signal services (junk) before anything downstream sees them, so
    // both the service table AND the artist rollups only reflect services that
    // cleared the review threshold.
    const keptMetrics = serviceMetrics.filter(
      (sm) => sm.total >= MIN_SERVICE_REVIEWS
    )
    const filteredOut = serviceMetrics.length - keptMetrics.length

    const artists = aggregateByArtist(keptMetrics, reviewsByService)

    const artistIDs = new Set()
    for (const sm of keptMetrics) if (sm.artistUserID) artistIDs.add(sm.artistUserID)
    const { nameMap, handleMap } = await resolveArtistNames(artistIDs)
    for (const sm of keptMetrics) {
      sm.artistName = (sm.artistUserID && nameMap[sm.artistUserID]) || null
      sm.artistHandle = (sm.artistUserID && handleMap[sm.artistUserID]) || null
    }
    for (const a of artists) {
      a.artistName = (a.artistUserID && nameMap[a.artistUserID]) || null
      a.artistHandle = (a.artistUserID && handleMap[a.artistUserID]) || null
    }

    return NextResponse.json(
      {
        refreshed: wantRefresh,
        lastFetchedAt,
        serviceCount: services.length,
        minReviews: MIN_SERVICE_REVIEWS,
        filteredOut,
        missing,
        refreshErrors,
        services: keptMetrics,
        artists,
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
