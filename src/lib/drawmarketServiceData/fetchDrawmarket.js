// Drawmarket public-data fetchers (server-side, unauthenticated, read-only)
// --------------------------------------------------------------------------
// draw.market is the OVERSEAS build of NetEase's Huajia commission platform.
// Every endpoint lives under /napp/overseas_* and the media CDN is
// netease.com / easebar.com. Response bodies still carry Chinese display
// strings (category_desc, sales_desc, error) even on the English site, so
// those fields are labels to map, never to show to a user directly.
//
// All four endpoints below are PUBLIC (verified: anonymous curl returns
// HTTP 200 with full data, no cookie required), so this runs with no session
// token at all. Only GET feeds are called; nothing here writes, follows, or
// logs a view, so collection cannot pollute counters or raise account risk.
//
// ENVELOPE. Success is {code:200, data:{...}, msg:"ok", status:"ok"}.
// Failure is {code:1002, error:"<Chinese>", extra:"<param name>",
// msg:"param error", top:false} and still arrives as HTTP 200 - so the HTTP
// status alone never proves a call worked. `code` must be checked, and
// `extra` names the offending parameter, which is what makes 1002 debuggable.
//
// THE ID CHAIN. Three distinct identifiers, and the middle one is only
// reachable through an API call:
//
//   profile handle        internal uid         goods id
//   "dansenak249"   ->    "BmY3V7ZB"     ->    "KBq0nq8e"
//   (dynamic_id)          (uid)                (id == unique_id)
//
// The store listing endpoint accepts ONLY `uid`, never the handle, so a
// profile crawl always costs one user/detail call first. On a goods record
// `id` and `unique_id` are the same string; `id` is the one the detail
// endpoint wants.
//
// PAGING differs per endpoint and this is easy to get wrong:
//   - search          reports `count` (total matches) => pages are computable
//   - store list      reports `has_more` (bool) and NO total => must walk
// `page` is 1-based. `page_size` is capped at 100; 101 or more returns 1002
// with extra:"page_size". Reading one page of 100 instead of five of 20 is
// both fewer requests and immune to drift between pages, so collection
// always uses the cap.
//
// `keyword` is REQUIRED on search: an empty value returns 1002, so the whole
// catalogue cannot be enumerated keyword-free. Categories must be probed one
// known value at a time (observed live: 1 = standard commission window,
// 10 = Vtuber assets). Omitting `category` searches across all of them and
// is the only way seen so far to get an unfiltered keyword total.
//
// MONEY UNITS ARE MIXED, and nothing in the payload says so:
//   - goods.price            integer CENTS  (8500 => $85.00)
//   - extra_options[].amount integer DOLLARS (35 => $35.00)
// Confirmed against a live listing whose UI shows $85 base with +$15/+$30
// add-ons. Dividing both by 100, or neither, silently produces prices that
// are wrong by 100x, so the two are converted separately below.
//
// SEARCH MATCHING AND SORT, reverse-engineered from five live keyword sets
// (animation=30, illustration=388, "Full Body"=326, full=205, body=263):
//
//   1. Only the TITLE is matched. Of 388 "illustration" hits, 388 carried the
//      term in `name` and 0 matched on description alone, so description text
//      is dead weight for discovery.
//   2. The query is TOKENISED and the result set is the UNION (OR) of each
//      token's matches. Verified by exact arithmetic twice:
//        |animation| + |illustration| - shared = 30 + 388 - 2 = 416, and
//        "Animation for Illustration" returns exactly 416. ("for" is dropped
//        as a stopword - it adds nothing to the total.)
//        |full| + |body| - shared = 205 + 263 - 142 = 326, and
//        "Full Body" returns exactly 326.
//      Adjacency is NOT required: "full-body" is tokenised on the hyphen and
//      lands in the top tier, so a phrase query never behaves as a phrase.
//   3. SORT IS A BINARY TIER on token coverage: titles matching EVERY query
//      token rank first, everything else follows in one undifferentiated
//      bucket. "Full Body" split perfectly - all 142 two-token matches took
//      ranks 1-142 and rank 143 began the one-token tail. A three-token query
//      ("full body illustration", 590 hits) put all 50 full-coverage titles in
//      ranks 1-50, after which two-token and one-token hits were interleaved
//      with no separation between them.
//   4. WITHIN a tier the order is stable across refetches but tracks NO
//      business metric: Spearman of rank against price, sold_count,
//      follow_count, average_score and stock all came back under |0.10|, and
//      rank deciles are flat. So a seller cannot climb within a tier by
//      pricing, sales or followers - only by getting more query tokens into
//      the title. Single-word queries put every hit in one tier, which is why
//      an ordering like the "animation" top 30 looks arbitrary.
//
// SEARCH VISIBILITY. Measured on a brand-new listing: a service with
// `primary_labels: []` was absent from every title-token search ("animation",
// "illustration") even though its title contains those words, while all ten
// sampled indexed competitors carried at least one primary label. Title text
// IS matched for labelled items (a title-only phrase like "Claw Machine"
// retrieves its listing at rank 1). Treat an empty `primary_labels` as the
// prime suspect whenever a listing is missing from keyword results - but see
// the 2026-11-15 follow-up below: labels are necessary, not sufficient.
//
// SELLER-NAME MATCHING WAS REMOVED from goods search by 2026-11-15. In
// October `keyword=Dann` returned the seller's listing at rank 1; now it
// returns count 0, and so does a known competitor's name ("PixelPika"). Seller
// lookup moved to its own endpoint, /napp/overseas_search/artist, whose rows
// carry `detailed_show_works` (goods and works mixed, tagged by item_type).
// Do not use a seller name as a goods-search probe any more.
//
// TWO INDEPENDENT REVIEW TRACKS, and they live on different objects:
//
//   account  user.artist_auth_status, user.artist_grade
//   service  goods.primary_labels, extras.is_label_reviewing,
//            goods.review_secondary_labels, extras.can_edit_label
//
// Surveyed 23 sellers sampled across the whole rank range of the 388-result
// "illustration" set: every single one was artist_auth_status=3 with
// artist_grade=1 and at least one primary label. The unlabelled account under
// study sits at artist_auth_status=4 with artist_grade=null - a clean 23/0
// split on the only two account fields that differ at all (onboarding,
// has_finished_work_permission, show_tabs and the rest are identical).
// `artist_grade` is only ever populated alongside status 3, so grade=null
// reads as "artist authentication not yet completed".
//
// Crucially the SERVICE-side status fields are already indistinguishable from
// live competitors (publish_status=2, listing_status=1), and
// is_label_reviewing is false rather than true - so an unlabelled listing is
// not sitting in a label-review queue. Combined with can_edit_label=false
// (the seller cannot assign labels themselves), the account track is the
// upstream gate, not a consequence of the service track. The 3-vs-4 enum has
// no description field anywhere in the payload, so the meaning of each value
// is inferred from this correlation rather than documented by the API.
//
// CONFIRMED 2026-11-15 when the account under study was verified. Account
// track: artist_auth_status 4 -> 3, artist_grade null -> 1. Service track,
// with no seller action (can_edit_label is still false): primary_labels went
// from [] to [1 Illustration > 2 Single Illustration, 20 Vtuber Design > 25
// Other Stream Assets]. So the account gate does release labelling, and the
// labels are chosen by the platform, not the seller.
//
// What labelling unlocked, and what it did NOT:
//   - BROWSE: visible at once. /napp/overseas_store/goods/list filtered by
//     `primary_label_id` / `secondary_label_id` (category=1) placed the
//     listing at #56/270 (label 25), #122/628 (label 20), #561/2185 (label 2)
//     and #998/3806 (label 1).
//   - KEYWORD SEARCH: still invisible for every title token ("animation",
//     "illustration", "full", "body", "background", "only") and for the full
//     title phrases. Browse and keyword search are therefore separate indexes,
//     and a label assigned by the platform reached the browse one first.
//     Unresolved: whether search catches up on a timer or only on a seller
//     edit that re-saves the listing.
//
// PAYMENT FIELDS ARE NOT THE GATE. `extras.paypal_supported` is false on 16
// of 28 sampled search-visible listings, and the unlisted listing's
// payee_methods_tag / service_fee_option / channel_fee_option signature is
// byte-identical to 13 of them.
//
// BROWSE ORDERING (goods/list), measured on the 628-row label-20 feed:
//   - Default order == order_by "newest" == "explore"; deterministic across
//     refetches and uncorrelated with every business field (|spearman| <= 0.25
//     for price, sold_count, follow_count, average_score, stock). The key is
//     recency, confirmed indirectly since rows carry no timestamp: on the
//     3806-row label-1 feed all 30 rows whose sales_desc reads "just listed"
//     sat inside the top 146, and median follow_count climbs from 18 in the
//     first decile to 36 in the last (older listings have had longer to
//     collect favourites). It is listing time, NOT label-assignment time: a
//     listing created 2026-10-03 and labelled in November sat at #998, not
//     near the top.
//   - order_by "hot_rec" and "random" return the SAME list, and it is not
//     random: identical across refetches, spearman(rank, follow_count) =
//     -0.997. "Popular" is a straight favourites sort.
//   - An unknown order_by value (e.g. "price_asc") returns code 1002 with
//     extra:"order_by", so the accepted set can be probed safely.
//   - The unfiltered feed returned 6000 rows without has_more clearing; the
//     probe stopped there, so the true catalogue size is larger.

