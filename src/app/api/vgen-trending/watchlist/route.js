// VGen watchlist endpoint (read public, write protected)
// ------------------------------------------------------
// GET  -> { watchlist: [{ userID, label }, ...] }   (public, read-only)
// POST -> replace the whole watchlist (add / remove / reorder in one shot).
//         Requires `Authorization: Bearer <VGEN_ADMIN_SECRET>`. Body:
//           { watchlist: [{ userID, label }, ...] }
//
// Removing an account stops FUTURE collection for it AND immediately deletes its
// already stored profile snapshots (purgeProfileUsers), so a removed profile's
// history is scrubbed at once instead of aging out on the retention window.
//
// VGEN_ADMIN_SECRET is a DEDICATED secret, intentionally NOT the collect secret
// (which lives in a third-party cron service): only this endpoint can mutate the
// watchlist, so the secret that edits what we track is never shared externally.

import { NextResponse } from 'next/server'
import { timingSafeEqual } from 'crypto'
import {
  getWatchlist,
  setWatchlist,
  purgeProfileUsers,
} from '@/lib/vgen/store'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 0

// Upper bound so a bad/abusive POST can't store an unbounded list.
const MAX_WATCHLIST = 200

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

// Normalize + validate the incoming list: keep only well-formed entries, trim
// strings, dedupe by userID (first wins), and cap the length.
function sanitizeWatchlist(input) {
  if (!Array.isArray(input)) return null
  const out = []
  const seen = new Set()
  for (const raw of input) {
    if (!raw || typeof raw !== 'object') continue
    const userID = typeof raw.userID === 'string' ? raw.userID.trim() : ''
    const label = typeof raw.label === 'string' ? raw.label.trim() : ''
    if (!userID || !label) continue
    if (seen.has(userID)) continue
    seen.add(userID)
    out.push({ userID, label })
    if (out.length >= MAX_WATCHLIST) break
  }
  return out
}

export async function GET() {
  try {
    const watchlist = await getWatchlist()
    return NextResponse.json(
      { watchlist },
      { headers: { 'Cache-Control': 'no-store' } }
    )
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Unknown read error'
    return NextResponse.json(
      { error: `Failed to load watchlist: ${message}` },
      { status: 500 }
    )
  }
}

export async function POST(request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const watchlist = sanitizeWatchlist(body && body.watchlist)
  if (watchlist === null) {
    return NextResponse.json(
      { error: 'Body must be { watchlist: [{ userID, label }, ...] }' },
      { status: 400 }
    )
  }
  if (watchlist.length === 0) {
    // Refuse to wipe the watchlist entirely: an empty list would make the
    // collector fetch no profiles at all, which is almost never intended.
    return NextResponse.json(
      { error: 'Watchlist must contain at least one valid { userID, label }' },
      { status: 400 }
    )
  }

  try {
    // Figure out which userIDs are being removed so we can scrub their stored
    // data immediately (the new list no longer contains them).
    const previous = await getWatchlist()
    const nextIDs = new Set(watchlist.map((entry) => entry.userID))
    const removedIDs = previous
      .map((entry) => entry.userID)
      .filter((userID) => !nextIDs.has(userID))

    await setWatchlist(watchlist)
    const purged = await purgeProfileUsers(removedIDs)

    return NextResponse.json(
      { ok: true, watchlist, removed: removedIDs, purged },
      { headers: { 'Cache-Control': 'no-store' } }
    )
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Unknown write error'
    return NextResponse.json(
      { ok: false, error: message },
      { status: 500 }
    )
  }
}
