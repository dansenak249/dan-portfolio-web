// Automatic refresh: one slice of work per call, rotating through categories
// ---------------------------------------------------------------------------
// POST -> { ok, categoryID, phase, done, advanced, cycles, note, detail }
// GET  -> the current rotation state, for the dashboard to display
//
// Categories ticked "auto" in the map are refreshed in order: crawl the listing,
// then pull reviews, then move to the next one; after the last, start again.
//
// WHY A TICK RATHER THAN A JOB: nothing here waits for or detects "finished".
// Every call reads the persisted position, does ONE bounded slice, and writes the
// position back. A missed call, an overlapping call, a deploy mid-run or a
// function timeout costs at most a repeated slice — there is no run to lose and
// no completion event to miss. It is the same reason the crawl itself stores a
// cursor instead of holding one long connection.
//
// The work is delegated to the existing collect and review endpoints rather than
// reimplemented, so the rotation cannot drift from what the buttons do.
//
// AUTH: `Authorization: Bearer <VGEN_COLLECT_SECRET>` on POST, matching the
// trending collector this sits alongside. GET is open: it only reports position.

import { timingSafeEqual } from 'node:crypto'
import { NextResponse } from 'next/server'
import {
  getCategoryMap,
  getRotation,
  setRotation,
} from '@/lib/vgenServiceData/store'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 0
export const maxDuration = 60

const NO_STORE = { 'Cache-Control': 'no-store' }

function isAuthorized(request) {
  const secret = process.env.VGEN_COLLECT_SECRET
  if (!secret) return false
  const header = request.headers.get('authorization') || ''
  const token = header.startsWith('Bearer ') ? header.slice(7) : header
  const a = Buffer.from(token)
  const b = Buffer.from(secret)
  if (a.length !== b.length) return false
  return timingSafeEqual(a, b)
}

// Categories the operator has opted into, in map order.
async function autoCategories() {
  const map = await getCategoryMap()
  return map
    .filter((c) => c.auto && (c.categoryID || '').trim())
    .map((c) => ({
      categoryID: c.categoryID.trim(),
      label: (c.categoryName || '').trim() || (c.defaultName || '').trim() || c.categoryID,
    }))
}

async function callSlice(request, path, body) {
  const base = new URL(request.url).origin
  const res = await fetch(base + path, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
    cache: 'no-store',
  })
  const text = await res.text()
  let json = null
  try {
    json = JSON.parse(text)
  } catch {
    // A dead function answers with an HTML error page; keep the status instead.
  }
  if (!res.ok) {
    throw new Error(
      'HTTP ' + res.status + ((json && json.error) ? ' - ' + json.error : '')
    )
  }
  return json || {}
}

export async function GET() {
  try {
    const [state, list] = await Promise.all([getRotation(), autoCategories()])
    return NextResponse.json(
      { state, categories: list, count: list.length },
      { headers: NO_STORE }
    )
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json(
      { error: `Failed to read rotation: ${message}` },
      { status: 500, headers: NO_STORE }
    )
  }
}

export async function POST(request) {
  if (!isAuthorized(request)) {
    return NextResponse.json(
      { error: 'Unauthorized: send Authorization: Bearer <VGEN_COLLECT_SECRET>' },
      { status: 401, headers: NO_STORE }
    )
  }

  let body = {}
  try {
    body = (await request.json()) || {}
  } catch {
    // No body: run with defaults.
  }

  try {
    const list = await autoCategories()
    if (!list.length) {
      return NextResponse.json(
        { ok: true, note: 'No categories are ticked for auto refresh.', idle: true },
        { headers: NO_STORE }
      )
    }

    const prev = await getRotation()
    // Resolve the position by ID, not by index: the map can be reordered or a
    // category unticked between calls, and an index would then point at
    // something else entirely.
    let index = prev ? list.findIndex((c) => c.categoryID === prev.categoryID) : -1
    let phase = prev && index !== -1 ? prev.phase : 'census'
    // The category we were on can also be GONE - unticked or deleted while a
    // tick was not running. Resuming from the top would then re-crawl everything
    // ahead of it, so instead pick up after whichever category last FINISHED,
    // which is the place in the order that deletion cannot move.
    if (index === -1 && prev && prev.lastDoneCategoryID) {
      const after = list.findIndex((c) => c.categoryID === prev.lastDoneCategoryID)
      if (after !== -1) index = (after + 1) % list.length
    }
    if (index === -1) index = 0
    let cycles = (prev && prev.cycles) || 0
    let lastDoneCategoryID = (prev && prev.lastDoneCategoryID) || null

    const current = list[index]
    // Captured before the phase advances below: without this, a tick that ran
    // the reviews phase reports itself as having run the census.
    const ranPhase = phase
    let advanced = false
    let detail = null

    if (phase === 'census') {
      detail = await callSlice(request, '/api/vgen-service-data/categories/collect', {
        categoryID: current.categoryID,
      })
      if (detail.done) phase = 'reviews'
    } else {
      detail = await callSlice(request, '/api/vgen-service-data/reviews/collect', {
        categoryID: current.categoryID,
      })
      if (detail.done) {
        // This category is finished; hand over to the next one.
        lastDoneCategoryID = current.categoryID
        index = (index + 1) % list.length
        phase = 'census'
        advanced = true
        if (index === 0) cycles++
      }
    }

    const next = list[index]
    const state = {
      categoryID: next.categoryID,
      label: next.label,
      phase,
      cycles,
      lastDoneCategoryID,
      startedAt: (prev && prev.startedAt) || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      lastNote: 'Ran ' + ranPhase + ' for ' + current.label,
    }
    await setRotation(state)

    return NextResponse.json(
      {
        ok: true,
        ranCategory: current.label,
        ranPhase,
        done: !!detail.done,
        advanced,
        cycles,
        next: { categoryID: next.categoryID, label: next.label, phase },
        detail,
      },
      { headers: NO_STORE }
    )
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    // The position is left untouched, so the next tick retries the same slice.
    return NextResponse.json(
      { ok: false, error: `Rotation tick failed: ${message}` },
      { status: 502, headers: NO_STORE }
    )
  }
}
