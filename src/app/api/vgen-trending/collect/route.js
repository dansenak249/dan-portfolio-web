// VGen collection endpoint (triggered hourly by GitHub Actions)
// -------------------------------------------------------------
// POST with `Authorization: Bearer <VGEN_COLLECT_SECRET>`. Runs one
// unauthenticated read-only snapshot of the trending feed + watchlist
// profiles and stores them in Upstash Redis. A short Redis lock prevents
// two runs from overlapping if a trigger fires while one is in progress.

import { NextResponse } from 'next/server'
import { timingSafeEqual } from 'crypto'
import {
  fetchTrending,
  fetchProfiles,
  thresholdRecord,
} from '@/lib/vgen/fetchVgen'
import {
  acquireLock,
  releaseLock,
  getWatchlist,
  appendSnapshot,
  appendThreshold,
  lastSnapshotId,
} from '@/lib/vgen/store'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60 // trending = up to 50 paged fetches

// Self-throttle window. We deliberately fire this endpoint SEVERAL times an hour
// (the GitHub Actions cron is best-effort and frequently drops the top-of-hour
// slot), but only actually collect when the newest snapshot is older than this.
// So redundant triggers are cheap no-ops and we still get ~1 snapshot/hour, with
// any missed slot covered by the next trigger. Pass ?force=1 to bypass (manual
// runs / testing). 45 min < 60 min cadence so a slightly late run still collects.
const MIN_INTERVAL_MS = 45 * 60 * 1000

function isAuthorized(request) {
  const secret = process.env.VGEN_COLLECT_SECRET
  if (!secret) return false
  const header = request.headers.get('authorization') || ''
  const token = header.startsWith('Bearer ') ? header.slice(7) : header
  const a = Buffer.from(token)
  const b = Buffer.from(secret)
  // timingSafeEqual requires equal-length buffers.
  if (a.length !== b.length) return false
  return timingSafeEqual(a, b)
}

async function runCollection() {
  const snapshotTs = new Date().toISOString()
  const watchlist = await getWatchlist()

  const [trending, profiles] = await Promise.all([
    fetchTrending(snapshotTs),
    fetchProfiles(watchlist, snapshotTs),
  ])

  const [trendingKept, profilesKept, thresholdKept] = await Promise.all([
    appendSnapshot('trending', snapshotTs, trending.rows),
    appendSnapshot('profiles', snapshotTs, profiles.rows),
    appendThreshold(thresholdRecord(trending.rows, snapshotTs)),
  ])

  return {
    ok: true,
    snapshot_ts: snapshotTs,
    trending: { count: trending.count, snapshotsKept: trendingKept.kept },
    profiles: {
      count: profiles.count,
      users: watchlist.length,
      errors: profiles.errors,
      snapshotsKept: profilesKept.kept,
    },
    threshold: { kept: thresholdKept.kept },
  }
}

export async function POST(request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const force = request.nextUrl.searchParams.get('force') === '1'

  let locked = false
  try {
    // Throttle: if a recent snapshot already exists, skip this trigger cheaply
    // (one Redis read). This is what makes firing multiple times an hour safe.
    if (!force) {
      const lastTs = await lastSnapshotId('trending')
      if (lastTs) {
        const ageMs = Date.now() - new Date(lastTs).getTime()
        if (ageMs < MIN_INTERVAL_MS) {
          return NextResponse.json(
            {
              ok: true,
              skipped: 'fresh snapshot exists',
              last_snapshot_ts: lastTs,
              age_min: Math.round(ageMs / 60000),
            },
            { headers: { 'Cache-Control': 'no-store' } }
          )
        }
      }
    }

    locked = await acquireLock()
    if (!locked) {
      return NextResponse.json(
        { ok: false, skipped: 'another run is in progress' },
        { status: 409 }
      )
    }

    const result = await runCollection()
    return NextResponse.json(result, {
      headers: { 'Cache-Control': 'no-store' },
    })
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Unknown collection error'
    return NextResponse.json(
      { ok: false, error: message },
      { status: 500 }
    )
  } finally {
    if (locked) {
      try {
        await releaseLock()
      } catch {
        // Lock auto-expires via TTL; a failed release is non-fatal.
      }
    }
  }
}
