// Token-gated read access to the census, for people (and LLMs) outside the tool
// ---------------------------------------------------------------------------
// GET /api/vgen-service-data/export
//     -> the whole-census summary: one row per category, both marketplaces
// GET /api/vgen-service-data/export?categoryID=rec...&market=commission|shop
//     -> the stored listings inside one category, paged
//
// WHY THIS EXISTS. The dashboard's own /data and /census routes walk every
// category one key at a time, which costs 300-1000 Upstash commands per page
// load. Handing that URL to a colleague would drain a month's quota in an
// afternoon. This route answers the same questions from a pre-built snapshot:
// one command on a hit, six on a rebuild.
//
// WHY IT DOCUMENTS ITSELF. The intended reader is often an LLM, and an LLM only
// knows what is in front of it -- it cannot be told to "check the wiki". So the
// response carries its own manual: what each field means, what it does NOT mean,
// and which other calls exist. Pass ?readme=0 once the shape is understood and
// the bytes are not wanted.
//
// AUTH: a read token from /tools/bot-config, presented as
//   Authorization: Bearer <token>   (preferred)
//   X-Api-Key: <token>
//   ?token=<token>                  (for callers that cannot set headers)
// A read token can ONLY read. Writing still needs an account -- see writeAuth.js.

import { NextResponse } from 'next/server'
import { resolveReadToken } from '@/lib/botConfig/tokenStore'
import { isMaster } from '@/lib/botConfig/store'
import { serviceScore } from '@/lib/vgenServiceData/fetchCategory'
import {
  getCategoryMap,
  getShopCategoryMap,
  getCategoryMetaMany,
  getCategoryMeta,
  getMetaMany,
  getRotation,
  getExportSnapshot,
  setExportSnapshot,
  getRankSnapshot,
  setRankSnapshot,
  getExchangeRates,
  listCategoryServicesMany,
  iterateCategoryChunks,
  shopKey,
} from '@/lib/vgenServiceData/store'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 0

// How stale the summary may get. Five minutes is far shorter than the interval
// at which any single category changes (the rotation needs hours to come back
// around), so this is generous; it is short only because a rebuild is cheap.
const SNAPSHOT_TTL_SEC = 300

const DEFAULT_LIMIT = 500
const MAX_LIMIT = 5000

// The leaderboard is the one answer that cannot be assembled from the other two
// endpoints: "busiest lately, across the whole catalogue" needs every category
// at once, and a caller working one category per request would need ~160 of them
// and then a merge. So the walk happens here, once, and only the top slice is
// sent -- which is also the only version that fits in a model's context.
//
// A rebuild is ~50 commands against Upstash, an order more than the summary, so
// the TTL is correspondingly longer. It costs nothing in accuracy: the rotation
// takes hours to come back to any one category, so half an hour is still far
// finer-grained than the data underneath it moves.
const RANK_TTL_SEC = 1800
const RANK_DEFAULT_LIMIT = 50
const RANK_MAX_LIMIT = 500
// Listings that get a review-feed lookup. Reading a window for all ~160k stored
// listings would be 800 round trips per rebuild; this is the shortlist that
// earns one, chosen by the busy-ness score the census already carries.
const RANK_CANDIDATES = 3000
const RANK_WINDOWS = { 30: 'last30', 90: 'last90', 365: 'last365' }

const NO_STORE = { 'Cache-Control': 'no-store' }
// Served from a snapshot that is itself capped at SNAPSHOT_TTL_SEC, so letting
// the CALLER hold it for the same window costs nothing in freshness and spares
// the round trip entirely.
//
// `private` is load-bearing, not decoration. This response is token-gated, but a
// shared cache keys on the URL alone -- and the token normally travels in a
// header. Marked public, Vercel's edge cached one authorised 200 and then served
// it to every later request for the same URL, token or not: a caller with no
// credential at all got the full census for the next five minutes. `private`
// forbids shared caches from storing it while still letting the browser reuse
// its own copy. Vary is belt and braces for any intermediary that ignores that.
const CACHEABLE = {
  'Cache-Control': `private, max-age=${SNAPSHOT_TTL_SEC}`,
  Vary: 'Authorization, X-Api-Key',
}

