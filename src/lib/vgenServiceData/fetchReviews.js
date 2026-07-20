// VGen service-review fetcher (server-side, unauthenticated, read-only)
// ---------------------------------------------------------------------
// The public reviews feed for a single service:
//   GET https://api.vgen.co/discoverability/reviews/service/<serviceID>?offset=N&limit=20
// Returns a bare JSON array, newest-first. Max limit is 20 (>=25 -> "Invalid
// request"); a page shorter than the limit (or []) means we reached the end.
//
// VGen fronts these endpoints with Cloudflare, which 403s requests lacking a
// browser-like User-Agent (a bare `accept` header gets the CF challenge page).
// So we always send a normal browser UA. The block is intermittent, so callers
// should isolate per-service failures (Promise.allSettled) rather than let one
// 403 abort a whole refresh.

const REVIEWS_URL = 'https://api.vgen.co/discoverability/reviews/service/'

const PAGE_SIZE = 20 // API hard cap
const MAX_PAGES = 50 // safety stop: up to 1000 reviews per service

const BROWSER_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'

function reviewsPageUrl(serviceID, offset) {
  const id = encodeURIComponent(serviceID)
  return `${REVIEWS_URL}${id}?offset=${offset}&limit=${PAGE_SIZE}`
}

async function fetchJson(url) {
  const res = await fetch(url, {
    method: 'GET',
    headers: {
      accept: 'application/json',
      'user-agent': BROWSER_UA,
    },
    cache: 'no-store',
  })
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`)
  return res.json()
}

// Keep only the fields the survey needs. reviewText and notables are dropped on
// purpose: VGen reviews are near-uniformly positive, so the free text carries
// little analytical signal and would bloat storage.
function slimReview(item) {
  return {
    reviewID: item.reviewID,
    serviceID: item.serviceID,
    artistUserID: item.artistUserID,
    clientUserID: item.clientUserID ?? null,
    clientUsername:
      (item.client && item.client.username) ||
      (item.reviewerDetails && item.reviewerDetails.displayName) ||
      null,
    commissionID: item.commissionID ?? null,
    created: item.created,
    rating: typeof item.rating === 'number' ? item.rating : null,
    isAnonymous: !!item.isAnonymous,
    isHidden: !!item.isHidden,
  }
}

/**
 * Fetch the full review history for one service (paginated, newest-first).
 * Dedupes by reviewID in case a new review shifts the offset window between
 * pages. Throws on any non-200 (Cloudflare 403 etc.) so the caller can isolate
 * it per service.
 * @param {string} serviceID
 * @returns {Promise<{ serviceID: string, artistUserID: string|null, count: number, reviews: object[] }>}
 */
export async function fetchServiceReviews(serviceID) {
  const reviews = []
  const seen = new Set()
  let artistUserID = null

  for (let page = 0; page < MAX_PAGES; page++) {
    const data = await fetchJson(reviewsPageUrl(serviceID, page * PAGE_SIZE))
    const items = Array.isArray(data) ? data : []
    for (const it of items) {
      if (!it || seen.has(it.reviewID)) continue
      seen.add(it.reviewID)
      if (!artistUserID && it.artistUserID) artistUserID = it.artistUserID
      reviews.push(slimReview(it))
    }
    // A short page means there is no next page.
    if (items.length < PAGE_SIZE) break
  }

  return { serviceID, artistUserID, count: reviews.length, reviews }
}

// The public reviews feed only carries the artist as a bare userID, so we
// resolve a human-readable name from the artist's public portfolio (the same
// discoverability endpoint the trending tool uses). username/displayName live
// under each showcase's `userModeration`.
const PROFILE_URL = 'https://api.vgen.co/discoverability/portfolio/showcases/'

/**
 * Best-effort artist display name from their public portfolio (first showcase).
 * Returns nulls if the artist has no public showcases. Throws on a non-200 like
 * the other fetchers so the caller can isolate/ignore it.
 * @param {string} userID
 * @returns {Promise<{ userID: string, username: string|null, displayName: string|null }>}
 */
export async function fetchArtistProfile(userID) {
  const id = encodeURIComponent(userID)
  const url = `${PROFILE_URL}${id}?verifyAge=true&isDraftExcluded=true&matchTag=&showOnlyCommissions=false&limit=1`
  const data = await fetchJson(url)
  const items = (data && data.showcases) || []
  const mod = items[0] && items[0].userModeration
  return {
    userID,
    username: (mod && mod.username) || null,
    displayName: (mod && mod.displayName) || null,
  }
}
