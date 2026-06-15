// VGen data endpoint (read side, consumed by the dashboard page)
// --------------------------------------------------------------
// Returns a LIGHT payload for the initial dashboard render:
//   {
//     trending: [...latest snapshot rows only],
//     trendingSnapshots: [ ...all kept ISO timestamps ],  // for the picker
//     profiles: [...all profile rows],                    // small; per-post charts need history
//     threshold: [...compact floor/cut series],
//     generated,
//   }
// Older trending snapshots are NOT shipped here -- the dashboard loads them on
// demand from /snapshot. This keeps one response from ballooning to ~100+ MB
// (240 trending snapshots x 1000 rows) and blowing past Upstash's ~10 MB request
// limit and the browser/Vercel response limits. Public read-only (no secret).

import { NextResponse } from 'next/server'
import {
  listLatestSnapshotRows,
  listSnapshotIds,
  listSnapshotRows,
  listThreshold,
} from '@/lib/vgen/store'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET() {
  try {
    const [trending, trendingSnapshots, profiles, threshold] = await Promise.all(
      [
        listLatestSnapshotRows('trending'),
        listSnapshotIds('trending'),
        listSnapshotRows('profiles'),
        listThreshold(),
      ]
    )
    return NextResponse.json(
      {
        trending,
        trendingSnapshots,
        profiles,
        threshold,
        generated: new Date().toISOString(),
      },
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
