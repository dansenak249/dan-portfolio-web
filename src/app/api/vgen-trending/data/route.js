// VGen data endpoint (read side, consumed by the dashboard page)
// --------------------------------------------------------------
// Returns every kept snapshot flattened into trending/profiles row arrays,
// matching the local viewer's data contract:
//   { trending: [...rows], profiles: [...rows], generated }
// Each row carries its own `snapshot_ts`, so the client can reconstruct the
// time series. This endpoint is public read-only (no secret needed).

import { NextResponse } from 'next/server'
import { listSnapshotRows } from '@/lib/vgen/store'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET() {
  try {
    const [trending, profiles] = await Promise.all([
      listSnapshotRows('trending'),
      listSnapshotRows('profiles'),
    ])
    return NextResponse.json(
      { trending, profiles, generated: new Date().toISOString() },
      { headers: { 'Cache-Control': 'no-store' } }
    )
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Unknown read error'
    return NextResponse.json(
      { error: `Failed to load VGen data: ${message}` },
      { status: 500 }
    )
  }
}
