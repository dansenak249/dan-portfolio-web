import { promises as fs } from 'fs'
import path from 'path'
import { list, put } from '@vercel/blob'
import { NextResponse } from 'next/server'

// Storage strategy
// ----------------
// Production (Vercel) uses Vercel Blob because the serverless filesystem
// is read-only (EROFS on /var/task). Local dev keeps writing to the
// bundled JSON file so contributors can run without provisioning Blob.
//
// Selection is driven by the presence of BLOB_READ_WRITE_TOKEN, which
// Vercel auto-injects when a Blob store is linked to the project. To
// use Blob locally too, run `vercel env pull .env.local` after linking.
//
// On first prod boot the Blob is empty, so we fall back to the bundled
// JSON file as a seed. The first PUT after that materializes the Blob
// and all subsequent reads come from there.

const BLOB_PATHNAME = '1minutes/timeline/jobs.json'
const SEED_FILE = path.join(
  process.cwd(),
  'data',
  '1minutes',
  'timeline',
  'jobs.json'
)
const HAS_BLOB = Boolean(process.env.BLOB_READ_WRITE_TOKEN)

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

async function readFromBlob() {
  const { blobs } = await list({ prefix: BLOB_PATHNAME })
  const match = blobs.find((b) => b.pathname === BLOB_PATHNAME)
  if (!match) return null
  // Cache-bust the CDN edge so a fresh PUT is visible immediately.
  const res = await fetch(`${match.url}?t=${Date.now()}`, {
    cache: 'no-store',
  })
  if (!res.ok) {
    throw new Error(`Blob fetch failed: HTTP ${res.status}`)
  }
  return validatePayload(await res.json())
}

async function writeToBlob(payload) {
  await put(BLOB_PATHNAME, JSON.stringify(payload, null, 2), {
    access: 'public',
    addRandomSuffix: false,
    allowOverwrite: true,
    contentType: 'application/json',
  })
}

async function readPayload() {
  if (HAS_BLOB) {
    const fromBlob = await readFromBlob()
    if (fromBlob) return fromBlob
  }
  // Blob empty (first run) or local dev — use the bundled seed file.
  return await readSeedFile()
}

async function writePayload(payload) {
  if (HAS_BLOB) {
    await writeToBlob(payload)
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
