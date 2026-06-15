// VGen public-data fetchers (server-side, unauthenticated, read-only)
// -------------------------------------------------------------------
// Both VGen discoverability endpoints are PUBLIC (verified: anonymous
// curl returns HTTP 200 with full data, no cookie required). So this
// runs on Vercel's servers with no session token at all.
//
// Read-only by design: only the GET feeds are called. The view-logging
// POST (status 201) is NEVER touched, so collection does not pollute
// view counts or raise account risk.
//
// Field slimming mirrors the in-tab collectors exactly so the snapshot
// rows are byte-compatible with the existing local viewer payload shape.

const TRENDING_URL =
  'https://api.vgen.co/discoverability/portfolio/showcases/feed/top'
const PROFILE_URL =
  'https://api.vgen.co/discoverability/portfolio/showcases/'

const TRENDING_QUERY = {
  showOnlyCommissions: 'false',
  showOnlyVerified: 'true',
}
const PROFILE_QUERY = {
  verifyAge: 'true',
  isDraftExcluded: 'true',
  matchTag: '',
  showOnlyCommissions: 'false',
  limit: '20',
}

const PAGE_SIZE = 20
const MAX_TRENDING = 1000 // top 1000 => 50 pages
const MAX_PER_USER = 20 // cap per profile per snapshot (1 page) to avoid noisy tail data
const TRENDING_BATCH = 5 // pages fetched concurrently per batch
const BATCH_GAP_MS = 250 // small pause between batches (politeness)

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

