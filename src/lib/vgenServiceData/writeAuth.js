// Write-side auth for the VGen data tools
// ---------------------------------------------------------------------------
// Every route that MUTATES the census used to be open. The reads can stay open
// -- they are a public research view -- but a stranger could previously purge a
// census that takes ~5 days of metered ticks to rebuild. This module is the one
// place that decides who may write, so the eleven routes cannot drift apart.
//
// WHY NOT A DEDICATED SECRET: the project already has accounts. Bot-config
// stores a username + password per team member and hands the browser that
// member's durable `pollerSecret` at /api/bot-config/login. Reusing it means a
// person logs in instead of pasting an env value into a prompt, and revoking
// someone is a user edit rather than a redeploy.
//
// FOUR ACCEPTED CREDENTIALS, cheapest first (this order matters -- the first
// three cost ZERO Redis commands, and the rotation ticks ~12x/hour):
//   1. VGEN_COLLECT_SECRET  -- the rotation/GitHub Action machine token
//   2. VGEN_ADMIN_SECRET    -- the destructive-op token purge-legacy uses
//   3. BOT_CONFIG_SECRET    -- the bot-config env master
//   4. a bot-config user's pollerSecret (what the login dialog returns)
// Only (4) touches Redis, and only for a human clicking a button.
//
// ROLES: a logged-in `member` may run crawls and edit the map. Only an `admin`
// (or a machine token) may PURGE, because a purge is the one action no later
// tick can undo.

import { timingSafeEqual } from 'node:crypto'
import { NextResponse } from 'next/server'
import { isMaster, resolvePoller } from '@/lib/botConfig/store'

const NO_STORE = { 'Cache-Control': 'no-store' }

function bearer(request) {
  const header = request.headers.get('authorization') || ''
  return header.startsWith('Bearer ') ? header.slice(7) : header
}

// Constant-time compare against an env secret. An unset secret never matches,
// so a missing env var fails closed instead of authorising everyone.
function matchesSecret(token, secret) {
  if (!token || !secret) return false
  const a = Buffer.from(token)
  const b = Buffer.from(secret)
  if (a.length !== b.length) return false
  return timingSafeEqual(a, b)
}

/**
 * Identify the caller of a write route.
 *
 * @param {Request} request
 * @returns {Promise<null | {
 *   kind: 'machine' | 'master' | 'user',
 *   role: 'admin' | 'member',
 *   label: string,
 *   userId?: string,
 * }>} null when the credential is missing or unknown
 */
export async function resolveWriter(request) {
  const token = bearer(request)
  if (!token) return null

  if (matchesSecret(token, process.env.VGEN_COLLECT_SECRET)) {
    return { kind: 'machine', role: 'admin', label: 'rotation' }
  }
  if (matchesSecret(token, process.env.VGEN_ADMIN_SECRET)) {
    return { kind: 'machine', role: 'admin', label: 'admin-secret' }
  }
  if (isMaster(request)) {
    return { kind: 'master', role: 'admin', label: 'master' }
  }

  // Last, because this one reads the user registry out of Redis.
  const user = await resolvePoller(request)
  if (!user) return null
  return {
    kind: 'user',
    role: user.role === 'admin' ? 'admin' : 'member',
    label: user.username || user.userId,
    userId: user.userId,
  }
}

/**
 * Guard for a POST handler. Returns `{ writer, response }`: when `response` is
 * non-null the handler must return it untouched and do nothing else.
 *
 * The `code` field is what the dashboard keys on -- `login_required` opens the
 * login dialog, `admin_required` shows a message instead, because retyping the
 * same password would not help.
 *
 * @param {Request} request
 * @param {{ admin?: boolean }} [options] require role `admin` (destructive ops)
 */
export async function requireWriter(request, options = {}) {
  const writer = await resolveWriter(request)

  if (!writer) {
    return {
      writer: null,
      response: NextResponse.json(
        { error: 'Sign in to run this action.', code: 'login_required' },
        { status: 401, headers: NO_STORE }
      ),
    }
  }

  if (options.admin && writer.role !== 'admin') {
    return {
      writer,
      response: NextResponse.json(
        { error: 'This action needs an admin account.', code: 'admin_required' },
        { status: 403, headers: NO_STORE }
      ),
    }
  }

  return { writer, response: null }
}
