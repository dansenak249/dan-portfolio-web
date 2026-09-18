// One read token (rename / replace / regenerate / revoke)
// ---------------------------------------------------------------------------
// PATCH { name?, value?, regenerate? } -> { token, tokens }
// DELETE                               -> { ok, tokens }
//
// ADMIN ONLY, like the collection route. Changing a value or deleting a row
// revokes the old credential immediately -- there is no grace period, because
// the only reason to touch either is that the old value should stop working.

import { NextResponse } from 'next/server'
import { isAdminRequest } from '@/lib/botConfig/store.js'
import { updateToken, deleteToken } from '@/lib/botConfig/tokenStore.js'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 0

const NO_STORE = { 'Cache-Control': 'no-store' }

function unauthorized() {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: NO_STORE })
}

export async function PATCH(request, { params }) {
  if (!(await isAdminRequest(request))) return unauthorized()
  const { tokenId } = await params

  let body
  try {
    body = await request.json()
  } catch {
    return NextResponse.json(
      { error: 'Invalid JSON body' },
      { status: 400, headers: NO_STORE }
    )
  }

  try {
    const { row, tokens } = await updateToken(tokenId, {
      name: body?.name,
      value: body?.value,
      regenerate: body?.regenerate === true,
    })
    return NextResponse.json({ token: row, tokens }, { headers: NO_STORE })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    const status = message === 'Token not found' ? 404 : 400
    return NextResponse.json({ error: message }, { status, headers: NO_STORE })
  }
}

export async function DELETE(request, { params }) {
  if (!(await isAdminRequest(request))) return unauthorized()
  const { tokenId } = await params

  try {
    const tokens = await deleteToken(tokenId)
    return NextResponse.json({ ok: true, tokens }, { headers: NO_STORE })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    const status = message === 'Token not found' ? 404 : 500
    return NextResponse.json({ error: message }, { status, headers: NO_STORE })
  }
}
