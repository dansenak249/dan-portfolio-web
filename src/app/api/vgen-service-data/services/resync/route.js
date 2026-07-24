// VGen declared-service category backfill (server-side, read-from-VGen + write)
// ----------------------------------------------------------------------------
// POST            -> resolve every declared service that has NO stored categoryID
//                    and fill it in (plus refresh its title) from VGen's
//                    service-detail endpoint. Rows that already have a category
//                    are left untouched.
// POST { force:1 }-> re-resolve ALL declared services (also refreshes titles),
//                    not just the ones missing a category.
//
// WHY: the category (searchCategoryID) is derived from a serviceID, not typed by
// the user. This heals older rows whose category was lost, and lets a one-click
// "Sync types" repair the whole watchlist. Per-service fetches use allSettled so
// one service's Cloudflare 403 is isolated instead of failing the whole sync.
//
// AUTH: intentionally open for now, mirroring the sibling service-data routes.

import { NextResponse } from 'next/server'
import { fetchServiceDetail } from '@/lib/vgenServiceData/fetchReviews'
import { getServices, setServices } from '@/lib/vgenServiceData/store'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 0

const NO_STORE = { 'Cache-Control': 'no-store' }
// Small concurrent batches to stay polite to VGen/Cloudflare.
const FETCH_BATCH = 4

export async function POST(request) {
  let force = false
  try {
    const body = await request.json()
    force = !!(body && body.force)
  } catch {
    // no body -> default (only backfill rows missing a category)
  }

  try {
    const services = await getServices()
    const next = services.map((s) => ({ ...s }))
    // Target rows: those with no categoryID, or every row when force is set.
    const targets = next
      .map((s, index) => ({ s, index }))
      .filter(({ s }) => force || !(s.categoryID || '').trim())

    const errors = []
    let resolved = 0
    for (let i = 0; i < targets.length; i += FETCH_BATCH) {
      const batch = targets.slice(i, i + FETCH_BATCH)
      const settled = await Promise.allSettled(
        batch.map(({ s }) => fetchServiceDetail(s.serviceID))
      )
      for (let j = 0; j < settled.length; j++) {
        const { s, index } = batch[j]
        const result = settled[j]
        if (result.status === 'fulfilled') {
          next[index] = {
            serviceID: s.serviceID,
            categoryID: result.value.categoryID || s.categoryID || '',
            serviceName: result.value.serviceName || s.serviceName || '',
          }
          resolved++
        } else {
          errors.push({
            serviceID: s.serviceID,
            message: String(result.reason && result.reason.message),
          })
        }
      }
    }

    // Only write when something actually resolved, so a full-failure run (e.g.
    // Cloudflare blocking everything) never clobbers the stored list.
    if (resolved > 0) await setServices(next)

    return NextResponse.json(
      { ok: true, resolved, total: targets.length, services: next, errors },
      { headers: NO_STORE }
    )
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json(
      { ok: false, error: message },
      { status: 500, headers: NO_STORE }
    )
  }
}
