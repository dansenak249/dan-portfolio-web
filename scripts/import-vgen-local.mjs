// One-off backfill: import locally-collected VGen snapshots into Upstash Redis
// ---------------------------------------------------------------------------
// Reads the JSON snapshot files gathered on the desktop (collector_*.js output)
// and writes them into the SAME Redis layout the live site uses, then rebuilds
// the compact threshold series from every stored trending snapshot so the
// "Threshold over time" view includes the full history.
//
// Run from the web project root with the env file that holds the KV creds:
//   node --env-file=.env.local scripts/import-vgen-local.mjs [dataDir]
//
// Safe to delete after a successful run. It is additive: it sets new snapshot
// keys and rebuilds the index/threshold lists from the union of existing +
// imported timestamps. Existing server snapshots are preserved.

import { Redis } from '@upstash/redis'
import { readFileSync, readdirSync, existsSync } from 'node:fs'
import { join } from 'node:path'

const NS = 'vgen'
// Mirror store.js per-kind retention (720 = ~30 days at hourly cadence).
const MAX_SNAPSHOTS = { trending: 720, profiles: 720 }
const DEFAULT_MAX_SNAPSHOTS = 720
const CUTS = [10, 20, 50, 100, 200, 300, 500, 1000]
const DATA_DIR =
  process.argv[2] || 'D:/Projects/dan-vgen-trending-research/data'

const url = process.env.KV_REST_API_URL
const token = process.env.KV_REST_API_TOKEN
if (!url || !token) {
  console.error(
    'Missing KV_REST_API_URL / KV_REST_API_TOKEN. Run with: node --env-file=.env.local scripts/import-vgen-local.mjs'
  )
  process.exit(1)
}
const redis = new Redis({ url, token })

const indexKey = (kind) => `${NS}:${kind}:index`
const snapKey = (kind, ts) => `${NS}:${kind}:snap:${ts}`
const THRESHOLD_KEY = `${NS}:threshold:series`

// Upstash may hand back a parsed object or a raw string; tolerate both.
const parseMaybe = (v) =>
  v == null ? null : typeof v === 'string' ? JSON.parse(v) : v

// Read every snapshot file in data/<sub> into a Map<ts, rows>.
function loadLocal(sub) {
  const dir = join(DATA_DIR, sub)
  const map = new Map()
  if (!existsSync(dir)) {
    console.warn(`(skip) no local dir: ${dir}`)
    return map
  }
  for (const f of readdirSync(dir).filter((f) => f.endsWith('.json'))) {
    const payload = JSON.parse(readFileSync(join(dir, f), 'utf8'))
    if (payload && payload.snapshot_ts && Array.isArray(payload.rows)) {
      map.set(payload.snapshot_ts, payload.rows)
    }
  }
  return map
}

function thresholdRecord(rows, ts) {
  const sorted = rows
    .filter((r) => typeof r.searchIndex === 'number')
    .sort((a, b) => a.rank - b.rank)
  if (!sorted.length) return null
  const last = sorted[sorted.length - 1]
  const cuts = {}
  for (const n of CUTS) cuts[n] = sorted[Math.min(n, sorted.length) - 1].searchIndex
  return {
    ts,
    count: sorted.length,
    floor: last.searchIndex,
    floorViews: last.viewCount ?? null,
    topViews: sorted[0].viewCount ?? null,
    cuts,
  }
}

// Merge local snapshots with whatever is already stored, write the new snap
// keys, and rebuild the index in chronological order (newest MAX_SNAPSHOTS).
async function importKind(kind, localMap) {
  const existing = (await redis.lrange(indexKey(kind), 0, -1)) || []
  const existingSet = new Set(existing)

  let added = 0
  for (const [ts, rows] of localMap) {
    if (existingSet.has(ts)) continue // never overwrite a stored snapshot
    await redis.set(snapKey(kind, ts), JSON.stringify(rows))
    added++
  }

  const cap = MAX_SNAPSHOTS[kind] ?? DEFAULT_MAX_SNAPSHOTS
  let all = [...new Set([...existing, ...localMap.keys()])].sort()
  let dropped = []
  if (all.length > cap) {
    dropped = all.slice(0, all.length - cap)
    all = all.slice(all.length - cap)
  }

  await redis.del(indexKey(kind))
  if (all.length) await redis.rpush(indexKey(kind), ...all)
  for (const ts of dropped) await redis.del(snapKey(kind, ts))

  console.log(
    `[${kind}] local=${localMap.size} added=${added} existing=${existing.length} kept=${all.length} dropped=${dropped.length}`
  )
  return all
}

// Rebuild the threshold series from every kept trending snapshot.
async function rebuildThreshold(trendingTs) {
  const records = []
  for (const ts of trendingTs) {
    const rows = parseMaybe(await redis.get(snapKey('trending', ts)))
    if (Array.isArray(rows)) {
      const rec = thresholdRecord(rows, ts)
      if (rec) records.push(rec)
    }
  }
  await redis.del(THRESHOLD_KEY)
  for (let i = 0; i < records.length; i += 100) {
    const chunk = records.slice(i, i + 100).map((r) => JSON.stringify(r))
    if (chunk.length) await redis.rpush(THRESHOLD_KEY, ...chunk)
  }
  console.log(`[threshold] rebuilt ${records.length} records`)
  return records.length
}

async function main() {
  console.log(`Importing from: ${DATA_DIR}`)
  const trendingTs = await importKind('trending', loadLocal('trending'))
  await importKind('profiles', loadLocal('profiles'))
  await rebuildThreshold(trendingTs)
  console.log('Done.')
}

main().catch((err) => {
  console.error('Import failed:', err)
  process.exit(1)
})
