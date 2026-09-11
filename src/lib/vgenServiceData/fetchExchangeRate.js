// VGen exchange-rate fetcher (server-side, unauthenticated, read-only)
// ---------------------------------------------------------------------
//   GET https://api.vgen.co/exchange-rate
//   -> { rates: { <FROM>: { <TO>: number, ... }, ... } }
//
// It is a FULL cross-rate matrix: 150 currencies squared, ~347 KB. The dashboard
// only ever converts INTO USD, so this pulls out the single column we need —
// rates[X].USD for every X — which is ~3 KB and safe to hand to the browser.
//
// Read the direction carefully: rates[X].USD is "one X in USD" (rates.JPY.USD
// ~= 0.00626), which is exactly the multiplier a price in X needs. rates.USD[X]
// is the inverse and would silently produce wildly wrong prices.
//
// Cloudflare fronts api.vgen.co and 403s requests without a browser-like
// User-Agent, so one is always sent.

const EXCHANGE_URL = 'https://api.vgen.co/exchange-rate'
const REQUEST_TIMEOUT_MS = 20000

const BROWSER_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'

/**
 * Fetch VGen's rate matrix and reduce it to { <CODE>: <rate to USD> }.
 * @returns {Promise<{ fetchedAt: string, count: number, rates: Record<string, number> }>}
 */
export async function fetchUsdRates() {
  const res = await fetch(EXCHANGE_URL, {
    method: 'GET',
    headers: { accept: 'application/json', 'user-agent': BROWSER_UA },
    cache: 'no-store',
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  })
  if (!res.ok) throw new Error('HTTP ' + res.status + ' for ' + EXCHANGE_URL)

  const data = await res.json()
  const matrix = data && data.rates
  if (!matrix || typeof matrix !== 'object') {
    throw new Error('Unexpected exchange-rate shape (no rates object)')
  }

  const rates = {}
  for (const [code, row] of Object.entries(matrix)) {
    const toUsd = row && row.USD
    // Guard against nulls / zeroes: a 0 rate would render every price as $0.
    if (typeof toUsd === 'number' && isFinite(toUsd) && toUsd > 0) {
      rates[code] = toUsd
    }
  }
  if (!rates.USD) rates.USD = 1

  return {
    fetchedAt: new Date().toISOString(),
    count: Object.keys(rates).length,
    rates,
  }
}
