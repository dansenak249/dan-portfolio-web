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
// returned 114 duplicates and lost 136 services. That loss is silent, so it has
// to be inferred: `reshuffles` counts the times searchIndex climbed instead of
// falling, and any value above zero means the run is holed and the category
// should be crawled again.
//
// Cloudflare fronts the endpoint and 403s any request without a browser-like
// User-Agent, so one is always sent. Transient upstream failures (502/503/504)
// are retried on the SAME cursor, since skipping a page would silently lose 20
// services.

const SEARCH_URL = 'https://api.vgen.co/commission/services/search'
const SHOP_SEARCH_URL = 'https://api.vgen.co/shop/products/search'

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

// VGen runs two marketplaces with the same paging scheme and the same
// reshuffle hazard, but different endpoints, filter keys and record shapes.
// They are described here rather than crawled by two copies of the loop: the
// part worth getting right - the strictly-descending searchIndex check that
// catches a mid-crawl reshuffle - is subtle enough that a second copy of it
// would be a second thing to keep correct.
//
// Both share the same trap: the plural `searchCategoryIDs` array is honoured
// while a singular key is silently ignored, and an EMPTY array filters to
// nothing rather than to everything.
export const COMMISSION_SOURCE = {
  label: 'commission',
  url: SEARCH_URL,
  body: (categoryID, cursor) => searchBody(categoryID, cursor),
  items: (data) => (Array.isArray(data && data.services) ? data.services : []),
  idOf: (item) => item.serviceID,
  slim: (item, categoryID) => slimService(item, categoryID),
}

export const SHOP_SOURCE = {
  label: 'shop',
  url: SHOP_SEARCH_URL,
  body: (categoryID, cursor) => ({
    cursor: cursor ?? null,
    // `product`, not `service`: the commission shape is accepted and ignored,
    // which returns an unfiltered feed that looks like a working crawl.
    filters: { product: { searchCategoryIDs: [categoryID], searchCategoryVariantKeys: [] } },
    sortType: 'relevance',
    textQuery: '',
  }),
  items: (data) => (Array.isArray(data && data.products) ? data.products : []),
  idOf: (item) => item.productID,
  slim: (item, categoryID) => slimProduct(item, categoryID),
}

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