const AUTH_HELP = {
  how_to_authenticate: [
    'Authorization: Bearer <token>  (preferred)',
    'X-Api-Key: <token>',
    '?token=<token>  (only if the caller cannot set headers; it lands in server logs)',
  ],
  where_to_get_a_token: 'Ask the owner to mint one in /tools/bot-config.',
}

// The manual. Written out in full rather than linked, because the reader may be
// a model that cannot follow a link, and because a field glossary that lives
// somewhere else is a field glossary that goes stale.
function readme(mode) {
  const shared = {
    what_this_is:
      'A census of public VGen listings, crawled category by category. It is ' +
      'competitor research: every number here is something VGen shows publicly.',
    endpoints: {
      summary: 'GET /api/vgen-service-data/export',
      category:
        'GET /api/vgen-service-data/export?categoryID=<recXXXX>&market=commission|shop' +
        '&limit=<1-5000>&offset=<n>',
      ranking:
        'GET /api/vgen-service-data/export?rank=30|90|365&limit=<1-500>  -- the ' +
        'busiest commission listings across EVERY category, already ranked. Use ' +
        'this for any "top N lately" question instead of paging the categories ' +
        'yourself; it is the only call that sees the whole catalogue at once.',
    },
    two_marketplaces:
      'VGen has two separate catalogues. "commission" is custom work ordered ' +
      'from an artist; "shop" is ready-made products. They are different ' +
      'taxonomies that happen to share 36 category ids, so a categoryID is only ' +
      'meaningful together with its market.',
    auth: AUTH_HELP,
    quiet_mode: 'Append &readme=0 to drop this block from the response.',
  }

  if (mode === 'category') {
    return {
      ...shared,
      rows_are:
        'One row per listing stored for this category. The crawl keeps the ' +
        'busiest listings it found, NOT every listing that exists -- so treat ' +
        'this as a sample of the top of the category, not a complete index.',
      // VGen's own labels are the main trap here. Several read like ordinary
      // English but mean something narrower, and two of them look like a
      // matching pair across the marketplaces while measuring different things.
      vgen_vocabulary: {
        service:
          'A commission LISTING (an offer an artist advertises), not a running ' +
          'service. "serviceID" identifies a listing.',
        commission:
          'One custom order placed against a listing. So "completed comms" ' +
          'counts orders delivered, not listings.',
        product: 'A ready-made item on the shop side. Sold as-is, no order negotiated.',
        basePrice:
          'The STARTING price of a listing -- the cheapest tier the artist will ' +
          'take. It is a floor, not a transaction price: real commissions add ' +
          'options and rush fees, so basePrice systematically UNDERSTATES what ' +
          'the listing earns. On shop it is much closer to the real price.',
        artistReviewStats:
          'VGen\'s name for stats covering the WHOLE ARTIST. Exposed here as the ' +
          'artist-prefixed fields so the scope is visible at the point of use.',
        shopReviewStats:
          'Despite looking like the parallel of the above, this one is PER ' +
          'PRODUCT. Exposed here as reviewCount / avgRating / stars.',
        lifetimeServiceStats:
          'Per-listing lifetime counters. Only serviceCompletedComms is kept.',
        searchIndex:
          'VGen\'s internal ranking score. Deliberately NOT exported -- it is ' +
          'recomputed daily and nothing here displays in that order.',
      },
      commission_fields: {
        serviceID: 'VGen id for the listing.',
        userID: 'VGen id for the artist.',
        categoryID: 'The category this listing was crawled under.',
        serviceName: 'Listing title, verbatim.',
        type: 'VGen service type string.',
        basePrice:
          'Starting price in `currency` (a plain number, NOT minor units). See ' +
          '`basePrice` in vgen_vocabulary: it is a floor, not what an order costs.',
        currency:
          'ISO currency code the artist prices in. Rows in one category mix ' +
          'several currencies -- never sum or rank basePrice without converting.',
        created: 'When the listing was first published (ISO 8601).',
        modified: 'When the artist last edited it (ISO 8601).',
        artistTotalReviews:
          'Reviews across ALL of this artist\'s services. NOT this listing\'s ' +
          'review count -- VGen does not publish a per-service one on the ' +
          'commission side. Using it as a per-listing figure is the single ' +
          'most common mistake with this dataset.',
        artistAvgRating: 'Average rating across all of the artist\'s services.',
        serviceCompletedComms:
          'Completed commissions for THIS listing, but only present when the ' +
          'artist opted to publish it (roughly 15% do). null means "not ' +
          'published", never "zero". It is the only per-listing volume figure ' +
          'on the commission side, and a truer one than reviews: every order ' +
          'counts, not just the ones a client bothered to review.',
        username: 'Artist handle.',
        displayName: 'Artist display name.',
        tags: 'The artist\'s own search keywords, verbatim. VGen caps these at 5.',
        reviewsTotal:
          'Reviews on THIS listing, counted from its own public review feed. ' +
          'This is the per-listing number artistTotalReviews is NOT. null means ' +
          'the feed has not been pulled for this listing (see review_windows).',
        reviewsLast30:
          'Reviews on this listing in the 30 days before `reviewsAsOf`. The ' +
          'closest thing to a recent-activity signal in this dataset.',
        reviewsLast90: 'Same, over 90 days.',
        reviewsLast365: 'Same, over 365 days.',
        reviewsAsOf:
          'When the review feed was pulled (ISO 8601). The windows are measured ' +
          'backwards from THIS, not from now -- see review_windows.',
      },
      shop_fields: {
        productID: 'VGen id for the product.',
        userID: 'VGen id for the seller.',
        categoryID: 'The category this product was crawled under.',
        productName: 'Product title, verbatim.',
        basePrice: 'Price in `currency`, a plain number. Same currency warning as above.',
        currency: 'ISO currency code the seller prices in.',
        pricingType: 'VGen pricing mode for the product.',
        created: 'When the product was first listed (ISO 8601).',
        modified: 'When the seller last edited it (ISO 8601).',
        salesCount: 'Real order count for THIS product, present on every listing.',
        paidSalesCount: 'Of those, the paid ones.',
        freeSalesCount: 'Of those, the free ones. Free orders earn nothing.',
        isNumberOfSalesPublic:
          'Whether the seller displays that count. The count is returned either ' +
          'way; this says whether quoting it publicly is fair.',
        reviewCount: 'Reviews for THIS product (unlike the commission side).',
        avgRating: 'Average rating for this product.',
        stars: 'Counts per star, as [1-star, 2-star, 3-star, 4-star, 5-star].',
        linkedServiceID:
          'The commission service this product came from, when there is one ' +
          '(about 74% carry one). The only join between the two marketplaces.',
        username: 'Seller handle.',
        displayName: 'Seller display name.',
        tags: 'Seller keywords, verbatim. Shop allows up to 20.',
      },
      // The one part of this dataset that is NOT a lifetime total, which makes
      // it the one part a reader is most likely to misuse.
      review_windows: {
        what:
          'reviewsLast30 / reviewsLast90 / reviewsLast365 count reviews left on ' +
          'THIS listing inside that trailing window. Commission rows only.',
        measured_from:
          'Each window is measured backwards from that row\'s `reviewsAsOf`, not ' +
          'from now. If reviewsAsOf is ten days old, reviewsLast30 describes days ' +
          '-40 to -10. Check reviewsAsOf before calling a number "the last 30 ' +
          'days", and prefer comparing rows whose reviewsAsOf are close together.',
        coverage:
          'Review feeds are pulled for roughly the busiest 1000 listings per ' +
          'category, so not every row has them. null means the feed was never ' +
          'pulled; it does NOT mean zero. Exclude nulls from a ranking rather ' +
          'than treating them as the quietest listings.',
        reviews_are_not_orders:
          'Only some clients leave a review, so these are a LOWER BOUND on real ' +
          'order volume. They are a sound way to compare listings against each ' +
          'other and a poor way to state an absolute number of orders.',
      },
      // Asked constantly, and answerable only with the caveats attached. Spelled
      // out as a recipe because the alternative is every reader inventing their
      // own and getting a different number.
      estimating_revenue: {
        shop_lifetime:
          'basePrice * paidSalesCount, after converting basePrice to one ' +
          'currency. This is the soundest figure in the dataset: paidSalesCount ' +
          'is a real per-product order count and shop prices are close to fixed. ' +
          'Use paidSalesCount, not salesCount -- free orders earn nothing.',
        commission_recent:
          'basePrice * reviewsLast30 (or Last90 / Last365), converted to one ' +
          'currency. This is the recipe for "who earned most lately" on the ' +
          'commission side. Two independent reasons it UNDERSTATES: basePrice is ' +
          'the cheapest tier, and not every client reviews. Treat it as a ' +
          'comparable score between listings, not as an amount of money.',
        commission_lifetime:
          'basePrice * serviceCompletedComms, for the ~15% of listings where ' +
          'serviceCompletedComms is not null -- the truest volume figure here, ' +
          'since it counts every order rather than only reviewed ones. Where it ' +
          'is null, fall back to basePrice * reviewsTotal.',
        do_not:
          'Do not use artistTotalReviews for a per-listing revenue figure: it is ' +
          'artist-wide, so for an artist with several listings it double-counts ' +
          'every one of them. Do not mix the two marketplaces in one ranking, ' +
          'and do not compare a shop row computed from paidSalesCount against a ' +
          'commission row computed from reviews -- different units, different ' +
          'coverage.',
      },
      // The absences matter as much as the fields: a reader who assumes a column
      // exists will quietly substitute a worse one.
      not_in_this_export: {
        revenue: 'No earnings figure is published by VGen. See estimating_revenue.',
        windowed_anything_else:
          'The review windows above are the ONLY time-bounded numbers here. ' +
          'Prices, sales counts, ratings and completed-commission counts are all ' +
          'lifetime totals as of the category\'s finishedAt. There is no monthly ' +
          'series and no per-review timestamp in this export.',
        shop_recent_activity:
          'Shop rows have no windowed counts at all -- salesCount and reviewCount ' +
          'are lifetime. "Best selling shop product this month" cannot be ' +
          'answered from this endpoint; say so rather than quoting the lifetime ' +
          'figure, which would favour old products over currently popular ones.',
        per_service_reviews_on_commission:
          'VGen itself publishes review counts per ARTIST on the commission ' +
          'side. The per-listing reviewsTotal here comes from a separate feed ' +
          'pull, which is why its coverage is partial.',
        views_or_rank:
          'No view counts, no impressions, no search position, no searchIndex.',
        descriptions_and_images:
          'Dropped at crawl time: they were 73% of the payload and nothing here ' +
          'reads them.',
      },
    }
  }

  if (mode === 'rank') {
    return {
      ...shared,
      rows_are:
        'Commission listings across every crawled category, sorted by ' +
        'estRevenueUSD descending. Already ranked -- do not re-sort by a ' +
        'different field and call the result the same thing.',
      // The number has a money-shaped name and a money-shaped magnitude, and is
      // not money. Saying so first, before the field list, because a reader that
      // skims will take whatever the first line implies.
      what_estRevenueUSD_is: {
        formula: 'basePriceUSD * reviewsInWindow',
        it_is:
          'A comparable BUSY-NESS SCORE in dollar units. Good for "who is doing ' +
          'the most trade lately", because the same understatement applies to ' +
          'every row, so the ORDER is meaningful.',
        it_is_not:
          'Earnings. VGen publishes no revenue figure and this is not one. Two ' +
          'independent biases push it below reality: basePrice is the cheapest ' +
          'tier an artist offers (real orders add options and rush fees), and ' +
          'only some clients leave a review. Quote it as a score or as a floor, ' +
          'never as "this artist earned $X".',
        how_to_say_it:
          'Prefer "highest estimated activity" or "busiest by price-weighted ' +
          'review volume" over "top earners".',
      },
      rank_fields: {
        market: 'Always "commission" here -- see commission_only below.',
        serviceID: 'VGen id for the listing.',
        title: 'Listing title, verbatim (the same value as serviceName elsewhere).',
        categoryID: 'The category it was crawled under.',
        categoryName: 'That category\'s readable name.',
        artist: 'Display name, falling back to the handle.',
        artistHandle: 'VGen handle, i.e. vgen.co/<artistHandle>.',
        userID: 'VGen id for the artist.',
        basePrice: 'Starting price as the artist set it, in `currency`.',
        currency: 'ISO code that basePrice is denominated in.',
        basePriceUSD:
          'basePrice converted to USD. THIS is what the ranking uses -- ranking ' +
          'on raw basePrice across mixed currencies produces nonsense.',
        reviewsInWindow: 'Reviews on this listing inside the requested window.',
        reviewsTotal: 'Reviews on this listing, all time.',
        reviewsAsOf: 'When this listing\'s review feed was pulled (ISO 8601).',
        estRevenueUSD: 'basePriceUSD * reviewsInWindow. Read the block above.',
      },
      how_it_was_built: {
        windows_end_at_reviewsAsOf:
          'Each row\'s window is measured backwards from its OWN reviewsAsOf, and ' +
          'feeds are pulled on a rotation, so rows are not all as of the same ' +
          'moment. Spot-check the spread of reviewsAsOf before presenting the ' +
          'ranking as a single clean time period.',
        shortlist:
          'Listings are shortlisted by the census busy-ness score before their ' +
          'review feeds are read, so this is a strong approximation of the true ' +
          'top N rather than a proven one. A cheap listing with a sudden burst ' +
          'of orders can in principle sit just outside the shortlist.',
        excluded_rows:
          'A listing is dropped from the ranking when its review feed was never ' +
          'pulled, when its currency has no exchange rate, or when it has no ' +
          'price. `excluded` counts each case. Dropped is NOT the same as zero.',
        commission_only:
          'Shop products are absent by necessity, not oversight: shop carries no ' +
          'windowed counts at all (salesCount is lifetime), so there is nothing ' +
          'to rank them on over 30 days. Do not fill the gap with lifetime sales ' +
          '-- that would rank old products above currently busy ones.',
      },
      if_you_need_more:
        'This returns at most ' + RANK_MAX_LIMIT + ' rows. For the full listing ' +
        'set of one category, including fields not carried here, call the ' +
        'category endpoint.',
    }
  }

  return {
    ...shared,
    rows_are: 'One row per category the tool tracks, from both marketplaces.',
    category_fields: {
      market: '"commission" or "shop".',
      categoryID: 'VGen\'s opaque category id. Pass it back to fetch the listings.',
      categoryName: 'The readable name, maintained by hand in the dashboard.',
      auto: 'Whether the automatic rotation refreshes this category.',
      crawled: 'False means it has never been crawled; every count below is then 0.',
      count: 'Listings currently STORED for this category (the busiest ones kept).',
      seenTotal: 'Listings the crawl walked past before trimming down to `count`.',
      pages: 'Listing pages the crawl read.',
      duplicates: 'Rows VGen served twice, which the crawl discarded.',
      startedAt: 'When the most recent crawl of this category began (ISO 8601).',
      finishedAt: 'When it finished (ISO 8601). null while one is mid-flight.',
    },
    freshness:
      'Categories are refreshed one at a time by a rotation, so `finishedAt` ' +
      'varies a lot between rows. Always read a number next to its own ' +
      'finishedAt rather than treating the whole export as one moment in time.',
    caveats: [
      'Only the busiest listings per category are stored, so totals are not ' +
        'market-wide totals.',
      'A commission listing carries ARTIST-level review stats, not per-listing ' +
        'ones. A shop product carries per-product ones. Do not compare the two ' +
        'columns as if they measured the same thing.',
      'null means "VGen did not publish this", which is different from zero.',
      'Almost every figure here is a LIFETIME total. The ONLY time-bounded ones ' +
        'anywhere are the commission review windows (reviewsLast30/90/365), on ' +
        'the category and ranking endpoints. Shop has none at all, so "best ' +
        'selling product this month" is unanswerable; say so rather than ' +
        'substituting a lifetime count.',
    ],
    next_call:
      'This summary carries no listing-level data at all -- only per-category ' +
      'counts. Do not try to answer a question about individual listings from ' +
      'it. For "top N busiest lately across the whole catalogue", call ' +
      '?rank=30 (or 90 / 365): it walks every category for you and returns a ' +
      'finished ranking. For everything about one category -- prices, sales, ' +
      'review stats, artist names -- call ?categoryID=<id> with an id from the ' +
      'list above. Both carry their own field glossary.',
  }
}

