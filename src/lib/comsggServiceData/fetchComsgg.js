// commissions.gg public-data fetchers (server-side, unauthenticated, read-only)
// -----------------------------------------------------------------------------
// WHY THE OBVIOUS URL DOES NOT WORK. The address the browser shows while
// searching, https://www.commissions.gg/?search=animation&_rsc=<hash>, is NOT
// an API. commissions.gg is a Next.js App Router app and that route is a React
// Server Component endpoint:
//   - `_rsc=<hash>` is only a cache-buster, not a "give me JSON" switch.
//   - Content negotiation happens through the `RSC: 1` REQUEST HEADER.
//       without it -> Content-Type: text/html          (~787 KB page)
//       with it    -> Content-Type: text/x-component   (~570 KB React Flight)
//   - Neither body is JSON. Flight is a line-prefixed chunk stream
//     (`1:"$Sreact.fragment"`, `4:I[90484,[],"OutletBoundary"]`, `:HL[...]`),
//     so a fetch-then-JSON.parse pipeline - the one that works against
//     api.vgen.co and draw.market/napp/* - necessarily fails here.
// The listing data IS inside that stream, but only as serialised React props
// under a `seed.commissionFeed` key, which would make collection break on
// every deploy. The real backend is a separate host, discovered in the client
// bundle (chunk 4099, webpack module 10797) where it is hardcoded:
//   `let n = () => "https://api.commissions.gg/api/v1"`
// In the HTML that host appears only as a <link rel="preconnect"> hint, which
// is why scanning the page payload alone never reveals it.
//
// Every endpoint below is PUBLIC (verified: anonymous curl returns HTTP 200
// with full data, no cookie, no bearer token). Only read endpoints are called;
// nothing here writes, favourites, follows or logs a view, so collection
// cannot pollute counters or raise account risk.
//
// METHOD MATTERS. The feeds are POST, not GET, and the body is JSON:
// GET /service/list returns 404 NOT_FOUND. Detail/listing endpoints are GET.
//
// ENVELOPE. Success is {status:200, type:"success", message:"<human text>",
// data:{...}}. Unlike Drawmarket the HTTP status mirrors `status`, so a bad
// call really does arrive as a non-2xx:
//   400 VALIDATION_FAILED   - a parameter has the wrong shape/value
//   400 BAD_REQUEST         - parameter not supported on this endpoint
//   404 NOT_FOUND           - wrong path or wrong verb
//   404 PROFILE_NOT_FOUND   - handle does not resolve
// Error bodies carry a `requestId` and never a field name, so a rejected call
// does not say WHICH parameter it disliked - the parameter shapes documented
// below were established by probing one key at a time.
//
// PAGING is classic mongoose-paginate: data = {docs, total, limit, page,
// pages, hasNextPage}. `page` is 1-based. `limit` is capped at 100 (200 and
// above are rejected with VALIDATION_FAILED), and the client additionally
// sends `perPage`, which is mirrored here for parity.
//
// `skipTotal: true` drops `total` and `pages` from the response and keeps
// `hasNextPage`. Cheaper, but then the run cannot verify it collected
// everything, so it stays off by default.
//
// MONEY IS IN WHOLE CURRENCY UNITS, not cents - the opposite of Drawmarket.
// A listing shown as $45 returns price:45, base_price:45, totalPrice:45,
// basePriceWithTaxes:45, with the unit named in `currency` ("USD"). Nothing
// is divided by 100 below; doing so would be wrong by 100x.
//
// THE RANDOMISED FEED, and the one condition that switches it off. An
// unfiltered browse response carries two extra keys:
//   browseSeed   e.g. 497534
//   rotationKey  e.g. "2026-10-04T14:00:00.000Z"  (hourly bucket)
// They are a deliberate shuffle: the catalogue is re-ordered per seed and the
// seed rotates every hour, so "rank" in an unfiltered feed measures the seed,
// not standing. The client logic (chunk 2395, getInfiniteCommissionList) gates
// them on exactly one condition:
//     let n = !i.search && !i.sortBy
// Confirmed live: as soon as `search` OR `sortBy` is present, browseSeed and
// rotationKey vanish from the response. So any longitudinal rank tracking MUST
// pass one of those two - which is why searchServices() always sends a
// keyword. If an unfiltered feed is ever needed, pin browseSeed and
// rotationKey from page 1 into every later page (pinBrowseSeed below) or the
// pages will be drawn from different shuffles and silently overlap.
//
// SORTING IS ALMOST NON-EXISTENT. Of 16 candidate values probed, `sortBy`
// accepts exactly one: "createdAt" (with sortOdr "asc"/"desc"). price,
// base_price, basePrice, total_price, totalPrice, rating, popularity,
// relevance, title, views, orders, random, featured, updatedAt,
// service_status and deliveryTime are all rejected with VALIDATION_FAILED.
// So there are only three orderings available at all: relevance (send
// `search`), newest/oldest (send `sortBy:"createdAt"`), and the hourly
// shuffle (send neither).
//
// SINGLE-TOKEN SEARCH IS A HARD FIELD TIER PLUS A RECENCY TIEBREAK - NOT a
// relevance score. Decoded by collecting the complete 826-row "animation"
// result set and segmenting it:
//   - Tier 1, ranks 0-176: the query appears as a substring of the TITLE.
//     Exactly 177/177 here contain "animation", and 0/622 and 0/27 in the
//     tiers below. The split is perfectly clean.
//   - Tier 2, ranks 177-798: matched in the DESCRIPTION or the TAGS instead.
//     So unlike Drawmarket a description is NOT dead weight, but it can never
//     win a top slot.
//   - Tier 3, ranks 799-825: legacy rows whose `user_details` is incomplete
//     (accountType and isFeatured absent). Parked at the very bottom.
//   - Inside every tier the order is `_id` DESCENDING - newest first - with
//     ZERO violations across all 826 rows. Spearman(rank, _id timestamp)
//     within tier 1 is exactly -1.0000.
//
// Consequences worth remembering, all measured rather than assumed:
//   - `updatedAt` does NOT affect rank. A service edited the same hour still
//     sat at rank 144 while rank 0 had been created ten weeks earlier. Only
//     creation time counts, and `_id` is immutable.
//   - There is no term-frequency weighting. A title containing the keyword
//     twice ranked between neighbours containing it once.
//   - Matching is plain case-insensitive substring with no stemming:
//     "animated" does NOT satisfy a search for "animation", which demoted
//     100 "animated" titles into tier 2.
//   - isFeatured buys nothing in search (9 flagged rows landed at 175, 286,
//     432, 436, 553, 556, 745, 804, 806). Nor do price (Spearman 0.10),
//     media count (0.12), badges (-0.13) or rating.
//   - approval_status "Pending" does NOT block indexing, unlike Drawmarket
//     where an unlabelled listing is invisible to keyword search.
//   - Ordering is deterministic across refetches (three identical runs
//     returned byte-identical _id sequences).
//
// MULTI-TOKEN search is still undecoded and fits no set algebra: |full|=1886,
// |body|=2468 but "full body"=933 (below both, so not a union), while
// |animation|=826, |chibi|=1884 and "animation chibi"=854 (above `animation`,
// so not an intersection either). Stopwords barely register:
// "animation for chibi"=846 vs "animation chibi"=854. Do not assume the
// single-token tier model holds for phrases.
//
// WARNING - /service/detail IS NOT A SAFE READ. It increments the service's
// viewCount server-side and returns the POST-increment value; four
// consecutive reads of one id returned 31, 32, 33, 34. Collecting detail for
// a whole result set therefore inflates every competitor's counter by one per
// pass and corrupts exactly the metric being measured. viewCount is absent
// from /service/list, so there is NO cheap way to read it - unlike VGen,
// where viewCount ships in the list feed. Never sweep detail across a corpus
// on a schedule. If a one-off traffic sample is genuinely needed, subtract
// one view per pass and record that the sample was taken.
//
// FILTER PARAMETERS, as accepted by /service/list (probed individually):
//   search      string    relevance query; also disables the shuffle
//   category    ObjectId | ObjectId[]   top-level category (262 hits for
//               "Animation + Videos" alone, 152 combined with search)
//   tag         ObjectId | ObjectId[]   MUST be an id. Passing the tag TITLE
//               ("illustrations") returns total:0 instead of an error, which
//               is the single most misleading response on this API - resolve
//               titles through fetchPopularTags() first.
//   userId      ObjectId  every public service by one seller
//   sortBy      "createdAt" only;  sortOdr "asc" | "desc"
//   page, limit, perPage, skipTotal, homepageLite, facets
//
// PRICE FILTERING IS NOT AVAILABLE on this endpoint, and fails silently.
// `minPrice`/`maxPrice` and `priceMin`/`priceMax` are accepted with HTTP 200
// but change nothing (total stayed at 13648 either way), while the `price`
// key the client destructures rejects every shape tried - number, "0-50",
// "0,50", [0,50], ["0","50"], {min,max}, {from,to} - with VALIDATION_FAILED.
// The real encoding is still unknown, so price must be filtered client-side
// after collection. Note that `availibility` (sic, misspelled in their own
// client), `workStyle`, `rating` and `subcategory` likewise rejected every
// value tried, so they are left unsupported here rather than guessed.
//
// SCALE. 13,648 commission services and 1,347 shop listings live, against
// roughly 30 results for a broad Drawmarket keyword. A single keyword here
// can exceed 4,000 hits, so page budgets are real: at the 100-row cap,
// "illustrations" by tag is 43 pages. Totals also drift mid-run (13648 ->
// 13649 observed between two probes minutes apart), which combined with
// offset paging means later pages can repeat or skip rows. Collection
// therefore de-duplicates by _id and reports the drift instead of hiding it.
//
// SUBCATEGORY IDS. A service carries `searchCategory: [ObjectId]`, and those
// ids are SUBcategories, not the 11 top-level ones. /searchCategory/list/
// commission returns the 11 parents each with an embedded `subCategories`
// array (including public route slugs), so one call resolves the whole tree.
//
// Profile lookups take the `userName`, never the `_id`: passing a user _id to
// /user/publicProfile returns 404 PROFILE_NOT_FOUND. The userName travels
// with every service row under `user_details`, so no extra call is needed.

