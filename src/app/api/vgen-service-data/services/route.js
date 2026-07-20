// VGen service-data watchlist endpoint (read public, write protected)
// -------------------------------------------------------------------
// GET  -> { services: [{ serviceID, serviceType }, ...] }   (public, read-only)
// POST -> replace the whole declared-service list (add / remove / reorder in one
//         shot). Body:
//           { services: [{ serviceID, serviceType }, ...] }
//
// Removing a service immediately purges its cached reviews + meta so a dropped
// listing's data is scrubbed at once. Empty list IS allowed here (unlike the
// trending watchlist) because on-demand fetching means an empty declaration just
// means "nothing to survey yet", which is a valid starting state.
//
// AUTH: intentionally open for now. This is a personal, noindex research tool;
// auth will be added later as part of a unified /tools login. Until then the
// POST is unauthenticated (mirrors the existing 1minutes timeline tool).

import { NextResponse } from 'next/server'
import { getServices, setServices, purgeService } from '@/lib/vgenServiceData/store'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 0

// Upper bound so a bad/abusive POST can't store an unbounded list.
const MAX_SERVICES = 200

// Normalize + validate the incoming list: keep only well-formed entries, trim
// strings, dedupe by serviceID (first wins), and cap the length. serviceType is
// free text and MAY be empty (user can label later); serviceID is required.
function sanitizeServices(input) {
  if (!Array.isArray(input)) return null
  const out = []
  const seen = new Set()
  for (const raw of input) {
    if (!raw || typeof raw !== 'object') continue
    const serviceID =
      typeof raw.serviceID === 'string' ? raw.serviceID.trim() : ''
    const serviceType =
      typeof raw.serviceType === 'string' ? raw.serviceType.trim() : ''
    if (!serviceID) continue
    if (seen.has(serviceID)) continue
    seen.add(serviceID)
    out.push({ serviceID, serviceType })
    if (out.length >= MAX_SERVICES) break
  }
  return out
}

export async function GET() {
  try {
    const services = await getServices()
    return NextResponse.json(
      { services },
      { headers: { 'Cache-Control': 'no-store' } }
    )
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Unknown read error'
    return NextResponse.json(
      { error: `Failed to load services: ${message}` },
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

  const services = sanitizeServices(body && body.services)
  if (services === null) {
    return NextResponse.json(
      { error: 'Body must be { services: [{ serviceID, serviceType }, ...] }' },
      { status: 400 }
    )
  }

  try {
    // Figure out which serviceIDs are being removed so we can scrub their cached
    // reviews + meta immediately (the new list no longer contains them).
    const previous = await getServices()
    const nextIDs = new Set(services.map((entry) => entry.serviceID))
    const removedIDs = previous
      .map((entry) => entry.serviceID)
      .filter((serviceID) => !nextIDs.has(serviceID))

    await setServices(services)
    for (const serviceID of removedIDs) await purgeService(serviceID)

    return NextResponse.json(
      { ok: true, services, removed: removedIDs },
      { headers: { 'Cache-Control': 'no-store' } }
    )
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Unknown write error'
    return NextResponse.json({ ok: false, error: message }, { status: 500 })
  }
}
