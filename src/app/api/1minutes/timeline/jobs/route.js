import { promises as fs } from 'fs'
import path from 'path'
import { Redis } from '@upstash/redis'
import { NextResponse } from 'next/server'

// Storage strategy
// ----------------
// Production (Vercel) uses Upstash Redis via @upstash/redis. Reads and
// writes are strongly consistent and sub-millisecond, which removes the
// 10-15s read-after-write delay we hit with Vercel Blob's CDN.
//
// We read the connection from `KV_REST_API_URL` / `KV_REST_API_TOKEN`,
// which Vercel auto-injects when an Upstash store is linked to the
// project — no extra dashboard config needed. Locally, pull them with
// `vercel env pull .env.local` (or paste the dashboard values into
// `.env.local` by hand).
//
// Local dev without those env vars keeps writing to the bundled JSON
// seed file so contributors can run the app with zero infra setup.
//
// On first prod boot Redis is empty, so we seed it from the bundled
// JSON file once. All subsequent reads/writes go through Redis only.

const KV_KEY = 'timeline:jobs'
const SEED_FILE = path.join(
  process.cwd(),
  'data',
  '1minutes',
  'timeline',
  'jobs.json'
)

const HAS_KV = Boolean(
  process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN
)
// Instantiate once at module scope — Next.js keeps the route handler
// warm between requests on the same instance, so we avoid re-creating
// the HTTP client on every call. Using the explicit constructor so we
// can read directly from Vercel's auto-injected `KV_REST_API_*` vars,
// skipping the `UPSTASH_REDIS_REST_*` aliases entirely.
const redis = HAS_KV
  ? new Redis({
      url: process.env.KV_REST_API_URL,
      token: process.env.KV_REST_API_TOKEN,
    })
  : null

export const dynamic = 'force-dynamic'
export const revalidate = 0

function validatePayload(payload) {
  if (!payload || !Array.isArray(payload.jobs)) {
    throw new Error('Malformed payload: missing jobs array')
  }
  return payload
}

async function readSeedFile() {
  const raw = await fs.readFile(SEED_FILE, 'utf-8')
  return validatePayload(JSON.parse(raw))
}

async function writeSeedFile(payload) {
  await fs.writeFile(SEED_FILE, JSON.stringify(payload, null, 2), 'utf-8')
}

async function readFromKv() {
  // Upstash auto-parses JSON for object values, but if the value was
  // stored as a raw string we handle that branch too — keeps the
  // function tolerant to either write path.
  const stored = await redis.get(KV_KEY)
  if (!stored) return null
  const payload = typeof stored === 'string' ? JSON.parse(stored) : stored
  return validatePayload(payload)
}

async function writeToKv(payload) {
  await redis.set(KV_KEY, JSON.stringify(payload))
}

async function readPayload() {
  if (HAS_KV) {
    const fromKv = await readFromKv()
    if (fromKv) return fromKv
    // First boot: KV empty — seed it from the bundled JSON file so the
    // very next read already comes from the consistent store.
    const seed = await readSeedFile()
    await writeToKv(seed)
    return seed
  }
  // Local dev fallback: no KV configured, persist to the seed file.
  return await readSeedFile()
}

async function writePayload(payload) {
  if (HAS_KV) {
    await writeToKv(payload)
  } else {
    await writeSeedFile(payload)
  }
}

export async function GET() {
  try {
    const payload = await readPayload()
    return NextResponse.json(payload, {
      headers: { 'Cache-Control': 'no-store' },
    })
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Unknown read error'
    return NextResponse.json(
      { error: `Failed to load jobs: ${message}` },
      { status: 500 }
    )
  }
}

export async function PUT(request) {
  let body
  try {
    body = await request.json()
  } catch {
    return NextResponse.json(
      { error: 'Invalid JSON in request body' },
      { status: 400 }
    )
  }

  if (!body || !Array.isArray(body.jobs)) {
    return NextResponse.json(
      { error: 'Request body must include a `jobs` array' },
      { status: 400 }
    )
  }

  const payload = {
    jobs: body.jobs,
    updatedAt: new Date().toISOString(),
  }

  try {
    await writePayload(payload)
    return NextResponse.json(payload, {
      headers: { 'Cache-Control': 'no-store' },
    })
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Unknown write error'
    return NextResponse.json(
      { error: `Failed to save jobs: ${message}` },
      { status: 500 }
    )
  }
}
