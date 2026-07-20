// VGen service-data analysis (pure, no I/O)
// -----------------------------------------
// Turns a service's raw review list into the competitor-analysis metrics the
// dashboard renders. The guiding question: where are VGen clients flowing —
// which services/artists capture steady, repeat monthly business?
//
// Review model reminders:
//   - Reviews are a proxy for COMPLETED commissions (one review per commission).
//   - Anonymous reviews (isAnonymous) count toward total VOLUME but carry no
//     usable clientUserID, so they are excluded from unique/repeat-client math.
//   - `created` is the review timestamp (ISO); it drives the monthly time series.

const DAY_MS = 24 * 60 * 60 * 1000

// A named review is one we can attribute to a specific client. Anonymous ones
// still count as volume but cannot participate in unique/repeat analysis.
function isNamed(review) {
  return !review.isAnonymous && !!review.clientUserID
}

function monthKey(iso) {
  // "2026-07-19T..." -> "2026-07". Cheap and locale-independent.
  return typeof iso === 'string' && iso.length >= 7 ? iso.slice(0, 7) : null
}

// Enumerate every "YYYY-MM" from first..last inclusive so the monthly series has
// no gaps (a quiet month shows 0, which matters for the "steady?" read).
function monthRange(firstIso, lastIso) {
  const months = []
  const start = new Date(`${firstIso.slice(0, 7)}-01T00:00:00Z`)
  const end = new Date(`${lastIso.slice(0, 7)}-01T00:00:00Z`)
  const cur = new Date(start)
  while (cur <= end) {
    const y = cur.getUTCFullYear()
    const m = String(cur.getUTCMonth() + 1).padStart(2, '0')
    months.push(`${y}-${m}`)
    cur.setUTCMonth(cur.getUTCMonth() + 1)
  }
  return months
}

function safeRatingAvg(reviews) {
  const rated = reviews.filter((r) => typeof r.rating === 'number')
  if (!rated.length) return null
  const sum = rated.reduce((acc, r) => acc + r.rating, 0)
  return Math.round((sum / rated.length) * 100) / 100
}

/**
 * Analyze one service's reviews into a metrics record.
 * @param {object} args
 * @param {string} args.serviceID
 * @param {string} args.serviceType free-text label (animation/bg/...)
 * @param {string|null} args.artistUserID
 * @param {object[]} args.reviews slim review rows (newest-first from fetch)
 * @param {number} [args.now] epoch ms for velocity windows (defaults Date.now)
 * @returns {object} service metrics
 */
export function analyzeService({
  serviceID,
  serviceType,
  artistUserID,
  reviews,
  now = Date.now(),
}) {
  const list = Array.isArray(reviews) ? reviews : []
  const total = list.length
  const named = list.filter(isNamed)
  const anonymous = total - named.length

  // Unique + repeat clients (named only).
  const byClient = new Map()
  for (const r of named) {
    const arr = byClient.get(r.clientUserID)
    if (arr) arr.push(r)
    else byClient.set(r.clientUserID, [r])
  }
  const uniqueClients = byClient.size
  let repeatClients = 0
  let repeatReviews = 0 // reviews beyond each client's first (return business)
  const topClients = []
  for (const [clientUserID, rs] of byClient) {
    if (rs.length > 1) {
      repeatClients++
      repeatReviews += rs.length - 1
    }
    topClients.push({
      clientUserID,
      clientUsername: rs[0].clientUsername || null,
      count: rs.length,
    })
  }
  topClients.sort((a, b) => b.count - a.count)

  // Time span + monthly series (uses all reviews with a valid created date).
  const dated = list
    .map((r) => r.created)
    .filter((c) => typeof c === 'string' && c.length >= 7)
    .sort()
  const firstReview = dated[0] || null
  const lastReview = dated[dated.length - 1] || null

  const monthly = []
  if (firstReview && lastReview) {
    const counts = new Map()
    for (const c of dated) {
      const k = monthKey(c)
      if (k) counts.set(k, (counts.get(k) || 0) + 1)
    }
    for (const m of monthRange(firstReview, lastReview)) {
      monthly.push({ month: m, count: counts.get(m) || 0 })
    }
  }

  // Velocity: completed commissions in trailing windows.
  const last30 = list.filter(
    (r) => r.created && now - Date.parse(r.created) <= 30 * DAY_MS
  ).length
  const last90 = list.filter(
    (r) => r.created && now - Date.parse(r.created) <= 90 * DAY_MS
  ).length

  // "Steady" read: share of months in the span that had at least one review.
  const activeMonths = monthly.filter((m) => m.count > 0).length
  const spanMonths = monthly.length
  const activeMonthRate = spanMonths
    ? Math.round((activeMonths / spanMonths) * 100) / 100
    : null

  // Concentration: how much of the NAMED volume is return business.
  const repeatRate = named.length
    ? Math.round((repeatReviews / named.length) * 100) / 100
    : null

  return {
    serviceID,
    serviceType: serviceType || '',
    artistUserID: artistUserID ?? null,
    total,
    named: named.length,
    anonymous,
    uniqueClients,
    repeatClients,
    repeatReviews,
    repeatRate,
    avgRating: safeRatingAvg(list),
    firstReview,
    lastReview,
    spanMonths,
    activeMonths,
    activeMonthRate,
    last30,
    last90,
    monthly,
    topClients: topClients.slice(0, 10),
  }
}

