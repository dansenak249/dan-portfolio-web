// Multi-user bot config store
// ---------------------------------------------------------------------------
// Central storage + auth for the Discord bot's runtime config, now scoped per
// team member. Each member (user) has their own config record holding a live
// VGen cookie plus routing/settings. Every member runs their OWN poller on
// their OWN machine (same IP as their browser) which authenticates with a
// per-user `pollerSecret`. The owner/admin authenticates with the master
// `BOT_CONFIG_SECRET` and can see/manage every user.
//
// Auth model (two tiers):
//   - MASTER  : env BOT_CONFIG_SECRET. Full access to every user + management.
//   - POLLER  : per-user pollerSecret (Authorization: Bearer <secret>). Scoped
//               to that user only; can read its own config and write a small
//               allowlist (rotated cookie, chat token/user id, heartbeat).
//
// Human-friendly layer: members never see the raw secret. They enroll with a
// username + password (admin-assigned, flow A) via /api/poller/enroll, which
// verifies the password and hands back the durable pollerSecret for their .env.
// The password is a low-stakes convenience credential (admin-viewable by
// design); the real security boundary is pollerSecret + master secret.
//
// Storage mirrors the rest of the app: Upstash Redis in production, a bundled
// JSON file for local dev. In KV mode each user is its own key so concurrent
// poller heartbeats never clobber each other.

import { promises as fs } from 'fs'
import path from 'path'
import { Redis } from '@upstash/redis'
import { randomBytes, timingSafeEqual } from 'crypto'

const USERS_KEY = 'bot:users' // JSON array of userIds (registry)
const configKey = (userId) => `bot:config:${userId}`
const LEGACY_KEY = 'bot:config' // pre-multi-user single blob (migrated once)
const SEED_FILE = path.join(process.cwd(), 'data', 'bot', 'config.json')

// Stable id for the migrated owner so the existing bot/web form keep resolving
// to a real user until Phases 2/3 make them user-aware.
export const OWNER_USER_ID = 'owner'

// Functional config fields the bot reads (unchanged from single-user era).
const STRING_FIELDS = [
  'vgenCookie',
  'reminderChannelId',
  'vgenChatUserId',
  'vgenChatToken',
  'vgenAccountHandle',
]
// Identity/auth fields layered on top for multi-user.
const IDENTITY_FIELDS = ['username', 'password', 'displayName', 'pollerSecret']
// Role gates which UI/permissions a user gets. `admin` == master-level (manages
// every user); `member` is scoped to their own cookie/token via their poller
// secret. The migrated owner is the admin.
const ROLES = ['admin', 'member']

const MAX_COOKIE_LENGTH = 8192
const MAX_CHAT_TOKEN_LENGTH = 8192
const MAX_IDENTITY_LENGTH = 256
const DEFAULT_TIMEZONE = 'Asia/Ho_Chi_Minh'
const MAX_MAPPINGS = 100
const MAX_MAPPING_ID_LENGTH = 128

// Fields a POLLER may write to its own record. Everything else is admin-only so
// a member's machine cannot rewrite its identity, routing, or another user.
export const POLLER_WRITABLE = [
  'vgenCookie',
  'vgenChatUserId',
  'vgenChatToken',
  'pollerHeartbeatAt',
]

const HAS_KV = Boolean(
  process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN
)
const redis = HAS_KV
  ? new Redis({
      url: process.env.KV_REST_API_URL,
      token: process.env.KV_REST_API_TOKEN,
    })
  : null

// --- id / secret generation ------------------------------------------------

export function generateUserId() {
  return `usr_${randomBytes(6).toString('hex')}`
}

export function generatePollerSecret() {
  return randomBytes(32).toString('hex')
}

// --- normalization ---------------------------------------------------------

function isValidTimezone(tz) {
  if (typeof tz !== 'string' || !tz) return false
  try {
    Intl.DateTimeFormat('en-US', { timeZone: tz })
    return true
  } catch {
    return false
  }
}

function normalizeMappings(input) {
  if (!Array.isArray(input)) return []
  const rows = []
  for (const item of input) {
    if (!item || typeof item !== 'object') continue
    const name =
      typeof item.name === 'string'
        ? item.name.trim().slice(0, MAX_MAPPING_ID_LENGTH)
        : ''
    const discordId =
      typeof item.discordId === 'string'
        ? item.discordId.trim().slice(0, MAX_MAPPING_ID_LENGTH)
        : ''
    const vgenId =
      typeof item.vgenId === 'string'
        ? item.vgenId.trim().slice(0, MAX_MAPPING_ID_LENGTH)
        : ''
    if (!name && !discordId && !vgenId) continue
    rows.push({
      name,
      discordId,
      vgenId,
      like: Boolean(item.like),
      follow: Boolean(item.follow),
      message: Boolean(item.message),
    })
    if (rows.length >= MAX_MAPPINGS) break
  }
  return rows
}

