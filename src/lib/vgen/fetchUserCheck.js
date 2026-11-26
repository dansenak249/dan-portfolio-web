// VGen account check (server-side, unauthenticated, read-only)
// -----------------------------------------------------------
// Pulls the PUBLIC footprint of one VGen account and turns it into a short list
// of risk signals, so checking a stranger who just messaged you takes one paste
// instead of reading raw JSON by hand.
//
//   GET https://api.vgen.co/user/<userID | username>
//       Profile, moderation state, payment onboarding, review stats. The
//       username form is case-insensitive. Unknown -> 404 with body {}.
//   GET https://api.vgen.co/discoverability/reviews/client/<userID>?offset=0&limit=20
//       Reviews ARTISTS left about this person as a client (wouldRecommend,
//       difficulties). Needs the UUID; a username gets 400. Max limit 20.
//   GET https://api.vgen.co/discoverability/reviews/artist/<userID>?offset=0&limit=20
//       Reviews CLIENTS left about this person as an artist, across all services.
//   GET https://api.vgen.co/discoverability/portfolio/showcases/<userID>?...&limit=1
//       Only used to learn whether a public portfolio exists at all.
//
// Cloudflare fronts api.vgen.co and 403s requests without a browser-like
// User-Agent, so one is always sent. The block is intermittent, so the three
// secondary feeds are isolated with allSettled: one 403 costs a section, not
// the whole check.
//
// Nothing here is a verdict. VGen exposes no "orders placed" counter, so the
// client track record is the number of artist reviews, which is a lower bound.

const API_BASE = 'https://api.vgen.co'
const REQUEST_TIMEOUT_MS = 15000
const REVIEW_PAGE_SIZE = 20 // API hard cap; 25 -> 400 "Invalid request"

const BROWSER_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'

const DAY_MS = 24 * 60 * 60 * 1000
const NEW_ACCOUNT_RED_DAYS = 14
const NEW_ACCOUNT_AMBER_DAYS = 90
const LOW_RATING_SHARE = 0.1 // share of 1-2 star artist reviews worth flagging
const LOW_POSITIVE_PERCENT = 80

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const USERNAME_RE = /^[A-Za-z0-9_.-]{1,64}$/

// First path segments on vgen.co that are site pages, not usernames.
const RESERVED_PATHS = new Set([
  'explore', 'search', 'commission', 'commissions', 'shop', 'messages', 'settings',
  'dashboard', 'login', 'signup', 'about', 'help', 'terms', 'privacy',
])

export class UserCheckError extends Error {
  constructor(message, status) {
    super(message)
    this.name = 'UserCheckError'
    this.status = status
  }
}

/**
 * Turn whatever the user pasted into a lookup key for /user/<key>.
 * Accepts a UUID, a username (with or without @), a vgen.co profile link, or
 * an api.vgen.co/user/<x> link. Returns null when nothing usable is found.
 * @param {string} raw
 * @returns {string|null}
 */
export function parseUserQuery(raw) {
  const text = String(raw || '').trim()
  if (!text) return null

  if (UUID_RE.test(text)) return text.toLowerCase()

  // Links are parsed by path rather than by grabbing any UUID in the text: a
  // service link carries a SERVICE id, which /user/ would wrongly 404 on.
  if (/vgen\.co/i.test(text)) {
    const withScheme = /^https?:\/\//i.test(text) ? text : `https://${text}`
    let url
    try {
      url = new URL(withScheme)
    } catch {
      return null
    }
    const parts = url.pathname.split('/').filter(Boolean)
    const userIdx = parts.indexOf('user')
    const candidate = userIdx >= 0 ? parts[userIdx + 1] : parts[0]
    if (!candidate || RESERVED_PATHS.has(candidate.toLowerCase())) return null
    const name = decodeURIComponent(candidate).replace(/^@/, '')
    if (UUID_RE.test(name)) return name.toLowerCase()
    return USERNAME_RE.test(name) ? name : null
  }

  const name = text.replace(/^@/, '')
  return USERNAME_RE.test(name) ? name : null
}

