// VGen service-ID resolver (server-side, read-only)
// --------------------------------------------------
// GET ?serviceID=<id> -> { serviceID, categoryID, serviceName }
//
// Given only a serviceID, look up the live VGen service detail and return its
// category (searchCategoryID) and title. This is what powers the Add flow: the
// user pastes ONLY a serviceID and the dashboard auto-derives its category — the
// category is never typed in the Add/Edit popup (manual category naming lives in
// the category map alone).
//
// A serviceID VGen doesn't know returns 404; other upstream failures (e.g. an
// intermittent Cloudflare 403) return 502 so the client can distinguish "bad id"
// from "try again".
//
// AUTH: intentionally open for now, mirroring the sibling service-data routes.

import { NextResponse } from 'next/server'
import { fetchServiceDetail } from '@/lib/vgenServiceData/fetchReviews'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 0

const NO_STORE = { 'Cache-Control': 'no-store' }

export async function GET(request) {
  const { searchParams } = new URL(request.url)
  const serviceID = (searchParams.get('serviceID') || '').trim()
  if (!serviceID) {
    return NextResponse.json(
      { error: 'serviceID query param is required' },
      { status: 400, headers: NO_STORE }
    )
  }

  try {
    const detail = await fetchServiceDetail(serviceID)
    return NextResponse.json(detail, { headers: NO_STORE })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    const notFound = /HTTP 404/.test(message)
    return NextResponse.json(
      {
        error: notFound
          ? 'No VGen service found for that ID.'
          : `Could not resolve service: ${message}`,
      },
      { status: notFound ? 404 : 502, headers: NO_STORE }
    )
  }
}
