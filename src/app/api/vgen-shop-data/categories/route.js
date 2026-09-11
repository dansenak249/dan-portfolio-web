// VGen SHOP category map endpoint (read public, write open)
// ---------------------------------------------------------
// GET  -> { categories: [{ categoryID, categoryName, color, defaultName, auto }] }
// POST -> replace the whole Shop map in one shot, same body shape.
//
// This is the Shop twin of /api/vgen-service-data/categories, and it is a
// SEPARATE table on purpose: VGen ships two taxonomies, one for Commission and
// one for Shop. They overlap — 36 of the 63 Shop categories seen in a 1,200
// product sample also exist on the Commission side — but Shop carries 27 that
// Commission has no notion of at all (YCH Bases, Pens + Brushes, Carrd
// Templates, Minecraft Skins, eBooks...). Storing them in one list would mean a
// Commission crawl and a Shop crawl fighting over the same rows.
//
// The row SHAPE is deliberately identical, so the editor, the crawl and the
// single rotation can treat a row from either table the same way. The shared
// rules live in lib/vgenServiceData/categoryMap.js.
//
// AUTH: intentionally open, mirroring the sibling service-data routes.

import { NextResponse } from 'next/server'
import {
  getShopCategoryMap,
  setShopCategoryMap,
} from '@/lib/vgenServiceData/store'
import { sanitizeCategories } from '@/lib/vgenServiceData/categoryMap'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 0

const NO_STORE = { 'Cache-Control': 'no-store' }

export async function GET() {
  try {
    const categories = await getShopCategoryMap()
    return NextResponse.json({ categories }, { headers: NO_STORE })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown read error'
    return NextResponse.json(
      { error: `Failed to load shop categories: ${message}` },
      { status: 500, headers: NO_STORE }
    )
  }
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

  const categories = sanitizeCategories(body && body.categories)
  if (categories === null) {
    return NextResponse.json(
      {
        error:
          'Body must be { categories: [{ categoryID, categoryName, color }, ...] }',
      },
      { status: 400, headers: NO_STORE }
    )
  }

  try {
    await setShopCategoryMap(categories)
    return NextResponse.json({ ok: true, categories }, { headers: NO_STORE })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown write error'
    return NextResponse.json(
      { ok: false, error: message },
      { status: 500, headers: NO_STORE }
    )
  }
}
