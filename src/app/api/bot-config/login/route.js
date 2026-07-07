// Web UI login: exchange username + password for a role + scoped token
// ------------------------------------------------------------------
// Human-facing counterpart to /api/poller/enroll (which is for machines). The
// bot-config page shows a login screen first; on success it learns the caller's
// role (admin vs member) and receives the user's pollerSecret to use as the
// Bearer token for subsequent /api/bot-config calls. An admin's secret grants
// master-level access via the role check in the store; a member's is scoped to
// their own record. The env master secret is never exposed to the browser.
//
// Verification is constant-time and non-enumerable (same generic error for a
// missing username and a wrong password).

import { NextResponse } from 'next/server'
import { verifyCredentials } from '@/lib/botConfig/store.js'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 0

const NO_STORE = { 'Cache-Control': 'no-store' }
const INVALID = { error: 'Invalid username or password' }

export async function POST(request) {
  let body
  try {
    body = await request.json()
  } catch {
    return NextResponse.json(
      { error: 'Invalid JSON in request body' },
      { status: 400 }
    )
  }

  const username = typeof body?.username === 'string' ? body.username.trim() : ''
  const password = typeof body?.password === 'string' ? body.password : ''

  if (!username || !password) {
    return NextResponse.json(INVALID, { status: 401, headers: NO_STORE })
  }

  try {
    const user = await verifyCredentials(username, password)
    if (!user) {
      return NextResponse.json(INVALID, { status: 401, headers: NO_STORE })
    }

    return NextResponse.json(
      {
        role: user.role,
        userId: user.userId,
        username: user.username,
        displayName: user.displayName,
        token: user.pollerSecret,
      },
      { headers: NO_STORE }
    )
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json(
      { error: `Login failed: ${message}` },
      { status: 500 }
    )
  }
}
