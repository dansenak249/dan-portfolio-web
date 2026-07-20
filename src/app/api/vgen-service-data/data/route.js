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
  getCachedReviews,
  setCachedReviews,
  getArtistName,
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
          serviceType: svc.serviceType,
          message: String(result.reason && result.reason.message),
        })
      }
    }
  }
  return errors
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

    // Build analysis from whatever is cached now (fresh if we just refreshed).
    const serviceMetrics = []
    const reviewsByService = {}
    const missing = []
    for (const svc of services) {
      const cached = await getCachedReviews(svc.serviceID)
      if (!cached) {
        missing.push(svc.serviceID)
        serviceMetrics.push(
          analyzeService({
            serviceID: svc.serviceID,
            serviceType: svc.serviceType,
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
          serviceType: svc.serviceType,
          artistUserID: cached.artistUserID,
          reviews: cached.reviews,
          now,
        })
      )
    }

    const artists = aggregateByArtist(serviceMetrics, reviewsByService)

    // Resolve human-readable artist names. We look up any artist we don't have a
    // cached name for yet on EVERY request (not just refresh) so names appear on
    // a normal page load too. This is best-effort and self-healing:
    //   - a successful lookup (even one returning null fields for an artist with
    //     no public showcase) is cached, so we never re-fetch it;
    //   - a failed lookup (intermittent Cloudflare 403) caches nothing, so the
    //     next read retries until one succeeds.
    // Cost is bounded: only missing names are fetched, and names cache forever.
    const artistIDs = new Set()
    for (const sm of serviceMetrics) if (sm.artistUserID) artistIDs.add(sm.artistUserID)
    for (const id of artistIDs) {
      const existing = await getArtistName(id)
      if (existing) continue
      try {
        const profile = await fetchArtistProfile(id)
        await setArtistName(id, profile)
      } catch {
        // Ignore: name is cosmetic, the survey still works without it.
      }
    }
    const nameMap = {}
    for (const id of artistIDs) {
      const n = await getArtistName(id)
      if (n) nameMap[id] = n.displayName || n.username || null
    }
    for (const sm of serviceMetrics) {
      sm.artistName = (sm.artistUserID && nameMap[sm.artistUserID]) || null
    }
    for (const a of artists) {
      a.artistName = (a.artistUserID && nameMap[a.artistUserID]) || null
    }

    // Freshest cache timestamp across services (for a "last updated" label).
    let lastFetchedAt = null
    for (const svc of services) {
      const cached = await getCachedReviews(svc.serviceID)
      if (cached && cached.fetchedAt) {
        if (!lastFetchedAt || cached.fetchedAt > lastFetchedAt) {
          lastFetchedAt = cached.fetchedAt
        }
      }
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
