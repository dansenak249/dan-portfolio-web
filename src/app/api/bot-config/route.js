// Discord bot runtime config endpoint (read + write, per user)
// ------------------------------------------------------------------
// Source of truth for the values the bot polls (chiefly the VGen cookie,
// which rotates ~monthly). Now scoped per team member: each user has their
// own config record and their poller authenticates with a per-user secret.
//
// Auth (two tiers, see src/lib/botConfig/store.js):
//   - MASTER (BOT_CONFIG_SECRET): may read/write ANY user via ?userId=<id>.
//     Omitting userId targets the migrated owner, so the legacy bot + web form
//     keep working until they become user-aware (Phases 2/3).
//   - POLLER (per-user pollerSecret): scoped to its own user (derived from the
//     secret, never the query). May only write a small allowlist and never
//     sees the human password.

import { NextResponse } from 'next/server'
import {
  POLLER_WRITABLE,
  getUser,
  putUser,
  normalizeConfig,
  validateWrite,
  redactForPoller,
  authorize,
} from '@/lib/botConfig/store.js'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 0

// Functional fields an admin may edit here. Identity/auth (username, password,
// pollerSecret) is managed via /api/bot-config/users to keep concerns separate.
const ADMIN_WRITABLE = [
  'vgenCookie',
  'reminderChannelId',
  'vgenChatUserId',
  'vgenChatToken',
  'vgenAccountHandle',
  'timelineTimezone',
  'userMappings',
]

const NO_STORE = { 'Cache-Control': 'no-store' }

// Keep only the keys the caller's role is allowed to write.
function pickWritable(body, allowed) {
  const out = {}
  for (const key of allowed) {
    if (Object.prototype.hasOwnProperty.call(body, key)) out[key] = body[key]
  }
  return out
}

export async function GET(request) {
  const auth = await authorize(request)
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  try {
    const config = await getUser(auth.userId)
    if (!config) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }
    const payload = auth.mode === 'member' ? redactForPoller(config) : config
    return NextResponse.json(payload, { headers: NO_STORE })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown read error'
    return NextResponse.json(
      { error: `Failed to load config: ${message}` },
      { status: 500 }
    )
  }
}

export async function PUT(request) {
  const auth = await authorize(request)
  if (!auth) {
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

  const lengthError = validateWrite(body)
  if (lengthError) {
    return NextResponse.json({ error: lengthError }, { status: 400 })
  }

  try {
    const current = await getUser(auth.userId)
    if (!current) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const allowed = auth.mode === 'member' ? POLLER_WRITABLE : ADMIN_WRITABLE
    const changes = pickWritable(body || {}, allowed)
    const merged = normalizeConfig({ ...current, ...changes }, auth.userId)
    const now = new Date().toISOString()

    // COOKIE light: stamp only when a real (non-empty) cookie is pushed.
    if (typeof changes.vgenCookie === 'string' && changes.vgenCookie.trim()) {
      merged.vgenCookieUpdatedAt = now
    }

    // POLLER light: stamp each heartbeat ping (allowed for pollers only).
    const isHeartbeat = typeof body?.pollerHeartbeatAt !== 'undefined'
    if (isHeartbeat && allowed.includes('pollerHeartbeatAt')) {
      merged.pollerHeartbeatAt = now
    }

    // Bump updatedAt only for real config edits, not bare heartbeats.
    const hasConfigEdit = Object.keys(changes).some((k) => k !== 'pollerHeartbeatAt')
    if (hasConfigEdit) merged.updatedAt = now

    const saved = await putUser(auth.userId, merged)
    const payload = auth.mode === 'member' ? redactForPoller(saved) : saved
    return NextResponse.json(payload, { headers: NO_STORE })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown write error'
    return NextResponse.json(
      { error: `Failed to save config: ${message}` },
      { status: 500 }
    )
  }
}
