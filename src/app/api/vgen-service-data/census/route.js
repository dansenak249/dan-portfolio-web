// Census read-back (diagnostics + the read side of the category crawl)
// ---------------------------------------------------------------------
// GET                      -> summary row per declared category
// GET ?categoryID=rec...   -> that category only
// GET ?categoryID=rec...&sample=5 -> plus the first N stored service records
//
//   -> { categories: [{ categoryID, categoryName, crawled, count, chunks,
//                       pages, duplicates, offCategory, startedAt, finishedAt,
//                       running }], totals: {...} }
//
// This exists because the crawl was otherwise WRITE-ONLY: collect stored a
// census and cleared its job, and nothing could read either back — so a finished
// crawl and a crawl that never ran looked identical from outside (both report no
// job). `crawled` is the field that separates them.
//
// `running` flags a crawl the browser left half-finished (the slice loop lives
// client-side, so a reload stops it while the cursor survives).
//
// Public read-only, like the sibling service-data routes.

import { NextResponse } from 'next/server'
import {
  getCategoryMap,
  getCategoryMeta,
  getCategoryJob,
  listCategoryServices,
} from '@/lib/vgenServiceData/store'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 0

const NO_STORE = { 'Cache-Control': 'no-store' }
const MAX_SAMPLE = 20

export async function GET(request) {
  const { searchParams } = new URL(request.url)
  const only = (searchParams.get('categoryID') || '').trim()
  const sampleSize = Math.min(
    MAX_SAMPLE,
    Math.max(0, Number(searchParams.get('sample')) || 0)
  )

  try {
    const map = await getCategoryMap()
    const wanted = only ? map.filter((c) => c.categoryID === only) : map
    // An id that is not in the map is still worth reporting on, so a crawl can
    // be inspected before it has been named.
    if (only && !wanted.length) wanted.push({ categoryID: only, categoryName: '' })

    const categories = []
    let totalServices = 0
    let totalDuplicates = 0
    let crawledCount = 0

    for (const entry of wanted) {
      const categoryID = entry.categoryID
      const [meta, job] = await Promise.all([
        getCategoryMeta(categoryID),
        getCategoryJob(categoryID),
      ])
      if (meta) {
        crawledCount++
        totalServices += meta.count || 0
        totalDuplicates += meta.duplicates || 0
      }
      const row = {
        categoryID,
        categoryName: entry.categoryName || '',
        crawled: !!meta,
        count: (meta && meta.count) || 0,
        // Everything the crawl walked, before it was trimmed to the busiest.
        seenTotal: (meta && meta.seenTotal) || (meta && meta.count) || 0,
        chunks: (meta && meta.chunks) || 0,
        pages: (meta && meta.pages) || 0,
        duplicates: (meta && meta.duplicates) || 0,
        offCategory: (meta && meta.offCategory) || 0,
        startedAt: (meta && meta.startedAt) || null,
        finishedAt: (meta && meta.finishedAt) || null,
        // A job left behind means a crawl was interrupted, not that one is
        // actively running: nothing server-side drives it forward on its own.
        running: !!job,
        // Who left the half-finished crawl. The dashboard needs it to tell
        // "the rotation will carry on by itself" apart from "nothing will
        // touch this again until you press fetch" - both look identical
        // otherwise, and calling both of them paused was misleading.
        driver: (job && job.driver) || null,
        jobPages: (job && job.pages) || 0,
        jobStored: (job && job.stored) || 0,
      }
      if (only && sampleSize) {
        const all = await listCategoryServices(categoryID)
        row.sample = all.slice(0, sampleSize)
        row.readBack = all.length
      }
      categories.push(row)
    }

    return NextResponse.json(
      {
        categories,
        totals: {
          declared: map.length,
          crawled: crawledCount,
          services: totalServices,
          duplicates: totalDuplicates,
        },
      },
      { headers: NO_STORE }
    )
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json(
      { error: `Failed to read census: ${message}` },
      { status: 500, headers: NO_STORE }
    )
  }
}