const BASE = 'https://draw.market/napp'

const USER_DETAIL_URL = `${BASE}/overseas_user/detail`
const STORE_LIST_URL = `${BASE}/overseas_store/goods/list/user`
const SEARCH_URL = `${BASE}/overseas_search/goods`
const GOODS_DETAIL_URL = `${BASE}/overseas_store/goods/detail`

// Hard API ceiling: page_size > 100 is rejected with code 1002.
const PAGE_SIZE_MAX = 100

// Observed category values. Not an enum from the API - probed one by one, so
// treat this as "known so far" rather than complete.
//
// LABEL TAXONOMY (2026-11-15, /napp/overseas_store/goods/filters). Eight
// primary labels, split across the two categories:
//   category 1   1 Illustration, 8 Character Design, 20 Vtuber Design,
//                26 Emotes
//   category 10  30 Customizable VTuber Model, 32 Pre-Made Model,
//                34 VTuber Model Add-ons, 36 Post Graphic
// Secondary labels are NOT returned by the filters endpoint and their rows
// carry no parent id, only a Chinese `name`; they were harvested from browse
// rows instead (about 29 ids). Filtering primary+secondary together is an
// AND over a listing's label set, and listings carry several primaries, so
// that filter cannot recover the parent either - ID ranges are the only hint.
//
// Seller-side classification fields (styles, techniques, types, zones,
// prefer_labels, refuse_labels) were empty on 20 of 20 search-visible
// listings, so they are unused and not a visibility lever.
export const CATEGORY = {
  COMMISSION: 1, // category_desc: standard custom commission window
  VTUBER_ASSETS: 10,
}