async function fetchPage(source, categoryID, cursor) {
  let lastError = null
  for (let attempt = 1; attempt <= MAX_TRIES; attempt++) {
    try {
      const res = await fetch(source.url, {
        method: 'POST',
        headers: {
          accept: 'application/json',
          'content-type': 'application/json',
          'user-agent': BROWSER_UA,
        },
        body: JSON.stringify(source.body(categoryID, cursor)),
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
  const life = item.lifetimeServiceStats || null
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
    // Completed commissions for THIS service, when the artist chooses to publish
    // them (about 15% do). It is the only per-service volume figure the listing
    // carries, and a truer one than reviews: every commission counts, not just
    // the ones a client bothered to review.
    serviceCompletedComms:
      life && typeof life.totalCompletedComms === 'number'
        ? life.totalCompletedComms
        : null,
    username: user.username || null,
    displayName: user.displayName || null,
    // The artist's own search keywords - the only SEO surface a listing has
    // besides its title. Measured across 1260 live listings: VGen caps this at
    // FIVE tags, 65% of listings use all five, 3% carry none. Free-text strings
    // of ~11 bytes, so the array costs ~59 B per service: about +14% on this
    // record, and ~0.1% of one service's review history.
    //
    // Stored verbatim. Normalising the case or the wording here would destroy
    // the exact thing an SEO study is trying to look at.
    tags: Array.isArray(item.tags)
      ? item.tags.filter((t) => typeof t === 'string' && t.trim())
      : [],
  }
}

/**
 * Keep only the fields the Shop survey uses.
 *
 * Shop is a far better-instrumented marketplace than Commission: `salesCount`
 * is a REAL per-product order count present on every listing, where the
 * commission side publishes `completedComms` on about 15% of services; and
 * `shopReviewStats` is per-PRODUCT despite its name, where the commission
 * equivalent is artist-wide. Tags run to 20 here against a cap of 5 there.
 *
 * `linkedServiceID` is kept because it ties a product back to a commission
 * service - 74% of products carry one - which is the only join between the two
 * halves of the tool.
 */
export function slimProduct(item, categoryID) {
  const stats = item.shopReviewStats || {}
  const user = item.user || {}
  return {
    productID: item.productID,
    userID: item.userID,
    productName: item.productName || '',
    categoryID: item.searchCategoryID || categoryID,
    basePrice: typeof item.basePrice === 'number' ? item.basePrice : null,
    currency: item.currency || '',
    pricingType: item.pricingType || '',
    created: item.created || null,
    modified: item.modified || null,
    // The real thing: orders for THIS product, on every listing.
    salesCount: typeof item.salesCount === 'number' ? item.salesCount : null,
    paidSalesCount: typeof item.paidSalesCount === 'number' ? item.paidSalesCount : null,
    freeSalesCount: typeof item.freeSalesCount === 'number' ? item.freeSalesCount : null,
    // Whether the seller shows that number publicly. The count is returned
    // either way; this says whether quoting it is fair game.
    isNumberOfSalesPublic: !!item.isNumberOfSalesPublic,
    reviewCount: typeof stats.totalReviews === 'number' ? stats.totalReviews : null,
    avgRating: typeof stats.averageRating === 'number' ? stats.averageRating : null,
    stars: [
      stats.total1StarReviews ?? 0,
      stats.total2StarReviews ?? 0,
      stats.total3StarReviews ?? 0,
      stats.total4StarReviews ?? 0,
      stats.total5StarReviews ?? 0,
    ],
    tags: Array.isArray(item.tags)
      ? item.tags.filter((t) => typeof t === 'string' && t.trim())
      : [],
    linkedServiceID: item.linkedServiceID || null,
    username: user.username || null,
    displayName: user.displayName || null,
  }
}

/**
 * How much a product has sold, for ranking which ones the census keeps.
 * Unlike the commission side there is no guessing: every listing carries its
 * own order count, so this never has to fall back to an artist-wide figure.
 */
export function productScore(row) {
  if (!row) return 0
  if (typeof row.salesCount === 'number') return row.salesCount
  return row.reviewCount ?? 0
}

/**
 * How busy a service is, for ranking which ones are worth pulling reviews for.
 *
 * Prefers the service's own completed-commission count. Only ~15% of listings
 * publish it, so the rest fall back to the artist's review total — a decent
 * stand-in because ~81% of services are the only one their artist offers in the
 * category, and a poor one for the prolific minority. There is no better signal
 * before the reviews themselves are fetched, which is the cost this ranking
 * exists to avoid.
 *
 * @param {object} row a slimmed service record
 * @returns {number}
 */
export function serviceScore(row) {
  if (!row) return 0
  if (typeof row.serviceCompletedComms === 'number') return row.serviceCompletedComms
  return row.artistTotalReviews ?? 0
}

/**
 * Crawl ONE slice of a category, starting from `cursor`.
 *
 * Bounded by `maxPages` so a single call fits a serverless time budget; the
 * caller replays `nextCursor` until `done` is true.
 *
 * Reshuffles are detected WITHOUT remembering every id. The feed is strictly
 * descending by searchIndex, so an index that jumps back UP is a recompute — one
 * number carried between slices instead of a set that grew past a megabyte on a
 * 30k-service category and had to be rewritten on every slice.
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
 * @param {number|null} [options.lastIndex] searchIndex the previous slice ended on
 * @returns {Promise<{ services: object[], nextCursor: string|null, done: boolean,
 *   pages: number, fetched: number, duplicates: number, offCategory: number,
 *   reshuffles: number, lastIndex: number|null, stoppedOnTime: boolean }>}
 */
export async function fetchCategorySlice(categoryID, options = {}) {
  const {
    cursor = null,
    maxPages = 20,
    maxMs = 30000,
    lastIndex: startIndex = null,
    // Which marketplace. Defaults to commission so every existing caller keeps
    // its exact behaviour.
    source = COMMISSION_SOURCE,
  } = options
  // Bounded to this slice: enough to drop a repeat inside one run, without the
  // unbounded growth of a whole-crawl set. Repeats ACROSS slices are dropped
  // when the census is read back instead.
  const seen = new Set()
  let lastIndex = typeof startIndex === 'number' ? startIndex : null
  let reshuffles = 0
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
    const data = await fetchPage(source, categoryID, nextCursor)
    pages++

    const items = source.items(data)
    fetched += items.length

    for (const item of items) {
      const itemID = item && source.idOf(item)
      if (typeof itemID !== 'string') continue
      // Strictly descending feed: an index that climbs means VGen recomputed
      // the sort key mid-crawl, which skips rows as well as repeating them.
      const idx = typeof item.searchIndex === 'number' ? item.searchIndex : null
      if (idx !== null) {
        if (lastIndex !== null && idx > lastIndex) reshuffles++
        lastIndex = idx
      }
      // A row from another category means the filter was not applied — count it
      // and drop it rather than quietly polluting the category's data.
      if (item.searchCategoryID && item.searchCategoryID !== categoryID) {
        offCategory++
        continue
      }
      if (seen.has(itemID)) {
        duplicates++
        continue
      }
      seen.add(itemID)
      services.push(source.slim(item, categoryID))
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
    reshuffles,
    lastIndex,
    stoppedOnTime,
  }
}
