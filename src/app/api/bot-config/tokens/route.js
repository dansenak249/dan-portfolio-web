// Read-token management (list / create / reorder)
// ---------------------------------------------------------------------------
// GET  -> { tokens: [...] }
// POST { name?, value? }  -> creates one; a blank value mints a random token
// PUT  { ids: [...] }     -> persists the drag-sorted order
//
// ADMIN ONLY, all three verbs. These tokens grant read access to the whole
// competitor census, so listing them is as sensitive as creating them -- there
// is no "see the names but not the values" tier, because the admin is the only
// person who ever opens this panel.

import { NextResponse } from 'next/server'
import { isAdminRequest } from '@/lib/botConfig/store.js'
import {
  listTokens,
  createToken,
  reorderTokens,
} from '@/lib/botConfig/tokenStore.js'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 0

const NO_STORE = { 'Cache-Control': 'no-store' }

function unauthorized() {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: NO_STORE })
}

export async function GET(request) {
  if (!(await isAdminRequest(request))) return unauthorized()
  try {
    const tokens = await listTokens()
    return NextResponse.json({ tokens }, { headers: NO_STORE })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json(
      { error: `Failed to read tokens: ${message}` },
      { status: 500, headers: NO_STORE }
    )
  }
}

export async function POST(request) {
  if (!(await isAdminRequest(request))) return unauthorized()

  let body = {}
  try {
    body = (await request.json()) || {}
  } catch {
    // Treated as "create with defaults": an empty body is a valid request here.
  }

  try {
    const { row, tokens } = await createToken({ name: body.name, value: body.value })
    return NextResponse.json({ token: row, tokens }, { headers: NO_STORE })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 400, headers: NO_STORE })
  }
}

export async function PUT(request) {
  if (!(await isAdminRequest(request))) return unauthorized()

  let body
  try {
    body = await request.json()
  } catch {
    return NextResponse.json(
      { error: 'Invalid JSON body' },
      { status: 400, headers: NO_STORE }
    )
  }

  if (!Array.isArray(body?.ids)) {
    return NextResponse.json(
      { error: 'ids must be an array of token ids' },
      { status: 400, headers: NO_STORE }
    )
  }

  try {
    const tokens = await reorderTokens(body.ids)
    return NextResponse.json({ tokens }, { headers: NO_STORE })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json(
      { error: `Failed to reorder: ${message}` },
      { status: 500, headers: NO_STORE }
    )
  }
}
