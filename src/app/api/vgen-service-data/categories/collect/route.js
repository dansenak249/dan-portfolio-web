// VGen category census endpoint (read from VGen + write to store)
// -----------------------------------------------------------------
// POST { categoryID }            -> crawl ONE slice, resuming any run in flight
// POST { categoryID, reset: 1 }  -> drop the stored census and start over
//
//   -> { done, pages, stored, duplicates, offCategory, total, elapsedMs }
//
// WHY SLICES: a mid-sized category is ~2700 services = ~136 pages ≈ 4 minutes,
// which no serverless invocation can hold. Because VGen pages by keyset cursor,
// a run resumes exactly where it stopped, so the crawl is cut into
// MAX_PAGES_PER_CALL-sized slices and the CLIENT loops until `done` is true.
// That is also what gives the dashboard something to show while it works.
//
// WHY duplicates MATTER: VGen periodically recomputes the sort key it pages by.
// A crawl that spans a recompute re-serves rows it already passed AND silently
// skips rows that jumped above the cursor. The duplicate count is the only
// visible symptom, so it is returned on every slice and summed into the meta —
// `duplicates > 0` means the census is holed and the category should be re-run.
//
// AUTH: intentionally open for now, mirroring the sibling service-data routes.
// This is a personal, noindex research tool; auth arrives with a unified /tools
// login.

import { NextResponse } from 'next/server'
import { fetchCategorySlice } from '@/lib/vgenServiceData/fetchCategory'
import {
  CHUNK_SIZE,
  getCategoryJob,
  setCategoryJob,
  clearCategoryJob,
  setCategoryChunk,
  setCategoryMeta,
  purgeCategory,
} from '@/lib/vgenServiceData/store'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 0
// Slices are sized to finish well inside this; the ceiling is a safety net.
export const maxDuration = 60

const NO_STORE = { 'Cache-Control': 'no-store' }

// Page budget per call. Measured ~0.7s/page including the politeness gap, so 25
// pages lands around 18s — comfortably inside the function budget even when a
// page needs a retry.
const MAX_PAGES_PER_CALL = 25

// VGen category ids are opaque Airtable-style ids ("rechY6VVD1EyfZbHe").
const CATEGORY_ID = /^rec[A-Za-z0-9]{10,20}$/

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
      { error: 'categoryID must be a VGen category id, e.g. rechY6VVD1EyfZbHe' },
      { status: 400, headers: NO_STORE }
    )
  }

  const startedNow = Date.now()
  try {
    // Resume takes priority: a half-finished job holds a valid cursor, so
    // continuing it is always cheaper than re-crawling. Only an explicit
    // `reset` (or having nothing to resume) starts from zero, and a fresh start
    // purges first so a shrunk category cannot leave orphaned chunks behind.
    const existing = await getCategoryJob(categoryID)
    const forceReset = !!(body && body.reset)
    const resuming = !forceReset && !!existing
    if (!resuming) await purgeCategory(categoryID)

    const job = resuming
      ? existing
      : {
          categoryID,
          cursor: null,
          pages: 0,
          stored: 0,
          duplicates: 0,
          offCategory: 0,
          chunkIndex: 0,
          seen: [],
          buffer: [],
          startedAt: new Date().toISOString(),
        }

    // `seen` must span the WHOLE crawl, not just this slice, or the duplicate
    // count (our only data-loss alarm) would reset on every call.
    const seen = new Set(job.seen)
    const slice = await fetchCategorySlice(categoryID, {
      cursor: job.cursor,
      maxPages: MAX_PAGES_PER_CALL,
      seen,
    })

    const buffer = job.buffer.concat(slice.services)
    let chunkIndex = job.chunkIndex

    // Flush every FULL chunk now; the remainder rides along in the job until the
    // next slice fills it (or the crawl finishes and writes a short final chunk).
    let offset = 0
    while (buffer.length - offset >= CHUNK_SIZE) {
      await setCategoryChunk(
        categoryID,
        chunkIndex++,
        buffer.slice(offset, offset + CHUNK_SIZE)
      )
      offset += CHUNK_SIZE
    }
    const rest = buffer.slice(offset)

    const totals = {
      pages: job.pages + slice.pages,
      stored: job.stored + slice.services.length,
      duplicates: job.duplicates + slice.duplicates,
      offCategory: job.offCategory + slice.offCategory,
    }

    if (slice.done) {
      if (rest.length) await setCategoryChunk(categoryID, chunkIndex++, rest)
      await setCategoryMeta(categoryID, {
        categoryID,
        count: totals.stored,
        chunks: chunkIndex,
        pages: totals.pages,
        duplicates: totals.duplicates,
        offCategory: totals.offCategory,
        startedAt: job.startedAt,
        finishedAt: new Date().toISOString(),
      })
      await clearCategoryJob(categoryID)
    } else {
      await setCategoryJob(categoryID, {
        ...job,
        cursor: slice.nextCursor,
        chunkIndex,
        seen: [...seen],
        buffer: rest,
        ...totals,
      })
    }

    return NextResponse.json(
      {
        ok: true,
        categoryID,
        done: slice.done,
        resumed: resuming,
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
      { ok: false, error: `Category crawl failed: ${message}` },
      { status: 502, headers: NO_STORE }
    )
  }
}

// GET ?ids=recA,recB -> { jobs: { recA: {...} | null, recB: ... } }
//
// Reports which categories have a crawl left half-finished. The slice loop runs
// in the BROWSER, so a reload (or a closed tab) stops it while the server-side
// cursor survives; the dashboard calls this on load to spot those and pick the
// loop back up instead of silently abandoning the work.
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
      const job = await getCategoryJob(categoryID)
      // Only the progress counters go out; `seen` and `buffer` are crawl
      // internals and would be megabytes on the wire.
      jobs[categoryID] = job
        ? {
            categoryID,
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
      { error: `Failed to read crawl jobs: ${message}` },
      { status: 500, headers: NO_STORE }
    )
  }
}
