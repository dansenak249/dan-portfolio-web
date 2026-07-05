// Discord bot runtime config endpoint (read + write, both protected)
// ------------------------------------------------------------------
// This is the single source of truth the Discord bot polls for values
// that rotate often — chiefly the VGen session cookie, which expires
// roughly monthly. Instead of editing the bot source and redeploying,
// the owner pastes a fresh cookie here and the bot picks it up on its
// next poll.
//
// GET  -> returns the full config (INCLUDING the cookie), so it MUST be
//         authenticated. The bot sends `Authorization: Bearer <secret>`.
// PUT  -> merges the provided fields into the stored config. Same auth.
//
// Auth uses BOT_CONFIG_SECRET (a dedicated secret shared with the bot)
// via a timing-safe Bearer comparison. The stored cookie is a live
// credential, which is exactly why the read side is locked down too —
// nothing here is public.
//
// Storage mirrors the timeline jobs route: Upstash Redis in production
// (auto-injected KV_REST_API_* vars), a bundled JSON file as the local
// dev fallback so contributors need zero infra.

import { promises as fs } from 'fs'
import path from 'path'
import { Redis } from '@upstash/redis'
import { timingSafeEqual } from 'crypto'
import { NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 0

const KV_KEY = 'bot:config'
const SEED_FILE = path.join(process.cwd(), 'data', 'bot', 'config.json')

// Fields the bot understands. Anything else in the body is ignored so a
// malformed or malicious PUT cannot inject arbitrary keys into storage.
const STRING_FIELDS = ['vgenCookie', 'vgenChannelId', 'reminderChannelId']
const MAX_COOKIE_LENGTH = 8192

const HAS_KV = Boolean(
  process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN
)
const redis = HAS_KV
  ? new Redis({
      url: process.env.KV_REST_API_URL,
      token: process.env.KV_REST_API_TOKEN,
    })
  : null

function isAuthorized(request) {
  const secret = process.env.BOT_CONFIG_SECRET
  if (!secret) return false
  const header = request.headers.get('authorization') || ''
  const token = header.startsWith('Bearer ') ? header.slice(7) : header
  const a = Buffer.from(token)
  const b = Buffer.from(secret)
  // timingSafeEqual requires equal-length buffers.
  if (a.length !== b.length) return false
  return timingSafeEqual(a, b)
}

function defaultConfig() {
  return {
    vgenCookie: '',
    vgenChannelId: '',
    reminderChannelId: '',
    timelineTzOffset: 7,
    updatedAt: null,
  }
}

// Coerce whatever is stored/incoming into a well-formed config object.
// Unknown keys are dropped; types are normalized so the bot can trust
// the shape without re-validating every field.
function normalizeConfig(input) {
  const base = defaultConfig()
  if (!input || typeof input !== 'object') return base
  for (const key of STRING_FIELDS) {
    if (typeof input[key] === 'string') base[key] = input[key].trim()
  }
  const offset = Number(input.timelineTzOffset)
  if (Number.isFinite(offset) && offset >= -12 && offset <= 14) {
    base.timelineTzOffset = offset
  }
  if (typeof input.updatedAt === 'string') base.updatedAt = input.updatedAt
  return base
}

async function readSeedFile() {
  try {
    const raw = await fs.readFile(SEED_FILE, 'utf-8')
    return normalizeConfig(JSON.parse(raw))
  } catch {
    // Missing/corrupt seed file: fall back to defaults rather than 500.
    return defaultConfig()
  }
}

async function writeSeedFile(config) {
  await fs.mkdir(path.dirname(SEED_FILE), { recursive: true })
  await fs.writeFile(SEED_FILE, JSON.stringify(config, null, 2), 'utf-8')
}

async function readFromKv() {
  const stored = await redis.get(KV_KEY)
  if (!stored) return null
  const parsed = typeof stored === 'string' ? JSON.parse(stored) : stored
  return normalizeConfig(parsed)
}

async function writeToKv(config) {
  await redis.set(KV_KEY, JSON.stringify(config))
}

async function readConfig() {
  if (HAS_KV) {
    const fromKv = await readFromKv()
    if (fromKv) return fromKv
    // First boot: KV empty — seed from the bundled JSON file once.
    const seed = await readSeedFile()
    await writeToKv(seed)
    return seed
  }
  return await readSeedFile()
}

async function writeConfig(config) {
  if (HAS_KV) {
    await writeToKv(config)
  } else {
    await writeSeedFile(config)
  }
}

export async function GET(request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  try {
    const config = await readConfig()
    return NextResponse.json(config, {
      headers: { 'Cache-Control': 'no-store' },
    })
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Unknown read error'
    return NextResponse.json(
      { error: `Failed to load config: ${message}` },
      { status: 500 }
    )
  }
}

export async function PUT(request) {
  if (!isAuthorized(request)) {
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

  if (typeof body?.vgenCookie === 'string' && body.vgenCookie.length > MAX_COOKIE_LENGTH) {
    return NextResponse.json(
      { error: `vgenCookie exceeds ${MAX_COOKIE_LENGTH} characters` },
      { status: 400 }
    )
  }

  try {
    // Merge onto the existing config so a partial PUT (e.g. cookie only)
    // does not wipe the other fields.
    const current = await readConfig()
    const merged = normalizeConfig({ ...current, ...body })
    merged.updatedAt = new Date().toISOString()
    await writeConfig(merged)
    return NextResponse.json(merged, {
      headers: { 'Cache-Control': 'no-store' },
    })
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Unknown write error'
    return NextResponse.json(
      { error: `Failed to save config: ${message}` },
      { status: 500 }
    )
  }
}
