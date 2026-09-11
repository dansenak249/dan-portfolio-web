// SHOP census read-back (the read side of the product crawl)
// -----------------------------------------------------------
// GET                    -> one summary row per category in the Shop map
// GET ?categoryID=rec... -> that category only
//
//   -> { categories: [{ categoryID, crawled, count, seenTotal, chunks, pages,
//                       duplicates, reshuffles, startedAt, finishedAt,
//                       running, jobStored }], totals: {...} }
//
// The Shop twin of /api/vgen-service-data/census, reading the same store
// through the "shop:" key prefix. `crawled` separates a finished crawl from one
// that never ran — both report no job, so the job alone cannot tell them apart.
// `running` flags a crawl left half-finished, whether by a closed browser tab
// or by the rotation between its ticks.
//
// AUTH: public read-only, mirroring the sibling routes.

import { NextResponse } from 'next/server'
import {
  getCategoryMeta,
  getCategoryJob,
  getShopCategoryMap,
  shopKey,
} from '@/lib/vgenServiceData/store'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 0

const NO_STORE = { 'Cache-Control': 'no-store' }
const CATEGORY_ID = /^rec[A-Za-z0-9]{10,20}$/

export async function GET(request) {
  const { searchParams } = new URL(request.url)
  const only = (searchParams.get('categoryID') || '').trim()

  try {
    const map = await getShopCategoryMap()
    let wanted = map
      .map((entry) => ({
        categoryID: (entry.categoryID || '').trim(),
        categoryName: entry.categoryName || '',
      }))
      .filter((entry) => entry.categoryID)

    if (only) {
      if (!CATEGORY_ID.test(only)) {
        return NextResponse.json(
          { error: 'categoryID must be a VGen category id' },
          { status: 400, headers: NO_STORE }
        )
      }
      wanted = wanted.filter((entry) => entry.categoryID === only)
      // Asking about a category that is not in the map yet is legitimate: the
      // dashboard does it right after a crawl of a row still being edited.
      if (!wanted.length) wanted = [{ categoryID: only, categoryName: '' }]
    }

    const categories = []
    let totalProducts = 0
    let crawledCount = 0

    for (const entry of wanted) {
      const key = shopKey(entry.categoryID)
      const [meta, job] = await Promise.all([
        getCategoryMeta(key),
        getCategoryJob(key),
      ])
      if (meta) {
        crawledCount++
        totalProducts += meta.count || 0
      }
      categories.push({
        categoryID: entry.categoryID,
        categoryName: entry.categoryName,
        crawled: !!meta,
        count: (meta && meta.count) || 0,
        // Everything the crawl walked, as opposed to what it kept.
        seenTotal: (meta && meta.seenTotal) || (meta && meta.count) || 0,
        chunks: (meta && meta.chunks) || 0,
        pages: (meta && meta.pages) || 0,
        duplicates: (meta && meta.duplicates) || 0,
        reshuffles: (meta && meta.reshuffles) || 0,
        startedAt: (meta && meta.startedAt) || null,
        finishedAt: (meta && meta.finishedAt) || null,
        running: !!job,
        // Who left the half-finished crawl. The dashboard needs it to tell
        // "the rotation will carry on by itself" apart from "nothing will
        // touch this again until you press fetch" - both look identical
        // otherwise, and calling both of them paused was misleading.
        driver: (job && job.driver) || null,
        jobStored: (job && job.stored) || 0,
      })
    }

    return NextResponse.json(
      {
        categories,
        totals: {
          categories: categories.length,
          crawled: crawledCount,
          products: totalProducts,
        },
      },
      { headers: NO_STORE }
    )
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json(
      { error: `Failed to read shop census: ${message}` },
      { status: 502, headers: NO_STORE }
    )
  }
}
