import { promises as fs } from 'fs'
import path from 'path'
import { NextResponse } from 'next/server'

// File-based JSON persistence for the commissions timeline.
// Row order in the `jobs` array IS the displayed position, so no
// separate position field is needed — drag/reorder simply rewrites
// the array order.
const DATA_FILE = path.join(
  process.cwd(),
  'data',
  '1minutes',
  'timeline',
  'jobs.json'
)

// Disable any Next.js caching for these endpoints — every read should
// reflect the latest file contents.
export const dynamic = 'force-dynamic'
export const revalidate = 0

async function readJobsFile() {
  const raw = await fs.readFile(DATA_FILE, 'utf-8')
  const parsed = JSON.parse(raw)
  if (!parsed || !Array.isArray(parsed.jobs)) {
    throw new Error('Malformed jobs file: missing jobs array')
  }
  return parsed
}

async function writeJobsFile(payload) {
  const body = JSON.stringify(payload, null, 2)
  await fs.writeFile(DATA_FILE, body, 'utf-8')
}

export async function GET() {
  try {
    const payload = await readJobsFile()
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
  } catch (error) {
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
    await writeJobsFile(payload)
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