const BASE = 'https://api.commissions.gg/api/v1'

const SERVICE_LIST_URL = `${BASE}/service/list`
const SERVICE_DETAIL_URL = `${BASE}/service/detail`
const PUBLIC_PROFILE_URL = `${BASE}/user/publicProfile`
const CATEGORY_LIST_URL = `${BASE}/searchCategory/list`
const POPULAR_TAGS_URL = `${BASE}/tag/popular`
const PORTFOLIO_URL = `${BASE}/portfolio/paginatedListByUser`
const REVIEWS_URL = `${BASE}/reviews/listById`

// Hard API ceiling: limit >= 200 is rejected with VALIDATION_FAILED.
const PAGE_SIZE_MAX = 100

// The only value `sortBy` accepts (16 others rejected).
export const SORT_FIELD = 'createdAt'

const PAGE_GAP_MS = 300 // politeness pause between pages
const MAX_TRIES = 4 // attempts per request before giving up
const RETRY_BACKOFF_MS = [1000, 4000, 10000] // waits before try 2, 3, 4
const REQUEST_TIMEOUT_MS = 30000
const MAX_PAGES = 60 // 60 x 100 rows; a keyword this large is a config error

const BROWSER_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'

// Cloudflare + Vercel front this API and both browser-origin headers are sent
// to look like the real client; a bare request is served, but matching the
// site's own fetch keeps us off any heuristic that may be added later.
const BASE_HEADERS = {
  accept: 'application/json',
  'user-agent': BROWSER_UA,
  origin: 'https://www.commissions.gg',
  referer: 'https://www.commissions.gg/',
}

