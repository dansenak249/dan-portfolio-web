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
// ONE ROTATION, BOTH MARKETPLACES. Commission and Shop share a single
// bandwidth budget and a single fetch lease, so they share the rotation too:
// one combined list, walked one category at a time, rather than two rotations
// competing for the same lease. A Shop category needs only its census — a
// product carries its own sales count and its own review stats — so it
// finishes in one phase where a commission category needs two.
//
// AUTH: `Authorization: Bearer <VGEN_COLLECT_SECRET>` on POST, matching the
// trending collector this sits alongside. GET is open: it only reports position.

import { timingSafeEqual } from 'node:crypto'
import { NextResponse } from 'next/server'
import {
  getCategoryMap,
  getShopCategoryMap,
  getRotation,
  setRotation,
  acquireFetchLock,
  releaseFetchLock,
} from '@/lib/vgenServiceData/store'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 0
export const maxDuration = 60

const NO_STORE = { 'Cache-Control': 'no-store' }

// Stable across ticks on purpose. Successive ticks renew the same lease rather
// than queueing behind each other, and a tick that died without releasing is
// simply renewed by the next one instead of blocking the rotation for a TTL.
const ROTATION_HOLDER = 'rotation'

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
// Categories the operator has opted into, across both marketplaces, in map
// order: Commission first, then Shop.
//
// The position key is market + id, NOT the id alone. VGen's two taxonomies
// share 36 category ids outright, so keying on the id would let the rotation
// mistake a Shop category for its Commission namesake and jump between the two.
async function autoCategories() {
  const [commission, shop] = await Promise.all([
    getCategoryMap(),
    getShopCategoryMap(),
  ])
  const pick = (map, market) =>
    map
      .filter((c) => c.auto && (c.categoryID || '').trim())
      .map((c) => {
        const categoryID = c.categoryID.trim()
        const name =
          (c.categoryName || '').trim() || (c.defaultName || '').trim() || categoryID
        return {
          market,
          categoryID,
          key: market + ':' + categoryID,
          // Marked in the label so a status line says which table it means when
          // the same category name exists on both sides.
          label: market === 'shop' ? name + ' (shop)' : name,
        }
      })
  return [...pick(commission, 'commission'), ...pick(shop, 'shop')]
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

/**
 * Where the next tick should start, given the stored state and the current
 * list. Pure, so the rules can be tested without a crawl or a Redis.
 *
 * Two subtleties live here:
 *   - a state written before Shop joined carries no `key`, and every one of
 *     those entries was a commission entry, so it is read as such rather than
 *     silently restarting the cycle;
 *   - the category we were on may be GONE, unticked or deleted between ticks.
 *     Restarting from the top would re-crawl everything ahead of it, so the
 *     fallback is the position after whichever category last FINISHED - the one
 *     place in the order that a deletion cannot move.
 *
 * @param {{key: string, market: string}[]} list
 * @param {object|null} prev
 * @returns {{ index: number, phase: string, lastDoneKey: string|null }}
 */
export function resolvePosition(list, prev) {
  const prevKey = prev
    ? prev.key || (prev.categoryID && 'commission:' + prev.categoryID) || null
    : null
  const lastDoneKey = prev
    ? prev.lastDoneKey ||
      (prev.lastDoneCategoryID && 'commission:' + prev.lastDoneCategoryID) ||
      null
    : null

  let index = prevKey ? list.findIndex((c) => c.key === prevKey) : -1
  let phase = prev && index !== -1 ? prev.phase || 'census' : 'census'
  if (index === -1 && lastDoneKey) {
    const after = list.findIndex((c) => c.key === lastDoneKey)
    if (after !== -1) index = (after + 1) % list.length
  }
  if (index === -1) index = 0
  // Shop has no reviews phase; a stored one would send a product category to
  // the commission review endpoint.
  if (list[index] && list[index].market === 'shop') phase = 'census'
  return { index, phase, lastDoneKey }
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

  // No parameters: a tick reads its position from Redis and takes the next
  // bounded slice. Anything a caller could pass here would be a way to make one
  // tick behave unlike another, which is exactly what the design avoids.

  try {
    const list = await autoCategories()
    if (!list.length) {
      return NextResponse.json(
        { ok: true, note: 'No categories are ticked for auto refresh.', idle: true },
        { headers: NO_STORE }
      )
    }

    // Stand down for a person. This does not interrupt anything mid-slice: the
    // tick simply does not start, the position is not touched, and the manual
    // fetch has the lease to itself. The rotation picks up on its next tick,
    // whenever that is.
    const lease = await acquireFetchLock(ROTATION_HOLDER, 'rotation', {})
    if (!lease.ok) {
      return NextResponse.json(
        {
          ok: true,
          paused: true,
          note: 'Standing down: ' + (lease.reason || 'the fetch lease is busy'),
          heldBy: lease.lock
            ? { kind: lease.lock.kind, label: lease.lock.label }
            : null,
        },
        { headers: NO_STORE }
      )
    }

    const prev = await getRotation()
    // Resolve the position by KEY, not by index: the map can be reordered or a
    // category unticked between calls, and an index would then point at
    // something else entirely.
    //
    // A state written before Shop joined the rotation carries no `key`. Those
    // were all commission entries, so read them as such rather than starting
    // the whole cycle over.
    const start = resolvePosition(list, prev)
    let index = start.index
    let phase = start.phase
    let cycles = (prev && prev.cycles) || 0
    let lastDoneKey = start.lastDoneKey

    const current = list[index]
    const isShop = current.market === 'shop'

    // Captured before the phase advances below: without this, a tick that ran
    // the reviews phase reports itself as having run the census.
    const ranPhase = phase
    let advanced = false
    let detail = null

    const finish = () => {
      lastDoneKey = current.key
      index = (index + 1) % list.length
      phase = 'census'
      advanced = true
      if (index === 0) cycles++
    }

    if (phase === 'census') {
      detail = await callSlice(
        request,
        isShop
          ? '/api/vgen-shop-data/categories/collect'
          : '/api/vgen-service-data/categories/collect',
        {
          categoryID: current.categoryID,
          // Renews the lease this tick already holds rather than fighting it.
          holder: ROTATION_HOLDER,
          lockKind: 'rotation',
        }
      )
      if (detail.done) {
        // Shop is done here: the crawl already carries sales and ratings, so
        // there is no second pass to make.
        if (isShop) finish()
        else phase = 'reviews'
      }
    } else {
      detail = await callSlice(request, '/api/vgen-service-data/reviews/collect', {
        categoryID: current.categoryID,
        holder: ROTATION_HOLDER,
        lockKind: 'rotation',
      })
      if (detail.done) finish()
    }

    const next = list[index]
    const state = {
      key: next.key,
      market: next.market,
      categoryID: next.categoryID,
      label: next.label,
      phase,
      cycles,
      lastDoneKey,
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
        ranMarket: current.market,
        next: {
          categoryID: next.categoryID,
          market: next.market,
          label: next.label,
          phase,
        },
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
  } finally {
    // Released between ticks, not held across a whole run: that is what lets a
    // person get in after at most one slice instead of waiting out the run.
    // Harmless when we never took it - release only deletes our own lease.
    try {
      await releaseFetchLock(ROTATION_HOLDER)
    } catch {
      // The TTL is the backstop; a failed release costs at most one tick.
    }
  }
}
