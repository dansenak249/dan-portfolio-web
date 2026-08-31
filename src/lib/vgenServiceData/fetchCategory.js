// VGen category crawler (server-side, unauthenticated, read-only)
// ----------------------------------------------------------------
// Replaces the old keyword harvest. VGen's service search is a PUBLIC POST
// endpoint (verified: anonymous request returns HTTP 200 with full data, no
// cookie), and it accepts a category filter, so one category can be enumerated
// COMPLETELY instead of scraping the top N results of a search term:
//
//   POST https://api.vgen.co/commission/services/search
//   { cursor, filters: { artist: {}, service: { searchCategoryIDs: [<recId>],
//     searchCategoryVariantKeys: [] } }, sortType: 'relevance', textQuery: '' }
//
// PAGING is keyset (seek), not offset: every response carries
//   nextCursor = "<lastItem._id>__<lastItem.searchIndex>"
// and services come back with searchIndex strictly DESCENDING. Two consequences:
//   - there is no max-offset ceiling to work around, and
//   - a run resumes exactly where it stopped by replaying the last cursor,
// which is what lets this run in serverless-sized slices.
//
// THE ONE HAZARD: `searchIndex` is a stored value that VGen RECOMPUTES from time
// to time. A crawl that spans a recompute both re-serves rows it already passed
// AND silently skips rows that jumped above the cursor. Measured live: a clean
// run returned 2704 services with 0 duplicates; a run that straddled a recompute
// returned 114 duplicates and lost 136 services. So duplicates are not cosmetic —
// they are the ONLY visible symptom of missing data, and the caller must treat
// `duplicates > 0` as "this run is holed, crawl the category again".
//
// Cloudflare fronts the endpoint and 403s any request without a browser-like
// User-Agent, so one is always sent. Transient upstream failures (502/503/504)
// are retried on the SAME cursor, since skipping a page would silently lose 20
// services.

const SEARCH_URL = 'https://api.vgen.co/commission/services/search'

const PAGE_SIZE = 20 // fixed by the API
const PAGE_GAP_MS = 300 // politeness pause between pages
const MAX_TRIES = 4 // attempts per page before giving up
const RETRY_BACKOFF_MS = [1000, 4000, 10000] // waits before try 2, 3, 4
const REQUEST_TIMEOUT_MS = 30000

const BROWSER_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'

// Upstream hiccups worth retrying; anything else (400/404) is a real answer.
const TRANSIENT = new Set([408, 429, 500, 502, 503, 504])

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

function searchBody(categoryID, cursor) {
  return {
    cursor: cursor ?? null,
    filters: {
      artist: {},
      service: {
        // NOTE: the plural array key is the one VGen honours. The singular
        // `searchCategoryID` is silently IGNORED and yields an UNFILTERED
        // marketplace-wide feed, which looks like a working crawl until you
        // check the category of what came back.
        searchCategoryIDs: [categoryID],
        searchCategoryVariantKeys: [],
      },
    },
    sortType: 'relevance', // the only value the API accepts; others return 400
    textQuery: '',
  }
}

async function fetchPage(categoryID, cursor) {
  let lastError = null
  for (let attempt = 1; attempt <= MAX_TRIES; attempt++) {
    try {
      const res = await fetch(SEARCH_URL, {
        method: 'POST',
        headers: {
          accept: 'application/json',
          'content-type': 'application/json',
          'user-agent': BROWSER_UA,
        },
        body: JSON.stringify(searchBody(categoryID, cursor)),
        cache: 'no-store',
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      })
      if (res.ok) return res.json()
      lastError = new Error('HTTP ' + res.status)
      if (!TRANSIENT.has(res.status)) throw lastError
    } catch (error) {
      lastError = error
      // AbortError / network failure: also worth one more try.
    }
    if (attempt < MAX_TRIES) await sleep(RETRY_BACKOFF_MS[attempt - 1] ?? 10000)
  }
  throw lastError || new Error('Unknown search failure')
}

