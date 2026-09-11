// Currency conversion rates for the dashboard (read-only)
// --------------------------------------------------------
// GET            -> { fetchedAt, count, rates: { <CODE>: <rate to USD> }, cached }
// GET ?refresh=1 -> ignore the cache and pull fresh from VGen
//
// Proxies VGen's exchange-rate matrix and hands back only the "into USD" column,
// so the browser gets ~3 KB instead of ~347 KB. Rates are cached in Redis and
// refreshed once they pass MAX_AGE_MS, because they move slowly and every
// dashboard load would otherwise re-pull the whole matrix.
//
// Redis is OPTIONAL here: with no store configured (or a cache read failure) the
// route still answers with live rates, just uncached. A stale cache also beats
// an error, so an upstream failure falls back to whatever was last stored.

import { NextResponse } from 'next/server'
import { fetchUsdRates } from '@/lib/vgenServiceData/fetchExchangeRate'
import { getExchangeRates, setExchangeRates } from '@/lib/vgenServiceData/store'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 0

const NO_STORE = { 'Cache-Control': 'no-store' }
const MAX_AGE_MS = 12 * 60 * 60 * 1000 // refetch twice a day

function isFresh(payload) {
  if (!payload || !payload.fetchedAt) return false
  const age = Date.now() - new Date(payload.fetchedAt).getTime()
  return isFinite(age) && age >= 0 && age < MAX_AGE_MS
}

export async function GET(request) {
  const { searchParams } = new URL(request.url)
  const force = searchParams.get('refresh') === '1'

  let cached = null
  if (!force) {
    try {
      cached = await getExchangeRates()
      if (isFresh(cached)) {
        return NextResponse.json({ ...cached, cached: true }, { headers: NO_STORE })
      }
    } catch {
      // No Redis (or a read failure): fall through to a live fetch.
    }
  }

  try {
    const fresh = await fetchUsdRates()
    try {
      await setExchangeRates(fresh)
    } catch {
      // Caching is best-effort; serving the rates matters more.
    }
    return NextResponse.json({ ...fresh, cached: false }, { headers: NO_STORE })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    // Stale rates beat no rates - a few hours of drift is far less wrong than
    // falling back to the hardcoded table.
    if (cached && cached.rates) {
      return NextResponse.json(
        { ...cached, cached: true, stale: true, error: message },
        { headers: NO_STORE }
      )
    }
    return NextResponse.json(
      { error: `Failed to load exchange rates: ${message}` },
      { status: 502, headers: NO_STORE }
    )
  }
}
