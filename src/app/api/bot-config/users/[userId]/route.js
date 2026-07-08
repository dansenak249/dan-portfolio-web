// Management of a single user (rename / password / secret / delete)
// ------------------------------------------------------------------
// PATCH is allowed for the ADMIN (any user, all fields) OR a MEMBER editing
// their OWN record (password + displayName only -- username, secret rotation and
// deletion stay admin-only). DELETE stays MASTER-only. The owner user cannot be
// deleted. A member is identified by their poller secret; the target userId must
// match their own, so a member can never touch another user's identity.

import { NextResponse } from 'next/server'
import {
  isAdminRequest,
  resolvePoller,
  getUser,
  putUser,
  deleteUser,
  findByUsername,
  generatePollerSecret,
} from '@/lib/botConfig/store.js'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 0

const NO_STORE = { 'Cache-Control': 'no-store' }
const MAX_FIELD = 256

export async function PATCH(request, { params }) {
  const { userId } = await params

  // Admin may edit any user + all fields. A member may edit ONLY their own
  // record, and only the self-service fields (password + displayName); the
  // admin-only branches below (username, secret rotation) are gated on `isAdmin`.
  const isAdmin = await isAdminRequest(request)
  if (!isAdmin) {
    const poller = await resolvePoller(request)
    if (!poller || poller.userId !== userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
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

  try {
    const current = await getUser(userId)
    if (!current) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const next = { ...current }

    // Username changes are admin-only (members' username is locked in the UI).
    if (isAdmin && typeof body?.username === 'string') {
      const username = body.username.trim()
      if (!username) {
        return NextResponse.json(
          { error: 'username cannot be empty' },
          { status: 400 }
        )
      }
      if (username.length > MAX_FIELD) {
        return NextResponse.json(
          { error: `username must be <= ${MAX_FIELD} characters` },
          { status: 400 }
        )
      }
      if (username !== current.username) {
        const clash = await findByUsername(username)
        if (clash && clash.userId !== userId) {
          return NextResponse.json(
            { error: `username "${username}" is already taken` },
            { status: 409 }
          )
        }
      }
      next.username = username
    }

    if (typeof body?.password === 'string') {
      if (!body.password) {
        return NextResponse.json(
          { error: 'password cannot be empty' },
          { status: 400 }
        )
      }
      if (body.password.length > MAX_FIELD) {
        return NextResponse.json(
          { error: `password must be <= ${MAX_FIELD} characters` },
          { status: 400 }
        )
      }
      next.password = body.password
    }

    if (typeof body?.displayName === 'string') {
      next.displayName = body.displayName.trim().slice(0, MAX_FIELD)
    }

    // Rotating the secret invalidates the member's current .env: they must
    // re-enroll (re-run the installer) to pick up the new one. Admin-only.
    if (isAdmin && body?.regenerateSecret === true) {
      next.pollerSecret = generatePollerSecret()
    }

    next.updatedAt = new Date().toISOString()
    const saved = await putUser(userId, next)
    return NextResponse.json(saved, { headers: NO_STORE })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown write error'
    return NextResponse.json(
      { error: `Failed to update user: ${message}` },
      { status: 500 }
    )
  }
}

export async function DELETE(request, { params }) {
  if (!(await isAdminRequest(request))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { userId } = await params

  try {
    const current = await getUser(userId)
    if (!current) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }
    await deleteUser(userId)
    return NextResponse.json({ ok: true, userId }, { headers: NO_STORE })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown delete error'
    return NextResponse.json(
      { error: `Failed to delete user: ${message}` },
      { status: 400 }
    )
  }
}
