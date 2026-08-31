// Review pull for censused services (read from VGen + write to store)
// ---------------------------------------------------------------------
// POST { categoryID?, minReviews?, limit?, force? }
//   -> { done, pulled, skipped, remaining, candidates, errors, elapsedMs }
//
// The census gives every service and its price, but the review-derived metrics
// (volume, repeat clients, monthly flow) need each service's own public review
// feed — one request per service, minimum. At a few thousand services that is
// far past a single invocation, so this works in BATCHES and the caller loops
// until `done`, exactly like the category crawl.
//
// SKIPPING is what makes a daily run affordable. A service is re-pulled only
// when something can actually have changed:
//   - nothing cached yet, or
//   - the artist's review total moved since the last pull, or
//   - the cache is older than MAX_CACHE_AGE_MS (a backstop, since the artist
//     total is artist-wide and can mask a swap between two of their services).
// Everything else is left alone, so neither the fetch nor the write happens.
//
// `force: 1` ignores all of that and re-pulls the batch regardless.
//
// AUTH: intentionally open for now, mirroring the sibling service-data routes.

import { NextResponse } from 'next/server'
import { fetchServiceReviews } from '@/lib/vgenServiceData/fetchReviews'
import {
  getCategoryMap,
  getCategoryMeta,
  listCategoryServices,
  getCachedReviewsMany,
  setCachedReviews,
} from '@/lib/vgenServiceData/store'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 0
export const maxDuration = 60

const NO_STORE = { 'Cache-Control': 'no-store' }

const DEFAULT_MIN_REVIEWS = 10
const DEFAULT_LIMIT = 25 // services pulled per call
const MAX_LIMIT = 60
const FETCH_BATCH = 4 // concurrent feeds, to stay polite to Cloudflare
const READ_BATCH = 200 // cached-review reads per MGET
const MAX_CACHE_AGE_MS = 7 * 24 * 60 * 60 * 1000

// A service with hundreds of reviews pages several times, and a Cloudflare
// hiccup costs a retry on top, so `limit` alone cannot bound the call. Stop on
// the clock instead: whatever was pulled is already stored, and the caller's
// next request simply picks up the rest.
const BATCH_BUDGET_MS = 30000

async function readCachedReviews(serviceIDs) {
  const out = {}
  for (let i = 0; i < serviceIDs.length; i += READ_BATCH) {
    Object.assign(
      out,
      await getCachedReviewsMany(serviceIDs.slice(i, i + READ_BATCH))
    )
  }
  return out
}

async function censusFor(categoryID) {
  const map = await getCategoryMap()
  const wanted = categoryID
    ? map.filter((c) => c.categoryID === categoryID)
    : map
  const rows = []
  for (const entry of wanted) {
    const id = (entry.categoryID || '').trim()
    if (!id) continue
    const meta = await getCategoryMeta(id)
    if (!meta || !meta.chunks) continue
    rows.push(...(await listCategoryServices(id)))
  }
  return rows
}

// Would a fresh pull tell us anything the cache does not already say?
function needsPull(row, cached, now) {
  if (!cached) return true
  if (cached.sourceTotalReviews !== (row.artistTotalReviews ?? null)) return true
  const age = now - new Date(cached.fetchedAt || 0).getTime()
  return !isFinite(age) || age < 0 || age > MAX_CACHE_AGE_MS
}

export async function POST(request) {
  let body = {}
  try {
    body = (await request.json()) || {}
  } catch {
    // No body is fine: pull across every crawled category with the defaults.
  }

  const categoryID = String(body.categoryID || '').trim() || null
  const minReviews = isFinite(Number(body.minReviews))
    ? Math.max(0, Number(body.minReviews))
    : DEFAULT_MIN_REVIEWS
  const limit = Math.min(
    MAX_LIMIT,
    Math.max(1, Number(body.limit) || DEFAULT_LIMIT)
  )
  const force = !!body.force

  const startedNow = Date.now()
  try {
    const census = await censusFor(categoryID)
    const candidates = census.filter(
      (row) => (row.artistTotalReviews ?? 0) >= minReviews
    )
    if (!candidates.length) {
      return NextResponse.json(
        {
          ok: true,
          done: true,
          pulled: 0,
          skipped: 0,
          remaining: 0,
          candidates: 0,
          errors: [],
          elapsedMs: Date.now() - startedNow,
        },
        { headers: NO_STORE }
      )
    }

    const cached = await readCachedReviews(candidates.map((r) => r.serviceID))
    const now = Date.now()
    const stale = force
      ? candidates
      : candidates.filter((row) => needsPull(row, cached[row.serviceID], now))

    const batch = stale.slice(0, limit)
    const fetchedAt = new Date().toISOString()
    const errors = []
    let pulled = 0

    let attempted = 0
    for (let i = 0; i < batch.length; i += FETCH_BATCH) {
      if (Date.now() - startedNow > BATCH_BUDGET_MS) break
      const slice = batch.slice(i, i + FETCH_BATCH)
      attempted += slice.length
      const settled = await Promise.allSettled(
        slice.map((row) => fetchServiceReviews(row.serviceID))
      )
      for (let j = 0; j < settled.length; j++) {
        const row = slice[j]
        const result = settled[j]
        if (result.status === 'fulfilled') {
          await setCachedReviews(
            row.serviceID,
            {
              ...result.value,
              // Stamp the census total this pull corresponds to, so the next
              // run can tell whether anything moved.
              sourceTotalReviews: row.artistTotalReviews ?? null,
            },
            fetchedAt
          )
          pulled++
        } else {
          // One service's Cloudflare 403 must not abort the batch.
          errors.push({
            serviceID: row.serviceID,
            message: String(result.reason && result.reason.message),
          })
        }
      }
    }

    // Count only what was actually attempted: stopping on the clock leaves the
    // tail of the batch untouched, and reporting it as handled would end the
    // caller's loop with services still unpulled.
    const remaining = Math.max(0, stale.length - attempted)
    return NextResponse.json(
      {
        ok: true,
        done: remaining === 0,
        pulled,
        skipped: candidates.length - stale.length,
        remaining,
        candidates: candidates.length,
        errors,
        elapsedMs: Date.now() - startedNow,
      },
      { headers: NO_STORE }
    )
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json(
      { ok: false, error: `Review pull failed: ${message}` },
      { status: 502, headers: NO_STORE }
    )
  }
}
