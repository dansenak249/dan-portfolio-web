// Category discovery: recover VGen's whole category table (read-only)
// ---------------------------------------------------------------------
// POST -> { results, total, done, source, knownUnavailable }
//
// VGen publishes no category endpoint, but it ships the entire tree as one
// frozen literal in its client bundle, so a single pass returns all 160
// categories with their names, hierarchy and variant options. That replaces an
// earlier version which fetched ~160 category pages one at a time; the page
// method survives in fetchCategoryTaxonomy.js as the fallback, because bundle
// internals are not a contract and can change without notice.
//
// This route NEVER writes. It proposes, and the operator chooses what to add and
// what to call it — the stored map holds hand-picked names, colours and ordering
// that a discovery run must not clobber.
//
// AUTH: intentionally open for now, mirroring the sibling service-data routes.

import { NextResponse } from 'next/server'
import {
  fetchTaxonomy,
  flattenTaxonomy,
} from '@/lib/vgenServiceData/fetchTaxonomyChunk'
import {
  fetchCategorySlugs,
  fetchCategoryNames,
  resolveCategorySlice,
} from '@/lib/vgenServiceData/fetchCategoryTaxonomy'
import { getCategoryMap } from '@/lib/vgenServiceData/store'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 0
export const maxDuration = 60

const NO_STORE = { 'Cache-Control': 'no-store' }

// Fallback only: the per-page method cannot finish in one invocation, so it is
// sliced and the client keeps calling until `done`.
const FALLBACK_LIMIT = 20
const FALLBACK_BUDGET_MS = 25000

async function discoverFromBundle() {
  const rows = flattenTaxonomy(await fetchTaxonomy())
  if (!rows.length) throw new Error('Taxonomy parsed but held no categories')
  return {
    source: 'bundle',
    results: rows,
    total: rows.length,
    nextOffset: rows.length,
    done: true,
    errors: [],
  }
}

async function discoverFromPages(body) {
  const offset = Math.max(0, Number(body.offset) || 0)
  const slugs = await fetchCategorySlugs()
  const reusedNames =
    body && body.names && typeof body.names === 'object' ? body.names : null
  const names = reusedNames || (await fetchCategoryNames())
  const slice = await resolveCategorySlice(slugs, {
    offset,
    limit: FALLBACK_LIMIT,
    maxMs: FALLBACK_BUDGET_MS,
    names,
  })
  return {
    source: 'pages',
    ...slice,
    // Match the bundle shape so the client does not care which path ran.
    results: slice.results.map((r) => ({
      categoryID: r.categoryID,
      slug: r.slug,
      label: r.nameFromPage || '',
      prefix: '',
      name: r.name || r.nameFromSlug || '',
      section: '',
      catalogue: r.catalogue || '',
      options: [],
    })),
    names: reusedNames ? undefined : names,
  }
}

export async function POST(request) {
  let body = {}
  try {
    body = (await request.json()) || {}
  } catch {
    // No body: bundle pass with defaults.
  }

  try {
    // `forcePages` exists so the fallback can be exercised deliberately rather
    // than only being discovered broken the day the bundle shape changes.
    let payload
    let bundleError = null
    if (body.forcePages || body.offset) {
      payload = await discoverFromPages(body)
    } else {
      try {
        payload = await discoverFromBundle()
      } catch (error) {
        bundleError = error instanceof Error ? error.message : String(error)
        payload = await discoverFromPages(body)
      }
    }

    // Flag what the stored map already covers so the UI can hide it. A failure
    // here is not fatal: the client de-duplicates against its own rows anyway.
    let known = null
    try {
      const existing = await getCategoryMap()
      known = new Set(existing.map((entry) => entry.categoryID))
    } catch {
      // fall through with known = null
    }

    const results = payload.results
      .filter((row) => row.categoryID)
      .map((row) => ({
        ...row,
        known: known ? known.has(row.categoryID) : false,
      }))

    return NextResponse.json(
      { ok: true, ...payload, results, knownUnavailable: known === null, bundleError },
      { headers: NO_STORE }
    )
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json(
      { ok: false, error: `Category discovery failed: ${message}` },
      { status: 502, headers: NO_STORE }
    )
  }
}
