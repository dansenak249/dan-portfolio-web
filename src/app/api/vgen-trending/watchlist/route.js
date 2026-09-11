// VGen watchlist endpoint (open read/write)
// -----------------------------------------
// GET  -> { watchlist: [{ userID, label }, ...] }
// POST -> replace the whole watchlist (add / remove / reorder in one shot).
//         Body: { watchlist: [{ userID, label }, ...] }
//
// Removing an account stops FUTURE collection for it AND immediately deletes its
// already stored profile snapshots (purgeProfileUsers), so a removed profile's
// history is scrubbed at once instead of aging out on the retention window.
//
// This used to sit behind VGEN_ADMIN_SECRET. That gate is gone at the owner's
// request: the secret is not to hand, and prompting for it on every add, remove
// or reorder made the editor unusable. So the endpoint is now open, like the
// per-category purge next door.
//
// Know what that means: the dashboard's own source names this URL, so anyone who
// opens the page can POST to it. Two guards remain in the handler - a non-empty
// list, and sanitizeWatchlist - but neither stops a caller who sends a valid
// small list, and the profile history a removal deletes is NOT re-crawlable.

import { NextResponse } from 'next/server'
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
