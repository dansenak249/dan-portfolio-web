// Orphan sweep for the census keyspace (DESTRUCTIVE, both marketplaces)
// ----------------------------------------------------------------------
// GET  -> dry run, first pass: what WOULD go, per key family, plus a sample
// POST -> the driver. Body: { confirm?, cursors?, budgetMs? }
//         confirm defaults to FALSE, so a POST without it is still a dry run.
//
// Both require `Authorization: Bearer <VGEN_ADMIN_SECRET>` - the same secret as
// purge-legacy and the trending watchlist. With it unset the route refuses
// everything, because failing closed is the right default for a delete.
//
// WHY THIS EXISTS: the census keeps a category's best CENSUS_KEEP rows and one
// number for how many it walked, and that is the whole design. But reviews are
// keyed by SERVICE, not by category, and nothing has ever deleted them - not
// purgeCategory, not a re-crawl that drops a service out of the top, not
// removing a category from the map. Those payloads stay in Redis with no path
// back to them. Same for vgsd:cat:* keys of a category no longer on the map.
//
// It is resumable: one call works to a wall-clock budget and returns `cursors`
// plus `done`. Feed the cursors back to continue. Deleting is idempotent, so a
// sweep interrupted halfway is safe to simply run again.
//
// Run the GET first. It is the only chance to see what is about to go.

import { timingSafeEqual } from 'node:crypto'
import { NextResponse } from 'next/server'
import { sweepOrphans } from '@/lib/vgenServiceData/store'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 0
export const maxDuration = 60

const NO_STORE = { 'Cache-Control': 'no-store' }
// Leaves headroom inside maxDuration for the reachability pass, which reads
// every chunk of every live category before a single key is scanned.
const DEFAULT_BUDGET_MS = 30000

function isAuthorized(request) {
  const secret = process.env.VGEN_ADMIN_SECRET
  if (!secret) return false
  const header = request.headers.get('authorization') || ''
  const token = header.startsWith('Bearer ') ? header.slice(7) : header
  const a = Buffer.from(token)
  const b = Buffer.from(secret)
  // timingSafeEqual requires equal-length buffers.
  if (a.length !== b.length) return false
  return timingSafeEqual(a, b)
}

function unauthorized() {
  return NextResponse.json(
    { error: 'Unauthorized: send Authorization: Bearer <VGEN_ADMIN_SECRET>' },
    { status: 401, headers: NO_STORE }
  )
}

async function run(request, { confirm, cursors, budgetMs }) {
  if (!isAuthorized(request)) return unauthorized()
  try {
    const started = Date.now()
    const result = await sweepOrphans({ confirm, cursors, budgetMs })
    // A held fetch lease is a 'come back later', not a failure: the sweep
    // stands down so it cannot race a crawl that is publishing its chunks.
    if (result.busy) {
      return NextResponse.json(result, { status: 409, headers: NO_STORE })
    }
    return NextResponse.json(
      { ...result, elapsedMs: Date.now() - started },
      { headers: NO_STORE }
    )
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json(
      { ok: false, error: `Orphan sweep failed: ${message}` },
      { status: 500, headers: NO_STORE }
    )
  }
}

export async function GET(request) {
  return run(request, { confirm: false, budgetMs: DEFAULT_BUDGET_MS })
}

export async function POST(request) {
  const body = await request.json().catch(() => ({}))
  const budgetMs = Number.isFinite(body && body.budgetMs)
    ? Math.max(5000, Math.min(45000, body.budgetMs))
    : DEFAULT_BUDGET_MS
  return run(request, {
    // Only the literal true deletes. A truthy string from a hand-written curl
    // should not be the difference between a report and a purge.
    confirm: body && body.confirm === true,
    cursors: body && typeof body.cursors === 'object' ? body.cursors : undefined,
    budgetMs,
  })
}
