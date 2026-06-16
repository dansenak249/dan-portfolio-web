// VGen churn endpoint (on-demand analysis)
// ----------------------------------------
// Computes membership churn between consecutive trending snapshots SERVER-SIDE
// and returns only the small summary table, so the dashboard never has to pull
// every full snapshot to the browser just to measure churn.
//   GET /api/vgen-trending/churn
//     -> { churn: [{ ts, entries, exits, jaccard }], uniquePosts, snapshots }
// Jaccard ~1.0 => the list barely changed between snapshots (supports the
// "no continuous refresh" hypothesis); lower => a big reshuffle. uniquePosts is
// the count of DISTINCT showcaseIDs seen across every kept trending snapshot
// (the true turnover total, vs the ~fixed per-snapshot list size). The heavy
// read is batched (<10 MB/request) and only happens when the user opens the tab.
// Public read-only.

import { NextResponse } from 'next/server'
import { iterateSnapshots } from '@/lib/vgen/store'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET() {
  try {
    const churn = []
    let prevSet = null
    let prevTs = null
    // Union of every showcaseID ever seen on trending across the kept window.
    const uniqueIds = new Set()
    let snapshots = 0

    for await (const { ts, rows } of iterateSnapshots('trending')) {
      const set = new Set(rows.map((r) => r.showcaseID))
      snapshots++
      for (const id of set) uniqueIds.add(id)
      if (prevSet) {
        let stay = 0
        for (const id of set) if (prevSet.has(id)) stay++
        const entries = set.size - stay
        const exits = prevSet.size - stay
        const union = prevSet.size + set.size - stay
        churn.push({
          ts,
          from: prevTs,
          entries,
          exits,
          jaccard: union ? stay / union : 0,
        })
      }
      prevSet = set
      prevTs = ts
    }

    return NextResponse.json(
      { churn, uniquePosts: uniqueIds.size, snapshots },
      { headers: { 'Cache-Control': 'no-store' } }
    )
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Unknown read error'
    return NextResponse.json(
      { error: `Failed to compute churn: ${message}` },
      { status: 500 }
    )
  }
}