function deny(message) {
  return NextResponse.json(
    { error: message, code: 'token_required', _readme: { auth: AUTH_HELP } },
    { status: 401, headers: NO_STORE }
  )
}

// Categories + their census summaries, in four Redis commands rather than one
// per category. This is what makes the snapshot cheap enough to rebuild often.
async function buildSummary() {
  const [commissionMap, shopMap] = await Promise.all([
    getCategoryMap(),
    getShopCategoryMap(),
  ])
  const commissionIDs = commissionMap.map((c) => (c.categoryID || '').trim())
  const shopIDs = shopMap.map((c) => (c.categoryID || '').trim())
  const [commissionMetas, shopMetas, rotation] = await Promise.all([
    getCategoryMetaMany(commissionIDs),
    getCategoryMetaMany(shopIDs.map((id) => shopKey(id))),
    getRotation(),
  ])

  const rows = []
  const totals = { categories: 0, crawled: 0, listings: 0, seen: 0 }

  const collect = (map, ids, metas, market) => {
    map.forEach((entry, i) => {
      const meta = metas[i]
      const row = {
        market,
        categoryID: ids[i],
        categoryName:
          (entry.categoryName || '').trim() || (entry.defaultName || '').trim() || '',
        auto: !!entry.auto,
        crawled: !!meta,
        count: (meta && meta.count) || 0,
        seenTotal: (meta && meta.seenTotal) || (meta && meta.count) || 0,
        pages: (meta && meta.pages) || 0,
        duplicates: (meta && meta.duplicates) || 0,
        startedAt: (meta && meta.startedAt) || null,
        finishedAt: (meta && meta.finishedAt) || null,
      }
      totals.categories++
      if (meta) totals.crawled++
      totals.listings += row.count
      totals.seen += row.seenTotal
      rows.push(row)
    })
  }

  collect(commissionMap, commissionIDs, commissionMetas, 'commission')
  collect(shopMap, shopIDs, shopMetas, 'shop')

  return {
    generated_at: new Date().toISOString(),
    totals,
    rotation: rotation
      ? {
          // Where the automatic refresh currently is, so a reader can tell
          // which rows are about to change.
          nowOn: rotation.label || rotation.categoryID || null,
          market: rotation.market || null,
          phase: rotation.phase || null,
          cycles: rotation.cycles || 0,
          updatedAt: rotation.updatedAt || null,
        }
      : null,
    categories: rows,
  }
}

