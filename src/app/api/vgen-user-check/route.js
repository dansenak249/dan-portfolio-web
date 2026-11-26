// VGen account check endpoint
// --------------------------
//   GET /api/vgen-user-check?q=<userID | username | vgen.co link>
//   -> { fetchedAt, verdict, flags, summary, hasPortfolio, clientReviews,
//        artistReviews, errors, raw }
// Public read-only: everything it returns is already public on api.vgen.co.
// Successful lookups are CDN-cached briefly so repeat checks of the same
// account (and anyone hammering the endpoint) do not each hit VGen.

import { NextResponse } from 'next/server'
import { parseUserQuery, checkVgenUser, UserCheckError } from '@/lib/vgen/fetchUserCheck'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 0

const CACHE_OK = 'public, s-maxage=300, stale-while-revalidate=60'

function errorResponse(message, status) {
  return NextResponse.json({ error: message }, { status, headers: { 'Cache-Control': 'no-store' } })
}

export async function GET(request) {
  const q = new URL(request.url).searchParams.get('q')
  const key = parseUserQuery(q)
  if (!key) {
    return errorResponse('Paste a VGen user ID, username, or profile link.', 400)
  }

  try {
    const result = await checkVgenUser(key)
    return NextResponse.json({ query: key, ...result }, { headers: { 'Cache-Control': CACHE_OK } })
  } catch (error) {
    if (error instanceof UserCheckError) return errorResponse(error.message, error.status)
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error(`[vgen-user-check] ${key}: ${message}`)
    return errorResponse(`Check failed: ${message}`, 500)
  }
}