async function fetchJson(path) {
  const url = `${API_BASE}${path}`
  const res = await fetch(url, {
    method: 'GET',
    headers: { accept: 'application/json', 'user-agent': BROWSER_UA },
    cache: 'no-store',
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  })
  if (res.status === 404) throw new UserCheckError('No VGen account matches that ID or username.', 404)
  if (res.status === 403) {
    throw new UserCheckError('VGen (Cloudflare) blocked the request. This is intermittent -- try again in a moment.', 502)
  }
  if (!res.ok) throw new UserCheckError(`VGen returned HTTP ${res.status}.`, 502)
  return res.json()
}

function reviewsPath(kind, userID) {
  return `/discoverability/reviews/${kind}/${encodeURIComponent(userID)}?offset=0&limit=${REVIEW_PAGE_SIZE}`
}

function showcasesPath(userID) {
  return (
    `/discoverability/portfolio/showcases/${encodeURIComponent(userID)}` +
    '?verifyAge=true&isDraftExcluded=true&matchTag=&showOnlyCommissions=false&limit=1'
  )
}

function slimClientReview(item) {
  return {
    created: item.created || null,
    wouldRecommend: typeof item.wouldRecommend === 'boolean' ? item.wouldRecommend : null,
    difficulties: Array.isArray(item.difficulties) ? item.difficulties : [],
    notables: Array.isArray(item.notables) ? item.notables : [],
    reviewText: item.reviewText || '',
    artistUsername: (item.artist && item.artist.username) || null,
    serviceName: (item.service && item.service.serviceName) || null,
    isAnonymous: !!item.isAnonymous,
  }
}

function slimArtistReview(item) {
  return {
    created: item.created || null,
    rating: typeof item.rating === 'number' ? item.rating : null,
    notables: Array.isArray(item.notables) ? item.notables : [],
    reviewText: item.reviewText || '',
    serviceName: (item.service && item.service.serviceName) || null,
    clientUsername:
      (item.client && item.client.username) ||
      (item.reviewerDetails && item.reviewerDetails.displayName) ||
      null,
    isAnonymous: !!item.isAnonymous,
  }
}

function settledValue(result) {
  return result.status === 'fulfilled' ? result.value : null
}

function settledError(result) {
  if (result.status === 'fulfilled') return null
  return result.reason instanceof Error ? result.reason.message : 'Unknown error'
}

function summarizeUser(user, now) {
  const moderation = user.moderation || {}
  const prefs = user.publicPreferences || {}
  const createdMs = Date.parse(user.created)
  return {
    userID: user.userID || null,
    username: user.username || null,
    displayName: user.displayName || null,
    avatarURL: user.avatarURL || '',
    bio: user.bio || '',
    created: user.created || null,
    accountAgeDays: Number.isFinite(createdMs) ? Math.floor((now - createdMs) / DAY_MS) : null,
    role: moderation.role || null,
    roleTimestamps: moderation.roleTimestamps || {},
    accountType: moderation.accountType || null,
    hasRestriction: moderation.hasRestriction === true,
    discoveryStatus: moderation.discoveryStatus || null,
    servicesStatus: user.servicesStatus || null,
    hasCompletedProfileOnboarding: user.hasCompletedProfileOnboarding === true,
    hasCompletedPayPalOnboarding: user.hasCompletedPayPalOnboarding === true,
    hasCompletedPayoutOnboarding: user.hasCompletedPayoutOnboarding === true,
    stripePayoutsEnabled: prefs.stripePayoutsEnabled === true,
    hasPaypalMerchantID: !!user.paypalMerchantID,
    defaultCurrency: user.defaultCurrency || null,
    utcOffsetMinutes: typeof user.utcOffset === 'number' ? user.utcOffset : null,
    languages: Array.isArray(user.languages) ? user.languages.map((l) => l && l.language).filter(Boolean) : [],
    socials: Array.isArray(user.socials) ? user.socials : [],
    badges: Object.keys(user.badges || {}).filter((k) => user.badges[k]),
    clientReviewStats: user.clientReviewStats || null,
    artistReviewStats: user.artistReviewStats || null,
    shopReviewStats: user.shopReviewStats || null,
  }
}

function flag(level, code, title, detail) {
  return { level, code, title, detail }
}

