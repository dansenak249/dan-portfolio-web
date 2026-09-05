// VGen snapshot prune endpoint (protected)
// ---------------------------------------
// POST /api/vgen-trending/prune  ->  bring stored snapshots back inside the
// CURRENT limits. Lowering a limit in code does not free anything by itself:
// appendSnapshot only trims a few snapshots per collect run (deliberately, so a
// cap change cannot turn one collect into a multi-minute purge), and it never
// touches the rows inside a snapshot that was written under an older, wider cap.
// This endpoint does both:
//   - drops every snapshot past MAX_SNAPSHOTS, for both kinds
//   - cuts each surviving TRENDING snapshot down to its top MAX_TRENDING rows
//
// Row trimming reads and rewrites whole payloads, so it runs against a wall-clock
// budget and reports `remaining`. A non-zero `remaining` is not an error: POST
// again to continue where it stopped. `done` says when there is nothing left.
//
// Requires `Authorization: Bearer <VGEN_ADMIN_SECRET>` - the same dedicated
// secret that guards the watchlist, not the collect secret, because this is
// destructive and irreversible.

import { NextResponse } from 'next/server'
import { timingSafeEqual } from 'crypto'
import { pruneSnapshots } from '@/lib/vgen/store'
import { MAX_TRENDING } from '@/lib/vgen/fetchVgen'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 0
export const maxDuration = 60

// Leaves headroom inside maxDuration for the two index sweeps and the response.
const DEFAULT_BUDGET_MS = 40000

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

export async function POST(request) {
  if (!isAuthorized(request)) {
    return NextResponse.json(
      { ok: false, error: 'unauthorized' },
      { status: 401, headers: { 'Cache-Control': 'no-store' } }
    )
  }

  try {
    const started = Date.now()
    const body = await request.json().catch(() => ({}))
    const budgetMs = Number.isFinite(body && body.budgetMs)
      ? Math.max(5000, Math.min(50000, body.budgetMs))
      : DEFAULT_BUDGET_MS

    // Trending first: it is both the bigger payload and the only kind whose
    // rows get trimmed, so it should get the budget if only one kind fits.
    const trending = await pruneSnapshots('trending', {
      maxRows: MAX_TRENDING,
      budgetMs,
    })
    // Profiles rows are per-account, not ranked, so only the retention cap
    // applies - which is index work, not payload work, and always completes.
    const profiles = await pruneSnapshots('profiles')

    return NextResponse.json(
      {
        ok: true,
        done: trending.remaining === 0,
        maxRows: MAX_TRENDING,
        elapsedMs: Date.now() - started,
        trending,
        profiles,
      },
      { headers: { 'Cache-Control': 'no-store' } }
    )
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: String((error && error.message) || error) },
      { status: 500, headers: { 'Cache-Control': 'no-store' } }
    )
  }
}
