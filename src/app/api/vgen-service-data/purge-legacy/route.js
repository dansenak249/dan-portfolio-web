// One-shot cleanup of the pre-census service-data keys (DESTRUCTIVE)
// -------------------------------------------------------------------
// GET  -> dry run: what WOULD be deleted, counted per pattern, plus a sample
// POST -> actually delete
//
// Both require `Authorization: Bearer <VGEN_ADMIN_SECRET>`.
//
// WHY AUTH, when the sibling service-data routes are open: those read or replace
// a list the user can rebuild in the GUI. This one deletes in bulk and cannot be
// undone, so it gets the same dedicated admin secret the trending watchlist uses.
// With VGEN_ADMIN_SECRET unset the route refuses everything — failing closed is
// the right default for a delete.
//
// WHAT IT REMOVES: the old per-service flow (vgsd:services, vgsd:reviews:*,
// vgsd:meta:*, vgsd:artist:*), which the category census replaces. It leaves the
// hand-curated category map, the census itself, and the cached rates alone —
// see LEGACY_PATTERNS in the store for the exact list.
//
// Run the GET first. It is the only chance to see what is about to go.

import { timingSafeEqual } from 'node:crypto'
import { NextResponse } from 'next/server'
import { purgeLegacyServiceData } from '@/lib/vgenServiceData/store'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 0

const NO_STORE = { 'Cache-Control': 'no-store' }

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

async function run(request, dryRun) {
  if (!isAuthorized(request)) return unauthorized()
  try {
    const result = await purgeLegacyServiceData({ dryRun })
    return NextResponse.json({ ok: true, ...result }, { headers: NO_STORE })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json(
      { ok: false, error: `Legacy purge failed: ${message}` },
      { status: 500, headers: NO_STORE }
    )
  }
}

export async function GET(request) {
  return run(request, true)
}

export async function POST(request) {
  return run(request, false)
}