// One category's stored listings. Streams chunk batches and stops as soon as the
// requested window is filled, so a huge category costs no more than a small one
// for the same page size.
async function readCategoryRows(key, offset, limit) {
  const meta = await getCategoryMeta(key)
  if (!meta || !meta.chunks) return { meta: null, rows: [] }
  const rows = []
  let skipped = 0
  outer: for await (const batch of iterateCategoryChunks(key, meta.chunks)) {
    for (const row of batch) {
      if (skipped < offset) {
        skipped++
        continue
      }
      rows.push(row)
      if (rows.length >= limit) break outer
    }
  }
  return { meta, rows }
}

// Meta records per MGET. They are a couple of hundred bytes each, so this can be
// far larger than the chunk batch without approaching the request ceiling: a
// full 5000-row page costs 25 round trips.
const REVIEW_META_BATCH = 200

/**
 * Attach trailing-window review counts to commission rows.
 *
 * The census itself carries only lifetime figures, which cannot answer "who is
 * busiest LATELY" — the question everyone actually asks. The windows come from
 * the review feeds the rotation pulls separately, precomputed at pull time onto
 * each service's meta record, so this is a few MGETs rather than a walk through
 * every review payload.
 *
 * Coverage is partial by design: the rotation pulls feeds for the busiest ~1000
 * listings per category. A row with no feed gets nulls, never zeroes — "not
 * measured" and "measured, nobody ordered" are opposite findings and must not
 * collapse into the same number.
 */
