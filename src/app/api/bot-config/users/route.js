// Admin user management for the bot config (list + create)
// ------------------------------------------------------------------
// MASTER-only. Lists team members and creates new ones. Flow A: the admin
// assigns the username + password; the server mints the userId + pollerSecret.
// The member later exchanges username/password for the secret via
// /api/poller/enroll, so they never handle the raw secret themselves.

import { NextResponse } from 'next/server'
import {
  isMaster,
  listUsers,
  getUser,
  putUser,
  findByUsername,
  defaultConfig,
  generateUserId,
  generatePollerSecret,
} from '@/lib/botConfig/store.js'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 0

const NO_STORE = { 'Cache-Control': 'no-store' }
const MAX_FIELD = 256

// Lightweight row for the admin UI dropdown/list. Excludes the long cookie and
// the machine secret; full detail is available via GET /api/bot-config?userId=.
function toSummary(user) {
  return {
    userId: user.userId,
    username: user.username,
    displayName: user.displayName,
    password: user.password, // admin-viewable convenience credential (flow A)
    hasCookie: Boolean(user.vgenCookie),
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
    vgenCookieUpdatedAt: user.vgenCookieUpdatedAt,
    pollerHeartbeatAt: user.pollerHeartbeatAt,
  }
}

export async function GET(request) {
  if (!isMaster(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  try {
    const users = await listUsers()
    return NextResponse.json(
      { users: users.map(toSummary) },
      { headers: NO_STORE }
    )
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown read error'
    return NextResponse.json(
      { error: `Failed to list users: ${message}` },
      { status: 500 }
    )
  }
}

export async function POST(request) {
  if (!isMaster(request)) {
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

  const username = typeof body?.username === 'string' ? body.username.trim() : ''
  const password = typeof body?.password === 'string' ? body.password : ''
  const displayName =
    typeof body?.displayName === 'string' ? body.displayName.trim() : ''

  if (!username) {
    return NextResponse.json({ error: 'username is required' }, { status: 400 })
  }
  if (!password) {
    return NextResponse.json({ error: 'password is required' }, { status: 400 })
  }
  if (username.length > MAX_FIELD || password.length > MAX_FIELD) {
    return NextResponse.json(
      { error: `username/password must be <= ${MAX_FIELD} characters` },
      { status: 400 }
    )
  }

  try {
    if (await findByUsername(username)) {
      return NextResponse.json(
        { error: `username "${username}" is already taken` },
        { status: 409 }
      )
    }

    const userId = generateUserId()
    const now = new Date().toISOString()
    const config = {
      ...defaultConfig(userId),
      username,
      password,
      displayName: displayName || username,
      pollerSecret: generatePollerSecret(),
      createdAt: now,
      updatedAt: now,
    }
    const saved = await putUser(userId, config)
    return NextResponse.json(saved, { status: 201, headers: NO_STORE })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown write error'
    return NextResponse.json(
      { error: `Failed to create user: ${message}` },
      { status: 500 }
    )
  }
}
