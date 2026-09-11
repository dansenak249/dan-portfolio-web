// Drop one category's crawled data (DESTRUCTIVE, scoped)
// --------------------------------------------------------
// POST { categoryID } -> { ok, categoryID, removedChunks, hadJob, freedApprox }
//
// Removes the census chunks, the summary, and any half-finished crawl job for a
// single category. It does NOT touch the category map entry itself: the row, its
// name, colour and position all stay, so this is "empty this category" rather
// than "forget this category".
//
// Everything it deletes is re-fetchable by pressing fetch again, which is why
// this is scoped to one category and left open like its siblings, while the
// bulk purge-legacy route requires the admin secret.
//
// The reason it exists: an abandoned crawl of a very large category leaves a job
// record holding every serviceID it has seen — over a megabyte for a category in
// the tens of thousands — and nothing else could clear it.

import { NextResponse } from 'next/server'
import {
  getCategoryMeta,
  getCategoryJob,
  purgeCategory,
} from '@/lib/vgenServiceData/store'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 0

const NO_STORE = { 'Cache-Control': 'no-store' }
const CATEGORY_ID = /^rec[A-Za-z0-9]{10,20}$/

// Rough bytes per stored service, measured on real crawls (~404 B slimmed).
const BYTES_PER_SERVICE = 404

export async function POST(request) {
  let body
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400, headers: NO_STORE })
  }

  const categoryID = String((body && body.categoryID) || '').trim()
  if (!CATEGORY_ID.test(categoryID)) {
    return NextResponse.json(
      { error: 'categoryID must be a VGen category id, e.g. rechY6VVD1EyfZbHe' },
      { status: 400, headers: NO_STORE }
    )
  }

  try {
    // Read first, so the response can say what was actually freed rather than
    // just reporting success into the void.
    const [meta, job] = await Promise.all([
      getCategoryMeta(categoryID),
      getCategoryJob(categoryID),
    ])
    const storedCount = (meta && meta.count) || (job && job.stored) || 0
    const removedChunks = (meta && meta.chunks) || 0

    await purgeCategory(categoryID)

    return NextResponse.json(
      {
        ok: true,
        categoryID,
        removedChunks,
        removedServices: storedCount,
        hadJob: !!job,
        freedApprox: storedCount * BYTES_PER_SERVICE,
      },
      { headers: NO_STORE }
    )
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json(
      { ok: false, error: `Purge failed: ${message}` },
      { status: 500, headers: NO_STORE }
    )
  }
}
