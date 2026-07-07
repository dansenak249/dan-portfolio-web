// Cookie verification: resolve a VGen cookie to the account it belongs to.
// ------------------------------------------------------------------
// MASTER-only. The admin pastes a VGen cookie and we confirm WHICH account it
// belongs to before saving it -- guarding against accidentally storing the
// wrong person's cookie during testing. We derive the account's userID from the
// cookie's embedded `v-session` JWT (no VGen call needed for that), then resolve
// the human @handle via VGen's PUBLIC profile endpoint (the same discoverability
// feed the trending collector uses). The public endpoint is unauthenticated and
// not IP-bound, so it works from the server without the cf_clearance pitfalls of
// the authed session/refresh call.
//
// Returns { userId, handle, displayName }. `handle` is empty when the account
// has no public showcases to read a username from (rare for real artists).

import { NextResponse } from 'next/server'
import { isAdminRequest } from '@/lib/botConfig/store.js'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 0

const NO_STORE = { 'Cache-Control': 'no-store' }

// VGen public profile portfolio feed. Each showcase item carries the owner's
// username/displayName under `userModeration`, so one item is enough to resolve
// the handle for a given userID.
const PROFILE_URL = 'https://api.vgen.co/discoverability/portfolio/showcases/'
const PROFILE_QUERY = {
  verifyAge: 'true',
  isDraftExcluded: 'true',
  matchTag: '',
  showOnlyCommissions: 'false',
  limit: '1',
}

// Decode a JWT payload (base64url) without verifying the signature -- we only
// read the userID claim for identification, never trust it for authorization.
function decodeJwtPayload(jwt) {
  try {
    const part = jwt.split('.')[1]
    if (!part) return null
    return JSON.parse(Buffer.from(part, 'base64url').toString('utf8'))
  } catch {
    return null
  }
}

// Pull a single cookie value out of a full cookie string.
function cookieValue(cookie, name) {
  const match = cookie.match(new RegExp('(?:^|;\\s*)' + name + '=([^;]*)'))
  return match ? match[1] : ''
}

// Derive the VGen userID from the cookie's v-session JWT.
function deriveUserId(cookie) {
  const session = cookieValue(cookie, 'v-session')
  if (!session) return ''
  const payload = decodeJwtPayload(session)
  if (!payload) return ''
  return (
    payload.userID ||
    payload.userId ||
    payload.user_id ||
    payload.sub ||
    payload.id ||
    ''
  )
}

// Resolve { handle, displayName } for a userID via the public profile feed.
// Returns empty strings when the account has no readable public showcase.
async function resolveHandle(userId) {
  const params = new URLSearchParams(PROFILE_QUERY)
  const url = `${PROFILE_URL}${encodeURIComponent(userId)}?${params.toString()}`
  const res = await fetch(url, {
    method: 'GET',
    headers: { accept: 'application/json' },
    cache: 'no-store',
  })
  if (!res.ok) {
    throw new Error(`VGen profile lookup failed (HTTP ${res.status})`)
  }
  const data = await res.json()
  const item = Array.isArray(data?.showcases) ? data.showcases[0] : null
  const mod = item?.userModeration
  return {
    handle: mod?.username || '',
    displayName: mod?.displayName || '',
  }
}

export async function POST(request) {
  if (!(await isAdminRequest(request))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body
  try {
    body = await request.json()
  } catch {
    return NextResponse.json(
      { error: 'Invalid JSON in request body' },
      { status: 400 }
    )
  }

  const cookie = typeof body?.cookie === 'string' ? body.cookie.trim() : ''
  if (!cookie) {
    return NextResponse.json({ error: 'cookie is required' }, { status: 400 })
  }

  const userId = deriveUserId(cookie)
  if (!userId) {
    return NextResponse.json(
      { error: 'No v-session in cookie -- paste a fresh cookie captured while logged in.' },
      { status: 422 }
    )
  }

  try {
    const { handle, displayName } = await resolveHandle(userId)
    return NextResponse.json(
      { userId, handle, displayName },
      { headers: NO_STORE }
    )
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Verification failed'
    return NextResponse.json({ error: message }, { status: 502 })
  }
}
