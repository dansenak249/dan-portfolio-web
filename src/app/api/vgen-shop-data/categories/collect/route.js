// VGen SHOP product census endpoint (read from VGen + write to store)
// --------------------------------------------------------------------
// POST { categoryID }            -> crawl ONE slice, resuming any run in flight
// POST { categoryID, reset: 1 }  -> drop the progress and start over
//
//   -> { done, pages, stored, duplicates, offCategory, total, elapsedMs }
//
// This is the Shop twin of /api/vgen-service-data/categories/collect and it
// works exactly the same way, because the two marketplaces page identically:
// keyset cursors over a strictly-descending searchIndex that VGen recomputes
// from time to time. The paging loop itself is NOT duplicated — it lives in
// fetchCategorySlice and is told which marketplace to walk, so the reshuffle
// detection has one implementation rather than two that can drift.
//
// STORAGE is namespaced by prefixing the category key with "shop:". Everything
// under it — chunks, meta, job, running top — reuses the same store functions
// the commission census uses, which is why there is no second copy of the chunk
// machinery either.
//
// ONE FETCH AT A TIME, ACROSS BOTH MARKETPLACES. Shop and Commission share a
// single bandwidth budget, so they share the single fetch lease rather than
// each holding their own: a Shop crawl blocks a Commission crawl and vice
// versa, which is the intended behaviour, not a limitation.
//
// A CRAWL NEVER BLANKS WHAT IS ALREADY THERE: starting one clears the progress
// but leaves the stored census alone, so the table keeps showing the previous
// result until this run has something to replace it with.
//
// AUTH: intentionally open, mirroring the sibling routes.

import { NextResponse } from 'next/server'
import {
  fetchCategorySlice,
  SHOP_SOURCE,
  productScore,
} from '@/lib/vgenServiceData/fetchCategory'
import {
  CHUNK_SIZE,
  acquireFetchLock,
  getCategoryJob,
  setCategoryJob,
  clearCategoryJob,
  getCategoryTop,
  setCategoryTop,
  clearCategoryTop,
  setCategoryChunk,
  getCategoryMeta,
  setCategoryMeta,
  deleteCategoryChunks,
  shopKey,
} from '@/lib/vgenServiceData/store'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 0
export const maxDuration = 60

const NO_STORE = { 'Cache-Control': 'no-store' }

const MAX_PAGES_PER_CALL = 25
const SLICE_BUDGET_MS = 30000
const CENSUS_KEEP = 1000

const CATEGORY_ID = /^rec[A-Za-z0-9]{10,20}$/

function mergeTop(top, incoming) {
  const byID = new Map()
  for (const row of top) byID.set(row.productID, row)
  for (const row of incoming) byID.set(row.productID, row)
  const merged = [...byID.values()]
  merged.sort((a, b) => productScore(b) - productScore(a))
  return merged.slice(0, CENSUS_KEEP)
}

function couldChangeTop(rows, topCount, topMin) {
  if (topCount < CENSUS_KEEP) return true
  if (typeof topMin !== 'number') return true
  for (const row of rows) if (productScore(row) > topMin) return true
  return false
}