export function defaultConfig(userId) {
  return {
    userId: userId || '',
    username: '',
    password: '',
    displayName: '',
    role: 'member',
    pollerSecret: '',
    vgenCookie: '',
    reminderChannelId: '',
    vgenChatUserId: '',
    vgenChatToken: '',
    vgenAccountHandle: '',
    timelineTimezone: DEFAULT_TIMEZONE,
    userMappings: [],
    createdAt: null,
    updatedAt: null,
    // Independent freshness stamps for the two status lights on the web form.
    vgenCookieUpdatedAt: null,
    pollerHeartbeatAt: null,
  }
}

// Coerce a stored/incoming record into a well-formed config. Unknown keys are
// dropped; the userId is authoritative from the caller, never the payload.
export function normalizeConfig(input, userId) {
  const base = defaultConfig(userId)
  if (!input || typeof input !== 'object') return base
  for (const key of STRING_FIELDS) {
    if (typeof input[key] === 'string') base[key] = input[key].trim()
  }
  for (const key of IDENTITY_FIELDS) {
    if (typeof input[key] === 'string') {
      base[key] = input[key].trim().slice(0, MAX_IDENTITY_LENGTH)
    }
  }
  if (ROLES.includes(input.role)) base.role = input.role
  if (isValidTimezone(input.timelineTimezone)) {
    base.timelineTimezone = input.timelineTimezone
  }
  if (input.userMappings !== undefined) {
    base.userMappings = normalizeMappings(input.userMappings)
  }
  for (const key of ['createdAt', 'updatedAt', 'vgenCookieUpdatedAt', 'pollerHeartbeatAt']) {
    if (typeof input[key] === 'string') base[key] = input[key]
  }
  if (userId) base.userId = userId
  return base
}

// Field length guards shared by the write paths. Returns an error string or null.
export function validateWrite(body) {
  if (typeof body?.vgenCookie === 'string' && body.vgenCookie.length > MAX_COOKIE_LENGTH) {
    return `vgenCookie exceeds ${MAX_COOKIE_LENGTH} characters`
  }
  if (typeof body?.vgenChatToken === 'string' && body.vgenChatToken.length > MAX_CHAT_TOKEN_LENGTH) {
    return `vgenChatToken exceeds ${MAX_CHAT_TOKEN_LENGTH} characters`
  }
  return null
}

// Strip credentials the caller should not receive. Pollers never need the
// human password; keep the functional fields plus their own secret intact.
export function redactForPoller(config) {
  const { password, ...rest } = config
  return rest
}

// --- low-level storage (KV or file) ----------------------------------------

async function readSeedMap() {
  try {
    const raw = await fs.readFile(SEED_FILE, 'utf-8')
    const parsed = JSON.parse(raw)
    if (parsed && typeof parsed === 'object' && parsed.users && typeof parsed.users === 'object') {
      return parsed // already multi-user shape
    }
    // Legacy flat shape: wrap as the owner user.
    return { users: { [OWNER_USER_ID]: normalizeConfig(parsed, OWNER_USER_ID) } }
  } catch {
    return { users: {} }
  }
}

async function writeSeedMap(map) {
  await fs.mkdir(path.dirname(SEED_FILE), { recursive: true })
  await fs.writeFile(SEED_FILE, JSON.stringify(map, null, 2), 'utf-8')
}

async function kvGetJson(key) {
  const stored = await redis.get(key)
  if (stored === null || stored === undefined) return null
  return typeof stored === 'string' ? JSON.parse(stored) : stored
}

async function kvSetJson(key, value) {
  await redis.set(key, JSON.stringify(value))
}

// --- registry + per-user access --------------------------------------------

async function listUserIds() {
  await ensureMigrated()
  if (HAS_KV) {
    const ids = await kvGetJson(USERS_KEY)
    return Array.isArray(ids) ? ids : []
  }
  const map = await readSeedMap()
  return Object.keys(map.users)
}

export async function getUser(userId) {
  if (!userId) return null
  await ensureMigrated()
  if (HAS_KV) {
    const raw = await kvGetJson(configKey(userId))
    return raw ? normalizeConfig(raw, userId) : null
  }
  const map = await readSeedMap()
  const raw = map.users[userId]
  return raw ? normalizeConfig(raw, userId) : null
}

export async function putUser(userId, config) {
  const normalized = normalizeConfig(config, userId)
  if (HAS_KV) {
    await kvSetJson(configKey(userId), normalized)
    const ids = (await kvGetJson(USERS_KEY)) || []
    if (!ids.includes(userId)) await kvSetJson(USERS_KEY, [...ids, userId])
  } else {
    const map = await readSeedMap()
    map.users[userId] = normalized
    await writeSeedMap(map)
  }
  return normalized
}

