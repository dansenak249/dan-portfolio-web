// Fetch lease status + claim endpoint
// -----------------------------------
// GET  -> { locked, lock, claim, ttlSec }
// POST { action: 'claim' | 'release', holder, categoryID?, label? }
//
// The dashboard cannot know from its own memory whether a fetch is running: the
// tab that started one may have been closed, another tab may be driving it, or
// it may be the automatic rotation. So the buttons start DISABLED on every load
// and only enable once this endpoint says the lease is free — the safe default
// being "someone might be fetching", not "nobody is".
//
// `claim` is how a person interrupts the rotation. It does not stop anything
// mid-slice; it just means the rotation declines to take the lease again when
// its current tick ends, which frees it for the person within one slice.
//
// AUTH: open, mirroring the sibling service-data routes. The lease is a
// coordination aid for one operator, not a security boundary.

import { NextResponse } from 'next/server'
import {
  getFetchLock,
  claimFetchLock,
  releaseFetchLock,
  clearFetchClaim,
  FETCH_LOCK_TTL_SEC,
} from '@/lib/vgenServiceData/store'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 0

const NO_STORE = { 'Cache-Control': 'no-store' }

export async function GET() {
  try {
    const { lock, claim } = await getFetchLock()
    return NextResponse.json(
      { ok: true, locked: !!lock, lock, claim, ttlSec: FETCH_LOCK_TTL_SEC },
      { headers: NO_STORE }
    )
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    // Report the failure rather than an empty lock: a dashboard that cannot
    // reach Redis must keep its buttons disabled, not conclude the lease is
    // free and let a second crawl start.
    return NextResponse.json(
      { ok: false, error: message },
      { status: 502, headers: NO_STORE }
    )
  }
}

export async function POST(request) {
  let body = {}
  try {
    body = (await request.json()) || {}
  } catch {
    // Treated as a missing holder below.
  }

  const holder = String(body.holder || '').trim()
  const action = String(body.action || '').trim()
  if (!holder) {
    return NextResponse.json(
      { error: 'holder is required' },
      { status: 400, headers: NO_STORE }
    )
  }

  try {
    if (action === 'claim') {
      await claimFetchLock(holder, {
        categoryID: body.categoryID || null,
        label: body.label || null,
      })
    } else if (action === 'release') {
      await releaseFetchLock(holder)
      await clearFetchClaim(holder)
    } else {
      return NextResponse.json(
        { error: "action must be 'claim' or 'release'" },
        { status: 400, headers: NO_STORE }
      )
    }
    const { lock, claim } = await getFetchLock()
    return NextResponse.json(
      { ok: true, locked: !!lock, lock, claim },
      { headers: NO_STORE }
    )
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json(
      { ok: false, error: message },
      { status: 502, headers: NO_STORE }
    )
  }
}
