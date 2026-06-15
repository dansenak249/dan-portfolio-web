// VGen data endpoint (read side, consumed by the dashboard page)
// --------------------------------------------------------------
// Returns a LIGHT payload for the initial dashboard render:
//   {
//     trending: [...latest snapshot rows only],
//     trendingSnapshots: [ ...all kept trending ISO timestamps ], // for the picker
//     profiles: [...last 2 profile snapshots only],               // latest + prev for deltas
//     profileSnapshots: [ ...all kept profiles ISO timestamps ],  // for the picker
//     latest: { trending, profiles },                             // newest ts per kind (sync check)
//     threshold: [...compact floor/cut series],
//     generated,
//   }
// Neither the full trending NOR the full profiles history is shipped here -- the
// dashboard loads older snapshots on demand (/snapshot) and per-post series on
// demand (/post). Profiles ships only the latest 2 snapshots because the
// "Latest values" table needs the previous snapshot to compute per-post deltas.
// This keeps one response from ballooning to ~100+ MB and blowing past Upstash's
// ~10 MB request limit and the browser/Vercel response limits. Public read-only.

import { NextResponse } from 'next/server'
import {
  listLatestSnapshotRows,
  listSnapshotIds,
  listRecentSnapshotRows,
  listThreshold,
} from '@/lib/vgen/store'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 0

// How many recent profile snapshots to ship: latest for current values, plus
// one prior so the dashboard can compute per-post view/like deltas.
const PROFILE_SNAPSHOTS_INLINE = 2

export async function GET() {
  try {
    const [
      trending,
      trendingSnapshots,
      profiles,
      profileSnapshots,
      threshold,
    ] = await Promise.all([
      listLatestSnapshotRows('trending'),
      listSnapshotIds('trending'),
      listRecentSnapshotRows('profiles', PROFILE_SNAPSHOTS_INLINE),
      listSnapshotIds('profiles'),
      listThreshold(),
    ])
    return NextResponse.json(
      {
        trending,
        trendingSnapshots,
        profiles,
        profileSnapshots,
        latest: {
          trending: trendingSnapshots.at(-1) ?? null,
          profiles: profileSnapshots.at(-1) ?? null,
        },
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
