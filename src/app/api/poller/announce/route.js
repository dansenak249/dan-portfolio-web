// Poller announce: post a pre-built line to the member's Discord channel
// ------------------------------------------------------------------
// A team member's standalone VGen poller sends the FINAL, already-formatted
// notification text here (mentions resolved bot-side from their userMappings),
// and the SERVER posts it to Discord. This keeps the shared bot token on the
// server only -- a member's machine holds nothing but their own pollerSecret,
// userId and the web base URL. The channel is resolved from that member's own
// config record (reminderChannelId), falling back to the server's env default.
//
// Auth: the caller must present a valid credential -- either the master
// BOT_CONFIG_SECRET or a per-user pollerSecret (both handled by authorize()).
// Scope is derived from the credential, never a spoofable query param.

import { NextResponse } from 'next/server'
import { authorize, getUser } from '@/lib/botConfig/store.js'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 0

const NO_STORE = { 'Cache-Control': 'no-store' }
const DISCORD_API = 'https://discord.com/api/v10'
// Discord hard-caps a message at 2000 characters; reject early with a clear
// error instead of letting the Discord API bounce it.
const MAX_CONTENT = 2000

export async function POST(request) {
  const auth = await authorize(request)
  if (!auth) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401, headers: NO_STORE }
    )
  }

  let body
  try {
    body = await request.json()
  } catch {
    return NextResponse.json(
      { error: 'Invalid JSON in request body' },
      { status: 400, headers: NO_STORE }
    )
  }

  const content = typeof body?.content === 'string' ? body.content.trim() : ''
  if (!content) {
    return NextResponse.json(
      { error: 'content is required' },
      { status: 400, headers: NO_STORE }
    )
  }
  if (content.length > MAX_CONTENT) {
    return NextResponse.json(
      { error: `content exceeds ${MAX_CONTENT} characters` },
      { status: 400, headers: NO_STORE }
    )
  }

  // Resolve the announcement channel from the caller's own config record, so a
  // member's notifications always route to the channel configured for them.
  // authorize() gives us the user directly for pollers; for the master secret we
  // load the targeted (default: owner) record.
  const user = auth.user || (await getUser(auth.userId))
  const channelId = (
    user?.reminderChannelId ||
    process.env.REMINDER_CHANNEL_ID ||
    ''
  ).trim()
  if (!channelId) {
    return NextResponse.json(
      { error: 'No announcement channel configured' },
      { status: 409, headers: NO_STORE }
    )
  }

  const token = process.env.DISCORD_TOKEN
  if (!token) {
    return NextResponse.json(
      { error: 'Discord token not configured on server' },
      { status: 500, headers: NO_STORE }
    )
  }

  try {
    const res = await fetch(`${DISCORD_API}/channels/${channelId}/messages`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bot ${token}`,
      },
      body: JSON.stringify({ content }),
    })
    if (!res.ok) {
      const detail = await res.text().catch(() => '')
      return NextResponse.json(
        {
          error: `Discord API returned HTTP ${res.status}`,
          detail: detail.slice(0, 500),
        },
        { status: 502, headers: NO_STORE }
      )
    }
    return NextResponse.json({ ok: true }, { headers: NO_STORE })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json(
      { error: `Announce failed: ${message}` },
      { status: 500, headers: NO_STORE }
    )
  }
}