function ageFlags(summary) {
  const days = summary.accountAgeDays
  if (days === null) return [flag('amber', 'age-unknown', 'Account age unknown', 'VGen did not return a creation date.')]
  if (days < NEW_ACCOUNT_RED_DAYS) {
    return [flag('red', 'age-new', `Brand-new account (${days} days old)`, 'Most scam accounts are created shortly before they reach out.')]
  }
  if (days < NEW_ACCOUNT_AMBER_DAYS) {
    return [flag('amber', 'age-young', `Young account (${days} days old)`, 'Not suspicious by itself, but weigh it with the rest.')]
  }
  return [flag('green', 'age-ok', `Account is ${days} days old`, `Created ${summary.created.slice(0, 10)}.`)]
}

function clientFlags(summary, clientReviews) {
  const stats = summary.clientReviewStats || {}
  const total = stats.totalReviews || 0
  const negative = stats.totalNegativeReviews || 0
  const out = []

  // An established artist who never buys is normal; only a person with NO
  // reviewed history on either side is worth an amber.
  const artistTotal = (summary.artistReviewStats && summary.artistReviewStats.totalReviews) || 0
  if (total === 0 && artistTotal > 0) {
    out.push(flag('info', 'client-no-history', 'Has never been reviewed as a Client',
      'Normal for an artist who does not buy commissions; their track record is on the artist side.'))
  } else if (total === 0) {
    out.push(flag('amber', 'client-no-history', 'No Client track record',
      'No artist has reviewed this person as a client yet. Every real client starts here, so pair it with account age.'))
  } else if (negative > 0) {
    const pct = typeof stats.percentagePositive === 'number' ? stats.percentagePositive : null
    const level = pct !== null && pct < LOW_POSITIVE_PERCENT ? 'red' : 'amber'
    out.push(flag(level, 'client-negative', `${negative} negative Client review${negative > 1 ? 's' : ''} out of ${total}`,
      'Artists marked a past commission with this client as one they would not recommend.'))
  } else {
    out.push(flag('green', 'client-clean', `${total} Client review${total > 1 ? 's' : ''}, all positive`,
      'Lower bound on completed orders: artists do not review every client.'))
  }

  const notRecommended = (clientReviews || []).filter((r) => r.wouldRecommend === false)
  if (notRecommended.length > 0) {
    const tags = [...new Set(notRecommended.flatMap((r) => r.difficulties))]
    const many = notRecommended.length > 1
    out.push(flag('red', 'client-not-recommended', `${notRecommended.length} recent review${many ? 's say' : ' says'} "would not recommend"`,
      tags.length ? `Difficulties reported: ${tags.join(', ')}.` : 'See the client reviews below.'))
  }
  return out
}

function isSelling(summary) {
  const artistTotal = (summary.artistReviewStats && summary.artistReviewStats.totalReviews) || 0
  return summary.servicesStatus === 'OPEN' || artistTotal > 0 || (summary.role && summary.role !== 'CLIENT')
}

function artistFlags(summary, hasPortfolio) {
  if (!isSelling(summary)) return []
  const out = []
  const canTakePayment =
    summary.hasCompletedPayPalOnboarding || summary.hasCompletedPayoutOnboarding || summary.stripePayoutsEnabled

  // Red for any artist-side account, not only one with services OPEN: an
  // artist account that never connected a way to get paid has no legitimate
  // reason to be taking commissions, whatever its services toggle says.
  if (!canTakePayment) {
    out.push(flag('red', 'artist-no-payment', 'Artist account with no VGen payment method',
      'Neither PayPal nor payout (Stripe/Wise) onboarding is done, so this account cannot be paid through VGen. Any request to pay via PayPal friends, crypto, gift cards or a link outside VGen is a scam pattern.'))
  }

  const stats = summary.artistReviewStats || {}
  const total = stats.totalReviews || 0
  const low = (stats.total1StarReviews || 0) + (stats.total2StarReviews || 0)
  if (total > 0 && low / total >= LOW_RATING_SHARE) {
    out.push(flag('amber', 'artist-low-ratings', `${low} of ${total} Artist reviews are 1-2 stars`, `Average rating ${stats.averageRating}.`))
  } else if (total > 0) {
    out.push(flag('green', 'artist-reviews', `${total} Artist review${total > 1 ? 's' : ''}`, 'Reviews come from completed VGen commissions.'))
  }

  if (summary.servicesStatus === 'OPEN' && hasPortfolio === false) {
    out.push(flag('amber', 'artist-no-portfolio', 'Selling with an empty public portfolio',
      'Real artists almost always show work. Reverse-image-search anything they send you.'))
  }
  return out
}

