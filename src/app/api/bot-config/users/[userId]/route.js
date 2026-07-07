// Admin management of a single user (rename / password / secret / delete)
// ------------------------------------------------------------------
// MASTER-only. Supports flow A operations the admin needs: change the
// human-facing username/password, rotate the machine pollerSecret, or remove a
// member entirely. The owner user cannot be deleted.

import { NextResponse } from 'next/server'
import {
  isAdminRequest,
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
  if (!(await isAdminRequest(request))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { userId } = await params

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

    if (typeof body?.username === 'string') {
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
    // re-enroll (re-run the installer) to pick up the new one.
    if (body?.regenerateSecret === true) {
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