async function attachReviewWindows(rows) {
  const ids = rows.map((row) => row.serviceID).filter(Boolean)
  if (!ids.length) return rows
  const metas = {}
  for (let i = 0; i < ids.length; i += REVIEW_META_BATCH) {
    Object.assign(metas, await getMetaMany(ids.slice(i, i + REVIEW_META_BATCH)))
  }
  return rows.map((row) => {
    const meta = metas[row.serviceID]
    if (!meta) {
      return {
        ...row,
        reviewsLast30: null,
        reviewsLast90: null,
        reviewsLast365: null,
        reviewsTotal: null,
        reviewsAsOf: null,
      }
    }
    return {
      ...row,
      reviewsLast30: meta.last30 ?? null,
      reviewsLast90: meta.last90 ?? null,
      reviewsLast365: meta.last365 ?? null,
      reviewsTotal: meta.count ?? null,
      reviewsAsOf: meta.fetchedAt || null,
    }
  })
}

const round2 = (n) => Math.round(n * 100) / 100

/**
 * Rank every crawled commission listing by price-weighted recent review volume.
 *
 * This is the question the dashboard answers instantly and a chat client could
 * not: the dashboard pulls the whole census into a browser and sorts there,
 * which is a ~40 MB payload — fine for one tab, impossible for a model's
 * context and far too many Upstash commands to hand out. Sorting server-side
 * and sending fifty rows turns the same answer into ~30 KB.
 *
 * Three approximations, each documented in the readme rather than hidden:
 *   - the candidate pool is shortlisted by census score before any review feed
 *     is read, so the result is a strong approximation of the true top N;
 *   - rows whose feed was never pulled are EXCLUDED, not scored as zero;
 *   - each row's window ends at its own reviewsAsOf, so the set is not one
 *     clean instant.
 */