// Upstream hiccups worth retrying. A 400 is a real answer about our body and
// a 404 is a real answer about our path, so neither is retried.
const TRANSIENT = new Set([408, 429, 500, 502, 503, 504])

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

/**
 * Call one commissions.gg endpoint and unwrap the {status,data} envelope.
 * Retries transient HTTP failures; a 400/404 is surfaced immediately because
 * retrying a rejected body or a wrong path never helps.
 * @param {string} url fully-qualified request URL
 * @param {object} [body] JSON body; when present the request becomes a POST
 * @returns {Promise<object>} the `data` object from a successful response
 */
async function request(url, body) {
  let lastError

  for (let attempt = 1; attempt <= MAX_TRIES; attempt++) {
    try {
      const res = await fetch(url, {
        method: body === undefined ? 'GET' : 'POST',
        headers:
          body === undefined
            ? BASE_HEADERS
            : { ...BASE_HEADERS, 'content-type': 'application/json' },
        body: body === undefined ? undefined : JSON.stringify(body),
        cache: 'no-store',
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      })

      if (!res.ok) {
        if (TRANSIENT.has(res.status) && attempt < MAX_TRIES) {
          lastError = new Error(`HTTP ${res.status} for ${url}`)
          await sleep(RETRY_BACKOFF_MS[attempt - 1])
          continue
        }
        // Error bodies name a `code` and a `requestId` but never the offending
        // field, so both are quoted to make the failure reportable upstream.
        const detail = await res.json().catch(() => null)
        throw new Error(
          `commissions.gg ${res.status} ${detail?.code || '?'} for ${url}` +
            (detail?.requestId ? ` (requestId ${detail.requestId})` : '')
        )
      }

      const payload = await res.json()
      // `data` is absent on the few endpoints that answer flat (tag/popular,
      // searchCategory/list), so fall back to the whole payload.
      return payload.data ?? payload
    } catch (error) {
      lastError = error
      const retryable =
        attempt < MAX_TRIES && !String(error.message).includes('commissions.gg ')
      if (!retryable) throw error
      await sleep(RETRY_BACKOFF_MS[attempt - 1])
    }
  }

  throw lastError
}