export async function POST(request) {
  let body
  try {
    body = await request.json()
  } catch {
    return NextResponse.json(
      { error: 'Invalid JSON body' },
      { status: 400, headers: NO_STORE }
    )
  }

  const categoryID = String((body && body.categoryID) || '').trim()
  if (!CATEGORY_ID.test(categoryID)) {
    return NextResponse.json(
      { error: 'categoryID must be a VGen category id, e.g. recJcjgLldEHRtLUu' },
      { status: 400, headers: NO_STORE }
    )
  }
  const key = shopKey(categoryID)

  const holder = String((body && body.holder) || '').trim() ||
    'direct:' + Math.random().toString(36).slice(2)
  const lockKind = (body && body.lockKind) || 'direct'
  const startedNow = Date.now()
  try {
  // Inside the try: taking the lease talks to Redis, and an unreachable Redis
  // must come back as JSON the caller can read, not as a bare 500.
    const lease = await acquireFetchLock(holder, lockKind, { categoryID })
    if (!lease.ok) {
      return NextResponse.json(
        {
          ok: false,
          busy: true,
          error: 'Another fetch holds the lease: ' + (lease.reason || 'busy'),
          heldBy: lease.lock
            ? { kind: lease.lock.kind, categoryID: lease.lock.categoryID, label: lease.lock.label }
            : null,
        },
        { status: 409, headers: NO_STORE }
      )
    }


    const existing = await getCategoryJob(key)
    const forceReset = !!(body && body.reset)
    const resuming = !forceReset && !!existing
    if (!resuming) {
      await clearCategoryJob(key)
      await clearCategoryTop(key)
    }

    const job = resuming
      ? existing
      : {
          categoryID,
          cursor: null,
          pages: 0,
          stored: 0,
          duplicates: 0,
          offCategory: 0,
          driver: lockKind,
          lastIndex: null,
          reshuffles: 0,
          topCount: 0,
          topMin: null,
          startedAt: new Date().toISOString(),
        }

    const slice = await fetchCategorySlice(categoryID, {
      source: SHOP_SOURCE,
      cursor: job.cursor,
      maxPages: MAX_PAGES_PER_CALL,
      maxMs: SLICE_BUDGET_MS,
      lastIndex: job.lastIndex ?? null,
    })

    let topCount = job.topCount || 0
    let topMin = job.topMin ?? null
    let top = null
    const merging = couldChangeTop(slice.services, topCount, topMin)
    if (merging) {
      top = mergeTop(await getCategoryTop(key), slice.services)
      await setCategoryTop(key, top)
      topCount = top.length
      topMin = top.length ? productScore(top[top.length - 1]) : null
    }

    const totals = {
      pages: job.pages + slice.pages,
      stored: job.stored + slice.services.length,
      duplicates: job.duplicates + slice.duplicates,
      offCategory: job.offCategory + slice.offCategory,
      reshuffles: (job.reshuffles || 0) + slice.reshuffles,
    }

    if (slice.done) {
      if (top === null) top = await getCategoryTop(key)
      if (!top.length && totals.stored > 0) {
        throw new Error(
          'refusing to finish: walked ' + totals.stored + ' products but the ' +
            'running top is empty'
        )
      }

      const prevMeta = await getCategoryMeta(key)
      const prevChunks = (prevMeta && prevMeta.chunks) || 0

      let chunkIndex = 0
      for (let i = 0; i < top.length; i += CHUNK_SIZE) {
        await setCategoryChunk(key, chunkIndex++, top.slice(i, i + CHUNK_SIZE))
      }

      await setCategoryMeta(key, {
        categoryID,
        count: top.length,
        seenTotal: totals.stored,
        keep: CENSUS_KEEP,
        chunks: chunkIndex,
        pages: totals.pages,
        duplicates: totals.duplicates,
        offCategory: totals.offCategory,
        reshuffles: totals.reshuffles,
        startedAt: job.startedAt,
        finishedAt: new Date().toISOString(),
      })

      if (prevChunks > chunkIndex) {
        await deleteCategoryChunks(key, chunkIndex, prevChunks - 1)
      }
      await clearCategoryJob(key)
      await clearCategoryTop(key)
    } else {
      await setCategoryJob(key, {
        ...job,
        driver: lockKind,
        cursor: slice.nextCursor,
        lastIndex: slice.lastIndex,
        topCount,
        topMin,
        ...totals,
      })
    }

    return NextResponse.json(
      {
        ok: true,
        categoryID,
        done: slice.done,
        resumed: resuming,
        merged: merging,
        kept: topCount,
        stoppedOnTime: slice.stoppedOnTime,
        pagesThisCall: slice.pages,
        elapsedMs: Date.now() - startedNow,
        ...totals,
        total: totals.stored,
      },
      { headers: NO_STORE }
    )
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    // The job is deliberately LEFT IN PLACE on failure: its cursor is a valid
    // resume point, so the next call picks up instead of re-crawling from zero.
    return NextResponse.json(
      { ok: false, error: `Shop crawl failed: ${message}` },
      { status: 502, headers: NO_STORE }
    )
  }
}

// GET ?ids=recA,recB -> { jobs: { recA: {...} | null, ... } }
export async function GET(request) {
  const { searchParams } = new URL(request.url)
  const ids = (searchParams.get('ids') || '')
    .split(',')
    .map((value) => value.trim())
    .filter((value) => CATEGORY_ID.test(value))

  if (!ids.length) {
    return NextResponse.json({ jobs: {} }, { headers: NO_STORE })
  }

  try {
    const jobs = {}
    for (const categoryID of ids) {
      const job = await getCategoryJob(shopKey(categoryID))
      jobs[categoryID] = job
        ? {
            categoryID,
            driver: job.driver || 'manual',
            pages: job.pages || 0,
            stored: job.stored || 0,
            duplicates: job.duplicates || 0,
            startedAt: job.startedAt || null,
          }
        : null
    }
    return NextResponse.json({ jobs }, { headers: NO_STORE })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json(
      { error: `Failed to read shop jobs: ${message}` },
      { status: 502, headers: NO_STORE }
    )
  }
}
