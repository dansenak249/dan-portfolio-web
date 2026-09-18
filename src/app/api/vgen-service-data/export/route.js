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
        'One row per listing stored for this category. The crawl keeps the ' +
        'busiest listings it found, NOT every listing that exists -- so treat ' +
        'this as a sample of the top of the category, not a complete index.',
      commission_fields: {
        serviceID: 'VGen id for the listing.',
        userID: 'VGen id for the artist.',
        serviceName: 'Listing title, verbatim.',
        type: 'VGen service type string.',
        basePrice: 'Starting price in `currency` (minor units are NOT used; this is a plain number).',
        currency: 'ISO currency code the artist prices in.',
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
          'published", never "zero".',
        username: 'Artist handle.',
        displayName: 'Artist display name.',
        tags: 'The artist\'s own search keywords, verbatim. VGen caps these at 5.',
      },
      shop_fields: {
        productID: 'VGen id for the product.',
        productName: 'Product title, verbatim.',
        salesCount: 'Real order count for THIS product, present on every listing.',
        paidSalesCount: 'Of those, the paid ones.',
        freeSalesCount: 'Of those, the free ones.',
        isNumberOfSalesPublic:
          'Whether the seller displays that count. The count is returned either ' +
          'way; this says whether quoting it publicly is fair.',
        reviewCount: 'Reviews for THIS product (unlike the commission side).',
        avgRating: 'Average rating for this product.',
        stars: 'Counts per star, as [1-star, 2-star, 3-star, 4-star, 5-star].',
        linkedServiceID:
          'The commission service this product came from, when there is one ' +
          '(about 74% carry one). The only join between the two marketplaces.',
        tags: 'Seller keywords, verbatim. Shop allows up to 20.',
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
      'Only the busiest listings per category are stored, so totals are not ' +
        'market-wide totals.',
      'A commission listing carries ARTIST-level review stats, not per-listing ' +
        'ones. A shop product carries per-product ones. Do not compare the two ' +
        'columns as if they measured the same thing.',
      'null means "VGen did not publish this", which is different from zero.',
    ],
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
          rows,
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