/** Keep only the fields relevant to the study. Prices are whole units. */
function slimService(item, rank, snapshotTs) {
  const user = item.user_details || {}
  return {
    snapshot_ts: snapshotTs,
    rank,
    service_id: item._id,
    title: item.title || null,
    user_id: item.user_id || null,
    // userName is the profile key; displayName is cosmetic and can collide.
    user_name: user.userName || null,
    display_name: user.displayName || null,
    account_type: user.accountType ?? null,
    currency: item.currency || null,
    price: typeof item.price === 'number' ? item.price : null,
    base_price: typeof item.base_price === 'number' ? item.base_price : null,
    total_price: typeof item.totalPrice === 'number' ? item.totalPrice : null,
    // "Open" / closed-equivalent; the only availability signal in the feed.
    service_status: item.service_status || null,
    is_featured: !!item.isFeatured,
    is_sensitive_content: item.is_sensitive_content ?? null,
    suitable_audience: Array.isArray(item.suitableAudience)
      ? item.suitableAudience
      : [],
    // SUBcategory ids - resolve against fetchCategories().subCategories.
    search_category: Array.isArray(item.searchCategory)
      ? item.searchCategory
      : [],
    media_count: Array.isArray(item.publicMedia) ? item.publicMedia.length : 0,
    promotion_discount_applied: !!item.promotionDiscountApplied,
    membership_discount_applied: !!item.membershipDiscountApplied,
  }
}

/**
 * Walk /service/list and collect every page into one de-duplicated set.
 * Offset paging over a live, drifting collection can repeat or skip rows, so
 * duplicates are dropped and counted rather than silently kept.
 * @param {object} filters body sent on every page (search/category/tag/...)
 * @param {string} snapshotTs ISO timestamp shared by every row
 * @param {{ maxRows?: number, pinBrowseSeed?: boolean }} [options]
 *   maxRows        stop early once this many unique rows are held
 *   pinBrowseSeed  carry page 1's browseSeed/rotationKey into later pages.
 *                  Only meaningful for an unfiltered feed; with `search` or
 *                  `sortBy` set, the API omits both and this is a no-op.
 */
async function collect(filters, snapshotTs, options = {}) {
  const { maxRows = Infinity, pinBrowseSeed = false } = options

  const rows = []
  const seen = new Set()
  let duplicates = 0
  let total = null
  let seed
  let rotationKey
  let page = 1
  let pagesRead = 0

  while (page <= MAX_PAGES && rows.length < maxRows) {
    const body = {
      ...filters,
      page,
      limit: PAGE_SIZE_MAX,
      perPage: PAGE_SIZE_MAX,
      ...(pinBrowseSeed && seed !== undefined ? { browseSeed: seed } : {}),
      ...(pinBrowseSeed && rotationKey !== undefined ? { rotationKey } : {}),
    }

    const data = await request(SERVICE_LIST_URL, body)
    pagesRead++

    if (page === 1) {
      total = typeof data.total === 'number' ? data.total : null
      seed = data.browseSeed
      rotationKey = data.rotationKey
    }

    const docs = Array.isArray(data.docs) ? data.docs : []
    for (const doc of docs) {
      if (seen.has(doc._id)) {
        duplicates++
        continue
      }
      seen.add(doc._id)
      rows.push(slimService(doc, rows.length, snapshotTs))
      if (rows.length >= maxRows) break
    }

    // `hasNextPage` is authoritative; `pages` is absent under skipTotal and an
    // empty page means the collection shrank under us mid-run.
    if (!data.hasNextPage || docs.length === 0) break
    page++
    await sleep(PAGE_GAP_MS)
  }

  return {
    snapshot_ts: snapshotTs,
    filters,
    count: rows.length,
    // total is the API's claim at page 1; count may differ after drift.
    total,
    pages_read: pagesRead,
    duplicates,
    // Present only for an unfiltered feed; both null means the run was
    // deterministic and its ranks are comparable across snapshots.
    browse_seed: seed ?? null,
    rotation_key: rotationKey ?? null,
    truncated: page > MAX_PAGES || rows.length >= maxRows,
    rows,
  }
}