async function buildRanking(windowDays) {
  const field = RANK_WINDOWS[windowDays]
  const map = await getCategoryMap()
  const ids = map.map((c) => (c.categoryID || '').trim()).filter(Boolean)
  const nameByID = new Map(
    map.map((c) => [
      (c.categoryID || '').trim(),
      (c.categoryName || '').trim() || (c.defaultName || '').trim() || '',
    ])
  )

  const [metas, fx] = await Promise.all([
    getCategoryMetaMany(ids),
    getExchangeRates(),
  ])
  const byCategory = await listCategoryServicesMany(ids, metas)

  const all = []
  for (const id of ids) all.push(...(byCategory.get(id) || []))

  // serviceScore already rides along on every census row, so narrowing to the
  // listings worth a lookup costs no extra reads at all.
  const candidates =
    all.length > RANK_CANDIDATES
      ? [...all]
          .sort((a, b) => serviceScore(b) - serviceScore(a))
          .slice(0, RANK_CANDIDATES)
      : all

  const windows = {}
  const candidateIDs = candidates.map((row) => row.serviceID).filter(Boolean)
  for (let i = 0; i < candidateIDs.length; i += REVIEW_META_BATCH) {
    Object.assign(
      windows,
      await getMetaMany(candidateIDs.slice(i, i + REVIEW_META_BATCH))
    )
  }

  const rates = (fx && fx.rates) || {}
  const excluded = { no_review_feed: 0, no_exchange_rate: 0, no_price: 0 }
  const scored = []

  for (const row of candidates) {
    const meta = windows[row.serviceID]
    const count = meta ? meta[field] : undefined
    // Never measured. Scoring it as zero would rank a listing nobody has looked
    // at alongside one that genuinely had no orders.
    if (typeof count !== 'number') {
      excluded.no_review_feed++
      continue
    }
    if (typeof row.basePrice !== 'number') {
      excluded.no_price++
      continue
    }
    // rates[X] is "one X in USD", the multiplier a price in X needs.
    const rate = rates[row.currency || 'USD']
    if (typeof rate !== 'number') {
      excluded.no_exchange_rate++
      continue
    }
    const basePriceUSD = row.basePrice * rate
    scored.push({
      market: 'commission',
      serviceID: row.serviceID,
      title: row.serviceName || '',
      categoryID: row.categoryID || '',
      categoryName: nameByID.get(row.categoryID) || '',
      artist: row.displayName || row.username || '',
      artistHandle: row.username || '',
      userID: row.userID || null,
      basePrice: row.basePrice,
      currency: row.currency || '',
      basePriceUSD: round2(basePriceUSD),
      reviewsInWindow: count,
      reviewsTotal: meta.count ?? null,
      reviewsAsOf: meta.fetchedAt || null,
      estRevenueUSD: round2(basePriceUSD * count),
    })
  }

  scored.sort((a, b) => b.estRevenueUSD - a.estRevenueUSD)

  return {
    generated_at: new Date().toISOString(),
    window_days: windowDays,
    fx_as_of: (fx && fx.fetchedAt) || null,
    scanned: all.length,
    candidates: candidates.length,
    ranked: scored.length,
    excluded,
    // Cached at full depth so every `limit` below the maximum is served from the
    // same snapshot rather than provoking its own rebuild.
    rows: scored.slice(0, RANK_MAX_LIMIT),
  }
}