function profileFlags(summary) {
  const out = []
  if (summary.hasRestriction) {
    out.push(flag('red', 'restricted', 'VGen has restricted this account', 'moderation.hasRestriction is true.'))
  }
  const bare = !summary.avatarURL && !summary.bio && summary.socials.length === 0
  if (bare) {
    out.push(flag('info', 'profile-bare', 'Bare profile', 'No avatar, no bio, no social links.'))
  }
  return out
}

const LEVEL_RANK = { red: 3, amber: 2, info: 1, green: 0 }

function verdictFor(flags) {
  const worst = flags.reduce((max, f) => Math.max(max, LEVEL_RANK[f.level] || 0), 0)
  if (worst === LEVEL_RANK.red) return { level: 'red', label: 'High-risk signals found' }
  if (worst === LEVEL_RANK.amber) return { level: 'amber', label: 'Proceed with care' }
  return { level: 'green', label: 'No red flags in public data' }
}

/**
 * Pure scoring step, split out so it can be exercised without the network.
 * @param {object} user raw /user/<id> payload
 * @param {{ clientReviews?: object[]|null, artistReviews?: object[]|null, hasPortfolio?: boolean|null, now?: number }} extra
 */
export function assessUser(user, extra = {}) {
  const now = extra.now ?? Date.now()
  const summary = summarizeUser(user, now)
  // Fixed reading order (age -> Client -> Artist -> profile) rather than a
  // severity sort, so the overview always reads the same way; the verdict
  // banner already carries the worst level.
  const flags = [
    ...ageFlags(summary),
    ...clientFlags(summary, extra.clientReviews),
    ...artistFlags(summary, extra.hasPortfolio ?? null),
    ...profileFlags(summary),
  ]
  return { summary, flags, verdict: verdictFor(flags) }
}

/**
 * Full check: resolve the account, pull the three secondary feeds in parallel,
 * and score. Throws UserCheckError (with an HTTP-ish status) when the account
 * itself cannot be read; secondary-feed failures are reported in `errors`.
 * @param {string} key UUID or username, already passed through parseUserQuery
 */
export async function checkVgenUser(key) {
  const user = await fetchJson(`/user/${encodeURIComponent(key)}`)
  if (!user || !user.userID) throw new UserCheckError('No VGen account matches that ID or username.', 404)

  const [clientRes, artistRes, showcaseRes] = await Promise.allSettled([
    fetchJson(reviewsPath('client', user.userID)),
    fetchJson(reviewsPath('artist', user.userID)),
    fetchJson(showcasesPath(user.userID)),
  ])

  const clientRaw = settledValue(clientRes)
  const artistRaw = settledValue(artistRes)
  const showcaseRaw = settledValue(showcaseRes)

  const clientReviews = Array.isArray(clientRaw) ? clientRaw.map(slimClientReview) : null
  const artistReviews = Array.isArray(artistRaw) ? artistRaw.map(slimArtistReview) : null
  const hasPortfolio = showcaseRaw ? Array.isArray(showcaseRaw.showcases) && showcaseRaw.showcases.length > 0 : null

  const { summary, flags, verdict } = assessUser(user, { clientReviews, artistReviews, hasPortfolio })

  // Colour palettes are decorative noise in the raw dump.
  const { avatarColourPalette, bannerColourPalette, ...raw } = user

  return {
    fetchedAt: new Date().toISOString(),
    verdict,
    flags,
    summary,
    hasPortfolio,
    clientReviews,
    artistReviews,
    errors: {
      clientReviews: settledError(clientRes),
      artistReviews: settledError(artistRes),
      portfolio: settledError(showcaseRes),
    },
    raw,
  }
}