/**
 * Collect a keyword search in relevance order.
 * Sending `search` is what suppresses the hourly shuffle, so these ranks are
 * stable enough to compare between snapshots.
 * @param {string} keyword required; an empty keyword would return the
 *   shuffled browse feed instead, whose ranks are meaningless
 * @param {{ category?: string|string[], tag?: string|string[], maxRows?: number }} [options]
 *   tag MUST be an ObjectId - a tag title silently yields zero rows
 * @param {string} snapshotTs ISO timestamp shared by every row
 */
export async function searchServices(keyword, options = {}, snapshotTs) {
  if (!keyword || !String(keyword).trim()) {
    throw new Error('searchServices requires a keyword')
  }
  const { category, tag, maxRows } = options
  return {
    source: 'comsgg.service.search',
    ...(await collect(
      {
        search: String(keyword).trim(),
        ...(category !== undefined ? { category } : {}),
        ...(tag !== undefined ? { tag } : {}),
      },
      snapshotTs,
      { maxRows }
    )),
  }
}

/**
 * Collect services ordered by listing date - the only non-relevance ordering
 * the API accepts, and the one to use for "what is new on the platform".
 * @param {{ order?: 'asc'|'desc', category?: string|string[], tag?: string|string[], maxRows?: number }} [options]
 * @param {string} snapshotTs ISO timestamp shared by every row
 */
export async function fetchNewestServices(options = {}, snapshotTs) {
  const { order = 'desc', category, tag, maxRows } = options
  return {
    source: 'comsgg.service.newest',
    ...(await collect(
      {
        sortBy: SORT_FIELD,
        sortOdr: order,
        ...(category !== undefined ? { category } : {}),
        ...(tag !== undefined ? { tag } : {}),
      },
      snapshotTs,
      { maxRows }
    )),
  }
}

/**
 * Collect every public service belonging to one seller.
 * @param {string} userId the ObjectId from a row's `user_id`
 * @param {string} snapshotTs ISO timestamp shared by every row
 */
export async function fetchSellerServices(userId, snapshotTs) {
  if (!userId) throw new Error('fetchSellerServices requires a userId')
  return {
    source: 'comsgg.service.bySeller',
    user_id: userId,
    ...(await collect({ userId }, snapshotTs)),
  }
}

/**
 * Fetch one service's full record (description, add-ons, policy ids - none of
 * which appear in the list feed).
 * @param {string} serviceId the ObjectId from a row's `service_id`
 */
export async function fetchServiceDetail(serviceId) {
  if (!serviceId) throw new Error('fetchServiceDetail requires a serviceId')
  const params = new URLSearchParams({ id: serviceId })
  return request(`${SERVICE_DETAIL_URL}?${params.toString()}`)
}

/**
 * Fetch a seller's public profile: rating, reviewCount, commissionStatus,
 * badges and portfolio summary.
 * @param {string} userName the handle from a row's `user_name`. Passing a
 *   user _id here returns 404 PROFILE_NOT_FOUND.
 */
export async function fetchPublicProfile(userName) {
  if (!userName) throw new Error('fetchPublicProfile requires a userName')
  return request(`${PUBLIC_PROFILE_URL}/${encodeURIComponent(userName)}`)
}

/**
 * Fetch the 11 top-level commission categories, each carrying its embedded
 * `subCategories` array. One call resolves the ids found in a row's
 * `search_category`.
 * @param {'commission'|'shop'} [type]
 */
export async function fetchCategories(type = 'commission') {
  return request(`${CATEGORY_LIST_URL}/${encodeURIComponent(type)}`)
}

/**
 * Fetch the popular tag list with per-tag `serviceCount`.
 * This is the only way to turn a tag title into the ObjectId that the
 * `tag` filter requires, and the counts are a free platform-size signal.
 */
export async function fetchPopularTags() {
  const payload = await request(POPULAR_TAGS_URL)
  return Array.isArray(payload.tags) ? payload.tags : []
}

/**
 * Fetch one seller's portfolio page.
 * @param {string} userId ObjectId
 * @param {{ page?: number, limit?: number }} [options]
 */
export async function fetchSellerPortfolio(userId, options = {}) {
  if (!userId) throw new Error('fetchSellerPortfolio requires a userId')
  const { page = 1, limit = PAGE_SIZE_MAX } = options
  return request(PORTFOLIO_URL, { userId, page, limit })
}

/**
 * Fetch one seller's reviews plus `averageRating` / `reviewCount`.
 * @param {string} userId ObjectId
 * @param {{ page?: number, limit?: number }} [options]
 */
export async function fetchSellerReviews(userId, options = {}) {
  if (!userId) throw new Error('fetchSellerReviews requires a userId')
  const { page = 1, limit = PAGE_SIZE_MAX } = options
  return request(REVIEWS_URL, { userId, page, limit })
}