/**
 * Roll several services up by artist so we can see which ARTIST (not just which
 * listing) captures steady clients across all of their tracked services.
 * Repeat-client detection here is cross-service: a client counts as "repeat" for
 * an artist if they appear in >1 of that artist's reviews, even across services.
 * @param {object[]} serviceMetrics output of analyzeService per service
 * @param {Object<string, object[]>} reviewsByService raw reviews keyed by serviceID
 * @returns {object[]} per-artist rollups
 */
export function aggregateByArtist(serviceMetrics, reviewsByService) {
  const artists = new Map()

  for (const sm of serviceMetrics) {
    const key = sm.artistUserID || `unknown:${sm.serviceID}`
    let a = artists.get(key)
    if (!a) {
      a = {
        artistUserID: sm.artistUserID ?? null,
        serviceIDs: [],
        serviceTypes: new Set(),
        total: 0,
        anonymous: 0,
        last30: 0,
        last90: 0,
        _clientCounts: new Map(), // clientUserID -> count across services
        _clientNames: new Map(),
      }
      artists.set(key, a)
    }
    a.serviceIDs.push(sm.serviceID)
    if (sm.serviceType) a.serviceTypes.add(sm.serviceType)
    a.total += sm.total
    a.anonymous += sm.anonymous
    a.last30 += sm.last30
    a.last90 += sm.last90

    const raw = reviewsByService[sm.serviceID] || []
    for (const r of raw) {
      if (r.isAnonymous || !r.clientUserID) continue
      a._clientCounts.set(
        r.clientUserID,
        (a._clientCounts.get(r.clientUserID) || 0) + 1
      )
      if (r.clientUsername && !a._clientNames.has(r.clientUserID)) {
        a._clientNames.set(r.clientUserID, r.clientUsername)
      }
    }
  }

  const out = []
  for (const a of artists.values()) {
    let uniqueClients = 0
    let repeatClients = 0
    let repeatReviews = 0
    let namedTotal = 0
    const topClients = []
    for (const [clientUserID, count] of a._clientCounts) {
      uniqueClients++
      namedTotal += count
      if (count > 1) {
        repeatClients++
        repeatReviews += count - 1
      }
      topClients.push({
        clientUserID,
        clientUsername: a._clientNames.get(clientUserID) || null,
        count,
      })
    }
    topClients.sort((x, y) => y.count - x.count)

    out.push({
      artistUserID: a.artistUserID,
      serviceIDs: a.serviceIDs,
      serviceTypes: [...a.serviceTypes],
      serviceCount: a.serviceIDs.length,
      total: a.total,
      anonymous: a.anonymous,
      uniqueClients,
      repeatClients,
      repeatReviews,
      repeatRate: namedTotal
        ? Math.round((repeatReviews / namedTotal) * 100) / 100
        : null,
      last30: a.last30,
      last90: a.last90,
      topClients: topClients.slice(0, 10),
    })
  }

  out.sort((a, b) => b.total - a.total)
  return out
}
