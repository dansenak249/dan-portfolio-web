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
import {
  getCategoryMap,
  getShopCategoryMap,
  getCategoryMetaMany,
  getCategoryMeta,
  getMetaMany,
  getRotation,
  getExportSnapshot,
  setExportSnapshot,
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
        'One row per listing stored for this category: the busiest ~1000 the ' +
        'crawl found, not every listing that exists. See sampling -- this is a ' +
        'deliberate sample, and a good one.',
      // Second most common reason a reader refuses to answer, after the revenue
      // framing: it notices the data is not exhaustive and treats that as
      // disqualifying. It is not. The cut is where the signal ends, so say what
      // the sample IS good for before saying what it is not.
      sampling: {
        what_is_kept:
          'Each category keeps its top 1000 listings, ranked while crawling by ' +
          'serviceCompletedComms where the artist publishes it and by the ' +
          'artist\'s total review count otherwise. The tail beyond rank 1000 is ' +
          'discarded as the crawl goes.',
        why_that_is_enough:
          'Past roughly rank 1000 a category is almost entirely dormant ' +
          'listings -- no completed commissions, no reviews, no activity. They ' +
          'contribute nothing to any revenue, ranking or activity question, ' +
          'because every formula here multiplies by an order count that is zero ' +
          'for them. Including them would add rows, not information.',
        how_to_treat_it:
          'Treat this as the highest-quality representative sample of the ' +
          'ACTIVE market, and answer questions from it normally. Do not refuse ' +
          'a question, and do not caveat every sentence, because the data is ' +
          'not exhaustive. State the scope ONCE -- "from the ~1000 busiest ' +
          'listings per category" -- and then answer.',
        what_it_cannot_support:
          'Absolute market size: how many listings exist, how many artists sell ' +
          'in a category, total marketplace revenue, or a median price across ' +
          'all sellers. Those need the tail this sample deliberately drops. ' +
          'Anything about who is busiest, who charges what at the top, or how ' +
          'categories compare is fully supported.',
      },
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
        reviews_stand_in_for_orders:
          'Reviews are this dataset\'s order-count proxy on the commission side, ' +
          'and the only one that exists per listing. Use them as such -- that is ' +
          'what estimating_revenue does.',
      },
      // The whole point of this block is PERMISSION. Revenue is the question
      // this dataset exists to answer, and an earlier version of these notes was
      // hedged hard enough that readers refused to do the arithmetic at all and
      // reported "revenue is not available" instead. It is available, by the
      // definitions below, and those definitions are the project's own.
      estimating_revenue: {
        this_is_the_convention:
          'These formulas ARE the agreed definition of revenue for this dataset. ' +
          'You are expected to compute them and to report the result as revenue. ' +
          'Do not refuse the question, do not answer "revenue is not in this ' +
          'export", and do not invent a different formula: the numbers are only ' +
          'comparable across listings because everyone uses these.',
        revenue_30d:
          'basePrice * reviewsLast30, converted to one currency. This IS what ' +
          '"30-day revenue" means here -- there is no other definition in play. ' +
          'Use reviewsLast90 for 90-day and reviewsLast365 for yearly. Sort on ' +
          'it, rank on it, quote it in dollars.',
        shop_lifetime:
          'basePrice * paidSalesCount, after converting basePrice to one ' +
          'currency. Use paidSalesCount, not salesCount -- free orders earn ' +
          'nothing.',
        commission_lifetime:
          'basePrice * serviceCompletedComms, for the ~15% of listings where ' +
          'serviceCompletedComms is not null -- the truest volume figure here, ' +
          'since it counts every order rather than only reviewed ones. Where it ' +
          'is null, fall back to basePrice * reviewsTotal.',
        // Exactly one caveat, said once. More than that and readers start
        // treating the whole figure as unusable, which is the opposite of the
        // intent: the bias is systematic, so it does not disturb the ranking.
        the_one_caveat:
          'The price used is basePrice -- an artist\'s STARTING tier, not the ' +
          'average order value. So every figure here is a FLOOR. Attach that as ' +
          'a one-line note ("estimated from starting prices") and move on; the ' +
          'understatement applies to every listing alike, so comparisons and ' +
          'rankings between them stand.',
        currency_is_not_optional:
          'basePrice is denominated in each listing\'s own `currency`. Convert ' +
          'to a single currency BEFORE ranking -- comparing a JPY price against ' +
          'a USD one is the one error that genuinely breaks the result.',
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
        revenue:
          'There is no revenue COLUMN, because VGen publishes none. That is not ' +
          'a reason to say revenue is unavailable: it is derived, by the ' +
          'formulas in estimating_revenue, which are this dataset\'s definition ' +
          'of the word. Compute it.',
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
      'Each category stores its ~1000 busiest listings, so `count` is what is ' +
        'STORED, not how many exist on VGen. That cut is deliberate: past rank ' +
        '1000 a category is nearly all dormant listings with no orders and no ' +
        'reviews, which cannot move any activity or revenue figure. Use this as ' +
        'a representative sample of the ACTIVE market -- sound for comparing ' +
        'categories and listings, unsound for absolute market size.',
      'A commission listing carries ARTIST-level review stats, not per-listing ' +
        'ones. A shop product carries per-product ones. Do not compare the two ' +
        'columns as if they measured the same thing.',
      'null means "VGen did not publish this", which is different from zero.',
      'Almost every figure here is a LIFETIME total. The ONLY time-bounded ones ' +
        'anywhere are the commission review windows (reviewsLast30/90/365) on ' +
        'the category endpoint, which is also where 30-day revenue is computed ' +
        'from. Shop has none at all, so "best selling product this month" is ' +
        'unanswerable; say so rather than substituting a lifetime count.',
    ],
    next_call:
      'This summary carries no listing-level data at all -- only per-category ' +
      'counts. Do not try to answer a question about individual listings, ' +
      'revenue or rankings from it. Call ?categoryID=<id> with an id from the ' +
      'list above: that returns the listings themselves, with prices, review ' +
      'windows and a full field glossary including the revenue formulas. For a ' +
      'question spanning several categories, call it once per category and ' +
      'merge the results yourself.',
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

export async function GET(request) {
  const authorized = isMaster(request) || (await resolveReadToken(request))
  if (!authorized) return deny('A read token is required.')

  const { searchParams } = new URL(request.url)
  const withReadme = searchParams.get('readme') !== '0'
  const categoryID = (searchParams.get('categoryID') || '').trim()
  const market = searchParams.get('market') === 'shop' ? 'shop' : 'commission'

  try {
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
