// VGen service-data category map endpoint (read public, write protected)
// ----------------------------------------------------------------------
// GET  -> { categories: [{ categoryID, categoryName, color }, ...] }  (public, RO)
// POST -> replace the whole category map (add / rename / recolor / remove / reorder
//         in one shot). Body:
//           { categories: [{ categoryID, categoryName, color }, ...] }
//
// The map turns VGen's opaque `searchCategoryID` (e.g. "recJrGyjhKdztjqv1") into a
// readable name. The dashboard's Service Type dropdown is built from these names,
// so editing here (via the GUI) is what lets you name a category WITHOUT pushing
// code. An empty categoryName is allowed: it just parks an id you've seen but not
// named yet (shows as "unmapped" in the dropdown until you fill it in).
//
// `color` is an optional `#RRGGBB` hex used to tint the classify text in the
// dashboard. Empty/invalid colors are dropped (stored as '') so the UI falls back
// to its default text color.
//
// AUTH: intentionally open for now, mirroring the services endpoint. This is a
// personal, noindex research tool; auth will be added later as part of a unified
// /tools login.

import { NextResponse } from 'next/server'
import { getCategoryMap, setCategoryMap } from '@/lib/vgenServiceData/store'
import { sanitizeCategories } from '@/lib/vgenServiceData/categoryMap'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 0

// Shape rules live in one place so the Commission and Shop maps cannot drift
// apart; see lib/vgenServiceData/categoryMap.js.

export async function GET() {
  try {
    const categories = await getCategoryMap()
    return NextResponse.json(
      { categories },
      { headers: { 'Cache-Control': 'no-store' } }
    )
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Unknown read error'
    return NextResponse.json(
      { error: `Failed to load categories: ${message}` },
      { status: 500 }
    )
  }
}

export async function POST(request) {
  let body
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const categories = sanitizeCategories(body && body.categories)
  if (categories === null) {
    return NextResponse.json(
      {
        error:
          'Body must be { categories: [{ categoryID, categoryName, color }, ...] }',
      },
      { status: 400 }
    )
  }

  try {
    await setCategoryMap(categories)
    return NextResponse.json(
      { ok: true, categories },
      { headers: { 'Cache-Control': 'no-store' } }
    )
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Unknown write error'
    return NextResponse.json({ ok: false, error: message }, { status: 500 })
  }
}