// Keep only the fields the survey uses. The raw record is ~10.3 KB; this is
// ~0.5 KB. Deliberately dropped: galleryItems and description (together 73% of
// the payload), plus licenseInfo / contentWarnings / discounts / requestFormID /
// policyID / workflowID / templates / availability / offsets, and the sort keys
// (searchIndex, randomSearchIndex) since nothing displays in that order.
//
// username + displayName come free here, which is why this crawler makes the old
// per-artist profile lookup (and its vgsd:artist:* cache) unnecessary.
export function slimService(item, categoryID) {
  const stats = item.artistReviewStats || {}
  const user = item.user || {}
  return {
    serviceID: item.serviceID,
    userID: item.userID,
    serviceName: item.serviceName || '',
    categoryID: item.searchCategoryID || categoryID,
    type: item.type || '',
    basePrice: typeof item.basePrice === 'number' ? item.basePrice : null,
    currency: item.currency || '',
    created: item.created || null,
    modified: item.modified || null,
    // Artist-level totals (NOT per-service): usable as a cheap upper-bound gate
    // before paying for a service's own review feed, never as the service count.
    artistTotalReviews:
      typeof stats.totalReviews === 'number' ? stats.totalReviews : null,
    artistAvgRating:
      typeof stats.averageRating === 'number' ? stats.averageRating : null,
    username: user.username || null,
    displayName: user.displayName || null,
  }
}

/**
 * Crawl ONE slice of a category, starting from `cursor`.
 *
 * Bounded by `maxPages` so a single call fits a serverless time budget; the
 * caller replays `nextCursor` until `done` is true.
 *
 * `seen` is the set of serviceIDs collected SO FAR ACROSS THE WHOLE CRAWL (not
 * just this slice) — it is what makes the duplicate count meaningful, so callers
 * must carry it between slices.
 *
 * A page budget alone is not enough to bound the call: a page that needs
 * retries costs its backoff too (up to ~15s), so a run of flaky pages can blow
 * a serverless limit long before the page count is spent. `maxMs` is the real
 * guard — the loop stops as soon as the elapsed time is spent, and the caller
 * just resumes from the returned cursor.
 *
 * @param {string} categoryID VGen's opaque searchCategoryID ("rec...")
 * @param {object} [options]
 * @param {string|null} [options.cursor] resume point; null/undefined starts over
 * @param {number} [options.maxPages] page budget for THIS call
 * @param {number} [options.maxMs] wall-clock budget for THIS call
 * @param {Set<string>} [options.seen] serviceIDs already collected
 * @returns {Promise<{ services: object[], nextCursor: string|null, done: boolean,
 *   pages: number, fetched: number, duplicates: number, offCategory: number,
 *   stoppedOnTime: boolean }>}
 */
export async function fetchCategorySlice(categoryID, options = {}) {
  const {
    cursor = null,
    maxPages = 20,
    maxMs = 30000,
    seen = new Set(),
  } = options
  const startedAt = Date.now()

  const services = []
  let nextCursor = cursor
  let pages = 0
  let fetched = 0
  let duplicates = 0
  let offCategory = 0
  let done = false
  let stoppedOnTime = false

  while (pages < maxPages) {
    if (Date.now() - startedAt > maxMs) {
      stoppedOnTime = true
      break
    }
    const data = await fetchPage(categoryID, nextCursor)
    pages++

    const items = Array.isArray(data && data.services) ? data.services : []
    fetched += items.length

    for (const item of items) {
      if (!item || typeof item.serviceID !== 'string') continue
      // A row from another category means the filter was not applied — count it
      // and drop it rather than quietly polluting the category's data.
      if (item.searchCategoryID && item.searchCategoryID !== categoryID) {
        offCategory++
        continue
      }
      if (seen.has(item.serviceID)) {
        duplicates++
        continue
      }
      seen.add(item.serviceID)
      services.push(slimService(item, categoryID))
    }

    // No nextCursor (the field is absent on the last page, not null) means the
    // feed is exhausted. A short page is the same signal.
    const next = data && data.nextCursor
    if (!next || items.length === 0) {
      nextCursor = null
      done = true
      break
    }
    if (next === nextCursor) {
      // Cursor did not advance: stop rather than loop forever.
      nextCursor = null
      done = true
      break
    }
    nextCursor = next
    if (items.length < PAGE_SIZE) {
      done = true
      break
    }
    if (pages < maxPages) await sleep(PAGE_GAP_MS)
  }

  return {
    services,
    nextCursor,
    done,
    pages,
    fetched,
    duplicates,
    offCategory,
    stoppedOnTime,
  }
}