const PAGE_GAP_MS = 300 // politeness pause between pages
const MAX_TRIES = 4 // attempts per request before giving up
const RETRY_BACKOFF_MS = [1000, 4000, 10000] // waits before try 2, 3, 4
const REQUEST_TIMEOUT_MS = 30000
const MAX_PAGES = 200 // stop runaway loops if has_more never clears

const BROWSER_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'

// Upstream hiccups worth retrying; a 1002 param error is a real answer.
const TRANSIENT = new Set([408, 429, 500, 502, 503, 504])

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

/**
 * GET one Drawmarket endpoint and unwrap the {code,data} envelope.
 * Retries transient HTTP failures on the same URL; a code 1002 body is
 * surfaced as an error because retrying a bad parameter never helps.
 * @param {string} url fully-qualified request URL
 * @returns {Promise<object>} the `data` object from a code 200 response
 */
async function fetchData(url) {
  let lastError

  for (let attempt = 1; attempt <= MAX_TRIES; attempt++) {
    try {
      const res = await fetch(url, {
        method: 'GET',
        headers: { accept: 'application/json', 'user-agent': BROWSER_UA },
        cache: 'no-store',
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      })

      if (!res.ok) {
        if (TRANSIENT.has(res.status) && attempt < MAX_TRIES) {
          lastError = new Error(`HTTP ${res.status} for ${url}`)
          await sleep(RETRY_BACKOFF_MS[attempt - 1])
          continue
        }
        throw new Error(`HTTP ${res.status} for ${url}`)
      }

      const body = await res.json()
      if (body.code !== 200) {
        // `extra` names the rejected parameter; without it a 1002 is opaque.
        throw new Error(
          `Drawmarket code ${body.code} (${body.msg}) on param "${body.extra}" for ${url}`
        )
      }
      return body.data
    } catch (error) {
      lastError = error
      const retryable =
        attempt < MAX_TRIES && !String(error.message).includes('Drawmarket code')
      if (!retryable) throw error
      await sleep(RETRY_BACKOFF_MS[attempt - 1])
    }
  }

  throw lastError
}

