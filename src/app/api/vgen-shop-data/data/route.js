// VGen SHOP product read endpoint
// --------------------------------
// GET -> { products, productCount, censusTotal, censusSeenTotal, lastFetchedAt }
//
// Far thinner than the Commission equivalent, and for a good reason: a Shop
// product carries its own sales count and its own per-product review stats in
// the crawl itself. There is nothing to join here — no cached review payloads
// to read, no per-artist profile lookups to resolve a display name, no metrics
// to recompute on every request. It reads the census and hands it over.
//
// DERIVED FIELDS ARE LEFT TO THE CLIENT on purpose. Revenue is price times
// sales, and the price needs converting from seven currencies through live
// exchange rates the dashboard already holds; recomputing that here would mean
// a second rate source that could disagree with the one on screen.
//
// AUTH: intentionally open, mirroring the sibling routes.

import { NextResponse } from 'next/server'
import {
  getShopCategoryMap,
  getCategoryMeta,
  listCategoryServices,
  shopKey,
} from '@/lib/vgenServiceData/store'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 0
export const maxDuration = 60

const NO_STORE = { 'Cache-Control': 'no-store' }

// Safety ceiling only. The real limit is applied at crawl time, where each
// category keeps its busiest 1,000 — this exists so that mapping a hundred
// categories cannot build a several-hundred-megabyte response inside a
// serverless function. `truncated` says so rather than letting rows vanish.
const MAX_PRODUCTS_RETURNED = 20000

export async function GET() {
  try {
    const map = await getShopCategoryMap()
    const products = []
    // What the crawls actually walked, before each was trimmed to its busiest.
    // Without it "1000 products" reads the same whether the category holds
    // 1,400 or 200,000.
    let seenTotal = 0
    let lastFetchedAt = null

    for (const entry of map) {
      const categoryID = (entry.categoryID || '').trim()
      if (!categoryID) continue
      const key = shopKey(categoryID)
      const meta = await getCategoryMeta(key)
      if (!meta || !meta.chunks) continue // never crawled: nothing to read
      seenTotal += meta.seenTotal || meta.count || 0
      if (meta.finishedAt && (!lastFetchedAt || meta.finishedAt > lastFetchedAt)) {
        lastFetchedAt = meta.finishedAt
      }
      products.push(...(await listCategoryServices(key)))
      if (products.length >= MAX_PRODUCTS_RETURNED) break
    }

    const truncated = products.length > MAX_PRODUCTS_RETURNED
    const out = truncated ? products.slice(0, MAX_PRODUCTS_RETURNED) : products

    return NextResponse.json(
      {
        products: out,
        productCount: out.length,
        censusTotal: products.length,
        censusSeenTotal: seenTotal,
        lastFetchedAt,
        truncated,
      },
      { headers: NO_STORE }
    )
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json(
      { error: `Failed to build shop data: ${message}` },
      { status: 500, headers: NO_STORE }
    )
  }
}
