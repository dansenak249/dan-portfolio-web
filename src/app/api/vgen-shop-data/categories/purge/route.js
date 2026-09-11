// Clear one SHOP category's crawled products (destructive, deliberate)
// ---------------------------------------------------------------------
// POST { categoryID } -> { removedChunks, removedProducts, hadJob, freedApprox }
//
// The Shop twin of /api/vgen-service-data/categories/purge. It reads first so
// the answer can say what was actually freed rather than reporting success into
// the void, and it only ever touches the "shop:" key prefix — a category id
// shared with the Commission taxonomy keeps its commission census untouched.
//
// AUTH: intentionally open, mirroring the sibling routes.

import { NextResponse } from 'next/server'
import {
  getCategoryMeta,
  getCategoryJob,
  purgeCategory,
  shopKey,
} from '@/lib/vgenServiceData/store'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 0

const NO_STORE = { 'Cache-Control': 'no-store' }
const CATEGORY_ID = /^rec[A-Za-z0-9]{10,20}$/

// Measured on real slimmed product records: ~618 B each. Used only to put a
// human-readable size on the answer, never to decide anything.
const BYTES_PER_PRODUCT = 618

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

  try {
    const [meta, job] = await Promise.all([
      getCategoryMeta(key),
      getCategoryJob(key),
    ])
    const storedCount = (meta && meta.count) || (job && job.stored) || 0
    const removedChunks = (meta && meta.chunks) || 0

    await purgeCategory(key)

    return NextResponse.json(
      {
        ok: true,
        categoryID,
        removedChunks,
        removedProducts: storedCount,
        // Same field name the commission route uses, so one dashboard message
        // can report either.
        removedServices: storedCount,
        hadJob: !!job,
        freedApprox: storedCount * BYTES_PER_PRODUCT,
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
