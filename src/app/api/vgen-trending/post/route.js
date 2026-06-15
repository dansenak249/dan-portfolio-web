// VGen per-post series endpoint (on-demand)
// ------------------------------------------
// Returns the full time series for ONE profile post (every kept profiles
// snapshot that contains it, oldest -> newest), so the dashboard's per-post
// chart can load only the post the user clicked instead of shipping the entire
// profiles history up front. The heavy read is batched (<10 MB/request) inside
// getPostSeries and only runs when a post is opened.
//   GET /api/vgen-trending/post?id=<showcaseID> -> { id, series: [...] }
// Public read-only.

import { NextResponse } from 'next/server'
import { getPostSeries } from '@/lib/vgen/store'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET(request) {
  const id = request.nextUrl.searchParams.get('id')
  if (!id) {
    return NextResponse.json(
      { error: 'Missing required query param: id' },
      { status: 400 }
    )
  }

  try {
    const series = await getPostSeries(id)
    return NextResponse.json(
      { id, series },
      { headers: { 'Cache-Control': 'no-store' } }
    )
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Unknown read error'
    return NextResponse.json(
      { error: `Failed to read post series: ${message}` },
      { status: 500 }
    )
  }
}
