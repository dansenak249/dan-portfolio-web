// VGen single-snapshot endpoint (on-demand read)
// -----------------------------------------------
// The dashboard shows the latest trending snapshot by default; when the user
// picks an older one from the snapshot dropdown, it fetches just that snapshot
// here instead of the whole history being shipped up front.
//   GET /api/vgen-trending/snapshot?kind=trending&ts=<ISO> -> { ts, kind, rows }
// One Redis read (~<1 MB), well under the 10 MB request limit. Public read-only.

import { NextResponse } from 'next/server'
import { getSnapshotRows } from '@/lib/vgen/store'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 0

const ALLOWED_KINDS = new Set(['trending', 'profiles'])

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const kind = searchParams.get('kind') || 'trending'
    const ts = searchParams.get('ts')

    if (!ALLOWED_KINDS.has(kind)) {
      return NextResponse.json(
        { error: `Invalid kind: ${kind}` },
        { status: 400 }
      )
    }
    if (!ts) {
      return NextResponse.json({ error: 'Missing ts' }, { status: 400 })
    }

    const rows = await getSnapshotRows(kind, ts)
    return NextResponse.json(
      { ts, kind, rows },
      { headers: { 'Cache-Control': 'no-store' } }
    )
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Unknown read error'
    return NextResponse.json(
      { error: `Failed to load snapshot: ${message}` },
      { status: 500 }
    )
  }
}