export async function GET(request) {
  const authorized = isMaster(request) || (await resolveReadToken(request))
  if (!authorized) return deny('A read token is required.')

  const { searchParams } = new URL(request.url)
  const withReadme = searchParams.get('readme') !== '0'
  const categoryID = (searchParams.get('categoryID') || '').trim()
  const market = searchParams.get('market') === 'shop' ? 'shop' : 'commission'
  const rank = (searchParams.get('rank') || '').trim()

  try {
    if (rank) {
      // Forgiving on the value: a caller guessing ?rank=recent or ?rank=1 means
      // "the recent one", and answering that with a 400 helps nobody. The window
      // actually used is echoed back, so the answer is never ambiguous.
      const windowDays = RANK_WINDOWS[rank] ? Number(rank) : 30
      const limit = Math.min(
        RANK_MAX_LIMIT,
        Math.max(1, Number(searchParams.get('limit')) || RANK_DEFAULT_LIMIT)
      )

      const name = String(windowDays)
      let snapshot = await getRankSnapshot(name)
      let cached = true
      if (!snapshot) {
        cached = false
        snapshot = await buildRanking(windowDays)
        try {
          await setRankSnapshot(name, snapshot, RANK_TTL_SEC)
        } catch {
          // Failing to cache is not failing to answer.
        }
      }

      return NextResponse.json(
        {
          ...(withReadme ? { _readme: readme('rank') } : {}),
          ...snapshot,
          returned: Math.min(limit, snapshot.rows.length),
          limit,
          rows: snapshot.rows.slice(0, limit),
          served_from_cache: cached,
          max_staleness_sec: RANK_TTL_SEC,
        },
        { headers: CACHEABLE }
      )
    }

    if (categoryID) {
      const offset = Math.max(0, Number(searchParams.get('offset')) || 0)
      const limit = Math.min(
        MAX_LIMIT,
        Math.max(1, Number(searchParams.get('limit')) || DEFAULT_LIMIT)
      )
      const key = market === 'shop' ? shopKey(categoryID) : categoryID
      const { meta, rows } = await readCategoryRows(key, offset, limit)
      // Shop products carry their own per-product stats in the census already;
      // only the commission side needs the separate review feed grafted on.
      const withWindows =
        market === 'shop' ? rows : await attachReviewWindows(rows)
      return NextResponse.json(
        {
          ...(withReadme ? { _readme: readme('category') } : {}),
          market,
          categoryID,
          crawled: !!meta,
          storedCount: (meta && meta.count) || 0,
          finishedAt: (meta && meta.finishedAt) || null,
          offset,
          limit,
          returned: rows.length,
          // Absence of a next page is worth stating: a reader that only sees
          // `returned < limit` has to infer it, and inferring it wrongly means
          // either a missed page or an endless loop.
          hasMore: offset + rows.length < ((meta && meta.count) || 0),
          rows: withWindows,
        },
        { headers: CACHEABLE }
      )
    }

    let snapshot = await getExportSnapshot()
    let cached = true
    if (!snapshot) {
      cached = false
      snapshot = await buildSummary()
      try {
        await setExportSnapshot(snapshot, SNAPSHOT_TTL_SEC)
      } catch {
        // Failing to cache is not failing to answer; the next caller rebuilds.
      }
    }

    return NextResponse.json(
      {
        ...(withReadme ? { _readme: readme('summary') } : {}),
        ...snapshot,
        // `generated_at` is when the snapshot was BUILT, which may be minutes
        // before this request. Saying so avoids a reader mistaking it for "now".
        served_from_cache: cached,
        max_staleness_sec: SNAPSHOT_TTL_SEC,
      },
      { headers: CACHEABLE }
    )
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json(
      { error: `Export failed: ${message}` },
      { status: 502, headers: NO_STORE }
    )
  }
}
