// VGen status endpoint (sync check)
// ---------------------------------
// Tiny endpoint returning only the timestamp of the latest snapshot for each
// kind (two cheap Redis reads). The dashboard calls this first: if its cached
// latest timestamps already match the server, it skips the full /data fetch and
// renders from localStorage instead, avoiding a wasteful re-download when
// nothing has changed since the last visit.
//   GET /api/vgen-trending/status -> { trending, profiles }
// Public read-only.

import { NextResponse } from 'next/server'
import { lastSnapshotId } from '@/lib/vgen/store'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET() {
  try {
    const [trending, profiles] = await Promise.all([
      lastSnapshotId('trending'),
      lastSnapshotId('profiles'),
    ])
    return NextResponse.json(
      { trending, profiles },
      { headers: { 'Cache-Control': 'no-store' } }
    )
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Unknown read error'
    return NextResponse.json(
      { error: `Failed to read status: ${message}` },
      { status: 500 }
    )
  }
}
