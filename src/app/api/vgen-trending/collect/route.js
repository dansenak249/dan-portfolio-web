// VGen collection endpoint (triggered hourly by GitHub Actions)
// -------------------------------------------------------------
// POST with `Authorization: Bearer <VGEN_COLLECT_SECRET>`. Runs one
// unauthenticated read-only snapshot of the trending feed + watchlist
// profiles and stores them in Upstash Redis. A short Redis lock prevents
// two runs from overlapping if a trigger fires while one is in progress.
//
// IT ALSO NUDGES THE SERVICE-DATA ROTATION. That rotation is driven by GitHub
// Actions, whose schedule drops most of its slots for this repo, while THIS
// endpoint is pinged on a reliable external cron. Spending the leftover request
// budget on a rotation tick gives the rotation a dependable floor without
// anyone having to configure a second external cron or copy the secret
// anywhere new — the server already holds it.
//
// The snapshot always comes first and is never put at risk: rotation runs after
// it, inside whatever time is left, and any failure is reported in the response
// rather than thrown.

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

// Wall clock from the start of the request at which we stop starting rotation
// work. External cron services commonly give up on a response after 30s and
// record the job as failed, so the whole handler aims to answer inside this.
const REQUEST_SOFT_LIMIT_MS = 25000
// Don't begin a tick without a reasonable chance of seeing it through. A tick
// that IS cut off is still harmless — see runRotationTicks — but waiting for
// one we know cannot finish just burns the budget.
const MIN_TICK_BUDGET_MS = 12000

/**
 * Spend whatever request budget is left on service-data rotation ticks.
 *
 * Each tick is a self-contained POST that persists its own progress, and the
 * rotation only advances its position on success. So abandoning the wait costs
 * at most a repeated slice: nothing is corrupted, and the next trigger picks up
 * from the same place. That is what makes it safe to bound this by the clock.
 *
 * Never throws: the trending snapshot is the job here, and the rotation is a
 * passenger.
 */
async function runRotationTicks(request, startedAt) {
  const base = new URL(request.url).origin
  const secret = process.env.VGEN_COLLECT_SECRET || ''
  const out = { ticks: 0, last: null, error: null }

  for (;;) {
    const remaining = REQUEST_SOFT_LIMIT_MS - (Date.now() - startedAt)
    if (remaining < MIN_TICK_BUDGET_MS) break
    try {
      const res = await fetch(base + '/api/vgen-service-data/rotate', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          authorization: 'Bearer ' + secret,
        },
        body: JSON.stringify({}),
        cache: 'no-store',
        signal: AbortSignal.timeout(remaining),
      })
      const json = await res.json().catch(() => null)
      if (!res.ok) {
        out.error = 'HTTP ' + res.status + (json && json.error ? ' - ' + json.error : '')
        break
      }
      // Nothing is ticked for auto refresh. Valid state, not a failure, and no
      // amount of retrying changes it.
      if (json && json.idle) {
        out.last = 'idle'
        break
      }
      out.ticks++
      out.last = json && json.ranCategory
        ? json.ranPhase + ' / ' + json.ranCategory
        : 'ok'
    } catch (error) {
      // A timeout here means the tick outlived our budget, not that it failed.
      out.error = error && error.name === 'TimeoutError'
        ? 'tick still running when the budget ran out'
        : String(error && error.message)
      break
    }
  }
  return out
}

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
  const startedAt = Date.now()
  // ?rotate=0 opts a trigger out, for when you want the snapshot alone.
  const wantRotation = request.nextUrl.searchParams.get('rotate') !== '0'

  let locked = false
  try {
    // Throttle: if a recent snapshot already exists, skip this trigger cheaply
    // (one Redis read). This is what makes firing multiple times an hour safe.
    if (!force) {
      const lastTs = await lastSnapshotId('trending')
      if (lastTs) {
        const ageMs = Date.now() - new Date(lastTs).getTime()
        if (ageMs < MIN_INTERVAL_MS) {
          // The cheap path, and the one with the most budget to spare: the
          // snapshot needed nothing, so nearly the whole request is free.
          const rotation = wantRotation
            ? await runRotationTicks(request, startedAt)
            : null
          return NextResponse.json(
            {
              ok: true,
              skipped: 'fresh snapshot exists',
              last_snapshot_ts: lastTs,
              age_min: Math.round(ageMs / 60000),
              rotation,
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
    // Snapshot is stored; the lock is released in `finally` either way. What is
    // left of the budget goes to the rotation.
    const rotation = wantRotation
      ? await runRotationTicks(request, startedAt)
      : null
    return NextResponse.json(
      { ...result, rotation },
      { headers: { 'Cache-Control': 'no-store' } }
    )
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
