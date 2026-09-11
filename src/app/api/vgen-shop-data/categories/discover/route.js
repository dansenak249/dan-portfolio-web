// Shop category discovery: recover VGen's SHOP category table (read-only)
// -----------------------------------------------------------------------
// POST -> { ok, source, results, total, done, knownUnavailable }
//
// VGen ships two frozen taxonomies in the same JS bundle, both under the key
// `catalogues`. The first is the Commission table (12 catalogues, 160
// categories); the second is Shop (15 catalogues, 153 categories). Reading the
// first and calling it Shop is wrong in a way that hides itself, because the
// ids are the same shape and 36 of them genuinely appear in both tables — so
// this route asks for the SECOND occurrence explicitly.
//
// There is NO page-by-page fallback here, unlike the Commission route. That
// fallback walks /category/<slug> pages, which only exist for Commission; Shop
// browses by /shop/catalogue/<slug> and exposes no per-category page carrying
// the same data. If the bundle shape changes this route fails loudly rather
// than quietly returning the wrong table.
//
// This route NEVER writes. It proposes; the operator chooses what to add and
// what to call it, because the stored map holds hand-picked names, colours and
// ordering that a discovery run must not clobber.
//
// AUTH: intentionally open, mirroring the sibling service-data routes.

import { NextResponse } from 'next/server'
import {
  fetchTaxonomy,
  flattenTaxonomy,
  TAXONOMY_SHOP,
} from '@/lib/vgenServiceData/fetchTaxonomyChunk'
import { getShopCategoryMap } from '@/lib/vgenServiceData/store'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 0
export const maxDuration = 60

const NO_STORE = { 'Cache-Control': 'no-store' }

export async function POST() {
  try {
    const rows = flattenTaxonomy(
      await fetchTaxonomy({ occurrence: TAXONOMY_SHOP })
    )
    if (!rows.length) {
      throw new Error('Shop taxonomy parsed but held no categories')
    }

    // Flag what the stored map already covers so the UI can hide it. A failure
    // here is not fatal: the client de-duplicates against its own rows anyway.
    let known = null
    try {
      const existing = await getShopCategoryMap()
      known = new Set(existing.map((entry) => entry.categoryID))
    } catch {
      // fall through with known = null
    }

    const results = rows
      .filter((row) => row.categoryID)
      .map((row) => ({ ...row, known: known ? known.has(row.categoryID) : false }))

    return NextResponse.json(
      {
        ok: true,
        source: 'bundle',
        results,
        total: results.length,
        done: true,
        errors: [],
        knownUnavailable: known === null,
      },
      { headers: NO_STORE }
    )
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json(
      { ok: false, error: `Shop category discovery failed: ${message}` },
      { status: 502, headers: NO_STORE }
    )
  }
}