async function fetchJson(url) {
  const res = await fetch(url, {
    method: 'GET',
    headers: { accept: 'application/json' },
    cache: 'no-store',
  })
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`)
  return res.json()
}

// Keep only the fields relevant to the study (trending feed shape).
function slimTrending(item, rank, snapshotTs) {
  return {
    snapshot_ts: snapshotTs,
    rank,
    showcaseID: item.showcaseID,
    userID: item.userID,
    username: item.user && item.user.username,
    displayName: item.user && item.user.displayName,
    title: item.title,
    viewCount: item.viewCount,
    likeCount: item.likeCount,
    searchIndex: item.searchIndex,
    randomDiscoveryIndex: item.randomDiscoveryIndex,
    created: item.created,
    modified: item.modified || null,
    isFromVerifiedCommission: !!item.isFromVerifiedCommission,
    isBoosted: !!(item.boostConfig && item.boostConfig.isEnabled),
    role: item.userModeration && item.userModeration.role,
    serviceStatus: item.service && item.service.status,
    tagCount: Array.isArray(item.tags) ? item.tags.length : 0,
    containsMatureContent: !!item.containsMatureContent,
  }
}

// Profile portfolio shape (username/displayName live under userModeration).
function slimProfile(item, profileIndex, snapshotTs, label) {
  return {
    snapshot_ts: snapshotTs,
    watch_label: label,
    profileIndex,
    showcaseID: item.showcaseID,
    userID: item.userID,
    username: item.userModeration && item.userModeration.username,
    displayName: item.userModeration && item.userModeration.displayName,
    title: item.title,
    viewCount: item.viewCount,
    likeCount: item.likeCount,
    searchIndex: item.searchIndex,
    randomDiscoveryIndex: item.randomDiscoveryIndex,
    created: item.created,
    modified: item.modified || null,
    isFromVerifiedCommission: !!item.isFromVerifiedCommission,
    isBoosted: !!(item.boostConfig && item.boostConfig.isEnabled),
    isDraft: !!item.isDraft,
    isHiddenInRequestedTab: !!item.isHiddenInRequestedTab,
    role: item.userModeration && item.userModeration.role,
    tagCount: Array.isArray(item.tags) ? item.tags.length : 0,
    containsMatureContent: !!item.containsMatureContent,
  }
}

function trendingPageUrl(skip) {
  const p = new URLSearchParams({ skip: String(skip), ...TRENDING_QUERY })
  return `${TRENDING_URL}?${p.toString()}`
}

function profilePageUrl(userID, cursor) {
  const p = new URLSearchParams({ ...PROFILE_QUERY })
  if (cursor !== null && cursor !== undefined) p.set('cursor', String(cursor))
  return `${PROFILE_URL}${encodeURIComponent(userID)}?${p.toString()}`
}

/**
 * Collect the trending "top" feed (up to top 1000).
 * Pages are fetched in small concurrent batches to stay under the
 * serverless time budget; stops early once the API reports no more.
 * @param {string} snapshotTs ISO timestamp shared by every row
 * @returns {Promise<{ source: string, snapshot_ts: string, count: number, rows: object[] }>}
 */
export async function fetchTrending(snapshotTs) {
  const skips = []
  for (let s = 0; s < MAX_TRENDING; s += PAGE_SIZE) skips.push(s)

  const bySkip = new Map()
  let stop = false

  for (let i = 0; i < skips.length && !stop; i += TRENDING_BATCH) {
    const batch = skips.slice(i, i + TRENDING_BATCH)
    const results = await Promise.all(
      batch.map(async (skip) => {
        const data = await fetchJson(trendingPageUrl(skip))
        return { skip, data }
      })
    )
    for (const { skip, data } of results) {
      const items = (data && data.showcases) || []
      bySkip.set(skip, items)
      // If any page in this region reports no more results, stop launching
      // further batches (later skips would just be empty pages).
      if (!data || data.hasMore === false || items.length === 0) stop = true
    }
    if (!stop) await sleep(BATCH_GAP_MS)
  }

  // Reassemble in skip order so rank is the true global trending position.
  const rows = []
  let rank = 0
  for (const skip of skips) {
    const items = bySkip.get(skip)
    if (!items) continue
    for (const it of items) rows.push(slimTrending(it, rank++, snapshotTs))
  }

  return {
    source: 'vgen.trending.top',
    snapshot_ts: snapshotTs,
    count: rows.length,
    rows,
  }
}

async function fetchOneUser(entry, snapshotTs) {
  const rows = []
  const seen = new Set()
  let cursor
  let profileIndex = 0
  while (rows.length < MAX_PER_USER) {
    const data = await fetchJson(profilePageUrl(entry.userID, cursor))
    const items = (data && data.showcases) || []
    let added = 0
    for (const it of items) {
      // Guard against a wrong cursor param re-serving page 1 forever.
      if (seen.has(it.showcaseID)) continue
      seen.add(it.showcaseID)
      rows.push(slimProfile(it, profileIndex++, snapshotTs, entry.label))
      added++
    }
    const next = data && data.nextCursor
    if (next === null || next === undefined || items.length === 0 || added === 0)
      break
    cursor = next
  }
  return rows
}

/**
 * Collect the watchlist profiles' portfolios. Users are fetched in
 * parallel (each runs its own cursor loop); per-user errors are isolated
 * so one bad profile does not abort the whole snapshot.
 * @param {{ userID: string, label: string }[]} watchlist
 * @param {string} snapshotTs ISO timestamp shared by every row
 * @returns {Promise<{ source: string, snapshot_ts: string, watchlist: object[], count: number, rows: object[], errors: object[] }>}
 */
export async function fetchProfiles(watchlist, snapshotTs) {
  const settled = await Promise.allSettled(
    watchlist.map((entry) => fetchOneUser(entry, snapshotTs))
  )

  const rows = []
  const errors = []
  settled.forEach((result, i) => {
    if (result.status === 'fulfilled') {
      rows.push(...result.value)
    } else {
      errors.push({
        label: watchlist[i] && watchlist[i].label,
        userID: watchlist[i] && watchlist[i].userID,
        message: String(result.reason && result.reason.message),
      })
    }
  })

  return {
    source: 'vgen.profile.portfolio',
    snapshot_ts: snapshotTs,
    watchlist,
    count: rows.length,
    rows,
    errors,
  }
}