const qs = (params) => new URLSearchParams(params).toString()

/** @param {number|null|undefined} cents @returns {number|null} */
const centsToUsd = (cents) =>
  typeof cents === 'number' ? Math.round(cents) / 100 : null

/**
 * Keep only the fields relevant to the study. `price` is cents here, while
 * the add-on amounts sampled from the detail endpoint are already dollars.
 */
function slimGoods(item, rank, snapshotTs) {
  return {
    snapshot_ts: snapshotTs,
    rank,
    goods_id: item.id,
    name: item.name || null,
    price_usd: centsToUsd(item.price),
    category: item.category ?? null,
    listing_status: item.listing_status ?? null,
    stock: item.stock ?? null,
    sold_count: item.sold_count ?? 0,
    follow_count: item.follow_count ?? 0,
    average_score: item.average_score ?? null,
    requires_inquiry: !!item.requires_inquiry,
    media_tag_type: item.media_tag_type ?? null,
    // Chinese display string ("just listed", "N sold"); kept raw as a signal.
    sales_desc: item.sales_desc || null,
  }
}

/**
 * Resolve a public profile handle to the internal uid plus tab counts.
 * The uid is the only key the store listing endpoint accepts.
 * @param {string} handle profile link, e.g. "dansenak249"
 * @returns {Promise<{uid: string, name: string, handle: string, counts: object, raw: object}>}
 */
export async function fetchUser(handle) {
  const data = await fetchData(
    `${USER_DETAIL_URL}?${qs({ dynamic_id: handle })}`
  )
  const user = data.user || {}

  return {
    uid: user.uid,
    name: user.name || null,
    handle: user.profile_link || handle,
    counts: {
      commission: data.commission_count ?? 0,
      shop: data.shop_count ?? 0,
      work: data.work_count ?? 0,
      reviews: data.reviews_count ?? 0,
      followers: user.follower_count ?? 0,
      following: user.following_count ?? 0,
    },
    raw: data,
  }
}

/**
 * Walk one user's store listings for a category. This endpoint reports no
 * total, so paging stops on `has_more === false` (or an empty page, which
 * guards against has_more being stuck true).
 * @param {string} uid internal user id from fetchUser
 * @param {number} category see CATEGORY
 * @param {string} snapshotTs ISO timestamp shared by every row
 * @returns {Promise<{source: string, snapshot_ts: string, uid: string, count: number, rows: object[]}>}
 */