export async function deleteUser(userId) {
  if (userId === OWNER_USER_ID) throw new Error('Cannot delete the owner user')
  if (HAS_KV) {
    await redis.del(configKey(userId))
    const ids = (await kvGetJson(USERS_KEY)) || []
    await kvSetJson(USERS_KEY, ids.filter((id) => id !== userId))
  } else {
    const map = await readSeedMap()
    delete map.users[userId]
    await writeSeedMap(map)
  }
}

export async function listUsers() {
  const ids = await listUserIds()
  const users = await Promise.all(ids.map((id) => getUser(id)))
  return users.filter(Boolean)
}

// --- migration (run lazily, exactly once) ----------------------------------

let migrated = false

async function ensureMigrated() {
  if (migrated) return
  if (HAS_KV) {
    const ids = await kvGetJson(USERS_KEY)
    if (Array.isArray(ids) && ids.length > 0) {
      migrated = true
      return
    }
    const legacy = await kvGetJson(LEGACY_KEY)
    const ownerConfig = buildOwner(legacy)
    await kvSetJson(configKey(OWNER_USER_ID), ownerConfig)
    await kvSetJson(USERS_KEY, [OWNER_USER_ID])
  } else {
    const map = await readSeedMap()
    if (Object.keys(map.users).length === 0) {
      map.users[OWNER_USER_ID] = buildOwner(null)
      await writeSeedMap(map)
    }
  }
  migrated = true
}

// Seed the owner record from a legacy single-user blob (or defaults). The owner
// keeps their existing cookie and is the admin. Bootstrap credentials are set
// so the owner can log in to the web UI immediately (change the password there).
function buildOwner(legacy) {
  const owner = normalizeConfig(legacy || {}, OWNER_USER_ID)
  owner.username = 'dansenak249'
  owner.password = 'admin123'
  owner.role = 'admin'
  owner.displayName = owner.displayName || 'Dan'
  if (!owner.pollerSecret) owner.pollerSecret = generatePollerSecret()
  if (!owner.createdAt) owner.createdAt = new Date().toISOString()
  return owner
}

// --- auth ------------------------------------------------------------------

function bearer(request) {
  const header = request.headers.get('authorization') || ''
  return header.startsWith('Bearer ') ? header.slice(7) : header
}

// Constant-time string compare that tolerates unequal lengths.
export function safeEqual(a, b) {
  const bufA = Buffer.from(String(a || ''))
  const bufB = Buffer.from(String(b || ''))
  if (bufA.length !== bufB.length) return false
  return timingSafeEqual(bufA, bufB)
}

export function isMaster(request) {
  const secret = process.env.BOT_CONFIG_SECRET
  if (!secret) return false
  return safeEqual(bearer(request), secret)
}

// Resolve which user a POLLER bearer belongs to. Scope is derived from the
// secret itself, never a query param, so a poller cannot read another user.
export async function resolvePoller(request) {
  const token = bearer(request)
  if (!token) return null
  const users = await listUsers()
  for (const user of users) {
    if (user.pollerSecret && safeEqual(token, user.pollerSecret)) return user
  }
  return null
}

export async function findByUsername(username) {
  const target = (username || '').trim()
  if (!target) return null
  const users = await listUsers()
  return users.find((u) => u.username === target) || null
}

// Verify a username + password pair in constant time. Returns the user on
// success, null otherwise. Missing user still runs a compare against a dummy so
// timing does not reveal whether the username exists. Shared by /login + enroll.
export async function verifyCredentials(username, password) {
  const user = await findByUsername(username)
  const stored = user ? user.password : ''
  const ok = Boolean(user) && safeEqual(password, stored)
  return ok ? user : null
}

// True when the request carries admin authority: either the env master secret
// or a user whose role is `admin` (authenticated via their poller secret).
export async function isAdminRequest(request) {
  if (isMaster(request)) return true
  const user = await resolvePoller(request)
  return Boolean(user && user.role === 'admin')
}

// Resolve the caller's effective scope for the config route.
//   { mode: 'admin',  userId }         -> may target any user via ?userId=
//   { mode: 'member', userId, user }   -> locked to their own record
//   null                               -> unauthorized
// Scope is derived from the credential, never a spoofable query param.
export async function authorize(request) {
  if (isMaster(request)) {
    const url = new URL(request.url)
    return { mode: 'admin', userId: url.searchParams.get('userId') || OWNER_USER_ID }
  }
  const user = await resolvePoller(request)
  if (!user) return null
  if (user.role === 'admin') {
    const url = new URL(request.url)
    return { mode: 'admin', userId: url.searchParams.get('userId') || user.userId, user }
  }
  return { mode: 'member', userId: user.userId, user }
}