export async function fetchUserGoods(uid, category, snapshotTs) {
  const rows = []

  for (let page = 1; page <= MAX_PAGES; page++) {
    const data = await fetchData(
      `${STORE_LIST_URL}?${qs({
        uid,
        page,
        page_size: PAGE_SIZE_MAX,
        category,
      })}`
    )
    const items = data.goods_list || []
    for (const item of items) rows.push(slimGoods(item, rows.length, snapshotTs))

    if (!data.has_more || items.length === 0) break
    await sleep(PAGE_GAP_MS)
  }

  return {
    source: 'drawmarket.store.user',
    snapshot_ts: snapshotTs,
    uid,
    category,
    count: rows.length,
    rows,
  }
}

/**
 * Enumerate a keyword search completely. `count` is the true total, so the
 * page budget is known up front; `rank` is the global result position, which
 * is the value worth tracking over time.
 *
 * Omit `category` to search across every category at once.
 * @param {string} keyword required - an empty keyword returns code 1002
 * @param {{ category?: number }} [options]
 * @param {string} snapshotTs ISO timestamp shared by every row
 * @returns {Promise<{source: string, snapshot_ts: string, keyword: string, total: number, count: number, rows: object[]}>}
 */
export async function searchGoods(keyword, options, snapshotTs) {
  if (!keyword) throw new Error('searchGoods: keyword is required')
  const category = options && options.category

  const rows = []
  let total = 0

  for (let page = 1; page <= MAX_PAGES; page++) {
    const params = { keyword, page, page_size: PAGE_SIZE_MAX }
    if (category !== undefined && category !== null) params.category = category

    const data = await fetchData(`${SEARCH_URL}?${qs(params)}`)
    const items = data.goods_list || []
    if (page === 1) total = data.count ?? 0

    for (const item of items) rows.push(slimGoods(item, rows.length, snapshotTs))

    if (items.length === 0 || rows.length >= total) break
    await sleep(PAGE_GAP_MS)
  }

  return {
    source: 'drawmarket.search.goods',
    snapshot_ts: snapshotTs,
    keyword,
    category: category ?? null,
    total,
    count: rows.length,
    rows,
  }
}

/**
 * Full detail for one listing: pricing tiers, add-ons and the primary labels
 * that decide keyword visibility. Add-on amounts are dollars already, so
 * they are passed through untouched while `price` is converted from cents.
 * @param {string} goodsId the `id` from a search or store row
 * @returns {Promise<object>}
 */
export async function fetchGoodsDetail(goodsId) {
  const data = await fetchData(`${GOODS_DETAIL_URL}?${qs({ goods_id: goodsId })}`)
  const goods = data.goods || {}
  const markup = (data.extras && data.extras.markup_config) || {}

  return {
    goods_id: goods.id,
    name: goods.name || null,
    price_usd: centsToUsd(goods.price),
    original_price_usd: centsToUsd(goods.original_price),
    category: goods.category ?? null,
    listing_status: goods.listing_status ?? null,
    publish_status: goods.publish_status ?? null,
    sale_status: goods.sale_status ?? null,
    stock: goods.stock ?? null,
    sold_count: goods.sold_count ?? 0,
    follow_count: goods.follow_count ?? 0,
    average_score: goods.average_score ?? null,
    evaluation_count: goods.evaluation_count ?? 0,
    requires_inquiry: !!goods.requires_inquiry,
    auto_delivery: !!goods.auto_delivery,
    // Empty array here is the known cause of a listing missing from search.
    primary_labels: (goods.primary_labels || []).map((label) => ({
      id: label.id,
      en_title: label.en_title || null,
      secondary: (label.secondary_labels || []).map((s) => s.id),
    })),
    // Already dollars - do NOT divide by 100.
    extra_options: (markup.extra_options || []).map((option) => ({
      id: option.id,
      name: option.name,
      amount_usd: option.amount ?? null,
      position: option.position ?? null,
    })),
    authority_prices: (markup.authority_prices || []).map((entry) => ({
      authority_type: entry.authority_type,
      amount_usd: entry.amount ?? null,
      multiplier: entry.multiplier ?? null,
    })),
    seller: {
      uid: goods.user && goods.user.uid,
      name: goods.user && goods.user.name,
      handle: goods.user && goods.user.profile_link,
    },
    plans: goods.plans || null,
    raw: data,
  }
}
