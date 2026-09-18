// Read-token store (API keys for the data export)
// ---------------------------------------------------------------------------
// These are NOT accounts. A bot-config user can sign in and WRITE; a read token
// can only GET /api/vgen-service-data/export. They exist so a colleague -- or a
// colleague's LLM -- can pull the census without being handed a login that can
// purge a category.
//
// WHY ONE KEY FOR THE WHOLE LIST. Upstash bills per command, not per byte, and
// the export path has to check the presented token on every single call. Storing
// the tokens as one JSON array means that check is a single GET no matter how
// many tokens exist; a key per token would make it a scan. The list is tiny
// (a handful of rows) and only an admin writes it, so the whole-array rewrite
// costs nothing in practice.
//
// ORDER IS THE ARRAY ORDER. The admin drags rows to sort them; there is no
// separate `order` field to drift out of sync with the array it describes.

import { promises as fs } from 'fs'
import path from 'path'
import { Redis } from '@upstash/redis'
import { randomBytes } from 'crypto'
import { safeEqual } from './store.js'

const TOKENS_KEY = 'bot:readTokens'
const SEED_FILE = path.join(process.cwd(), 'data', 'bot', 'tokens.json')

const MAX_NAME = 64
const MAX_TOKENS = 50
// A token shorter than this is almost certainly a person typing a memorable
// word, which is not a credential. 16 chars is the floor, not the target --
// generated tokens are 48 hex chars.
const MIN_TOKEN_LENGTH = 16
const MAX_TOKEN_LENGTH = 256

// `lastUsedAt` is written back on use, so it costs a SET on the read path. One
// write per hour per token is enough to answer "is this token still in use?"
// without paying a command on every export call.
const TOUCH_INTERVAL_MS = 60 * 60 * 1000

const HAS_KV = Boolean(
  process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN
)
const redis = HAS_KV
  ? new Redis({
      url: process.env.KV_REST_API_URL,
      token: process.env.KV_REST_API_TOKEN,
    })
  : null

export function generateReadToken() {
  return randomBytes(24).toString('hex')
}

function generateTokenId() {
  return `tok_${randomBytes(6).toString('hex')}`
}

function normalize(input) {
  if (!input || typeof input !== 'object') return null
  const token = typeof input.token === 'string' ? input.token.trim() : ''
  if (!token) return null
  return {
    id: typeof input.id === 'string' && input.id ? input.id : generateTokenId(),
    name: typeof input.name === 'string' ? input.name.trim().slice(0, MAX_NAME) : '',
    token: token.slice(0, MAX_TOKEN_LENGTH),
    createdAt: typeof input.createdAt === 'string' ? input.createdAt : null,
    lastUsedAt: typeof input.lastUsedAt === 'string' ? input.lastUsedAt : null,
  }
}

/**
 * Validate a token value a human typed in. Returns an error string or null.
 * @param {string} value
 */
export function validateTokenValue(value) {
  const token = String(value || '').trim()
  if (token.length < MIN_TOKEN_LENGTH) {
    return `Token must be at least ${MIN_TOKEN_LENGTH} characters`
  }
  if (token.length > MAX_TOKEN_LENGTH) {
    return `Token must be at most ${MAX_TOKEN_LENGTH} characters`
  }
  // The token travels in a URL query string as well as a header, so anything
  // that would need escaping there is rejected rather than silently mangled.
  if (!/^[A-Za-z0-9._~-]+$/.test(token)) {
    return 'Token may only contain letters, digits, and . _ ~ -'
  }
  return null
}

// --- storage ---------------------------------------------------------------

async function readFileList() {
  try {
    const raw = await fs.readFile(SEED_FILE, 'utf-8')
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

async function writeFileList(list) {
  await fs.mkdir(path.dirname(SEED_FILE), { recursive: true })
  await fs.writeFile(SEED_FILE, JSON.stringify(list, null, 2), 'utf-8')
}

/**
 * Every read token, in admin-chosen order. One Redis command.
 * @returns {Promise<{id:string,name:string,token:string,createdAt:string|null,lastUsedAt:string|null}[]>}
 */
export async function listTokens() {
  let stored
  if (HAS_KV) {
    const raw = await redis.get(TOKENS_KEY)
    stored = typeof raw === 'string' ? JSON.parse(raw) : raw
  } else {
    stored = await readFileList()
  }
  if (!Array.isArray(stored)) return []
  return stored.map(normalize).filter(Boolean)
}

/**
 * Overwrite the whole list. Admin-only paths call this.
 * @param {object[]} list
 */
export async function saveTokens(list) {
  const clean = list.map(normalize).filter(Boolean).slice(0, MAX_TOKENS)
  if (HAS_KV) {
    await redis.set(TOKENS_KEY, JSON.stringify(clean))
  } else {
    await writeFileList(clean)
  }
  return clean
}

/**
 * Append a new token. A blank `value` mints one.
 * @param {{name?: string, value?: string}} input
 */
export async function createToken({ name, value } = {}) {
  const token = (value || '').trim() || generateReadToken()
  const error = validateTokenValue(token)
  if (error) throw new Error(error)
  const list = await listTokens()
  if (list.length >= MAX_TOKENS) {
    throw new Error(`At most ${MAX_TOKENS} tokens`)
  }
  if (list.some((t) => t.token === token)) {
    throw new Error('That token value is already in use')
  }
  const row = {
    id: generateTokenId(),
    name: (name || '').trim().slice(0, MAX_NAME),
    token,
    createdAt: new Date().toISOString(),
    lastUsedAt: null,
  }
  const saved = await saveTokens([...list, row])
  return { row, tokens: saved }
}

/**
 * Rename, replace, or regenerate one token.
 * @param {string} id
 * @param {{name?: string, value?: string, regenerate?: boolean}} patch
 */
export async function updateToken(id, patch = {}) {
  const list = await listTokens()
  const index = list.findIndex((t) => t.id === id)
  if (index === -1) throw new Error('Token not found')
  const next = { ...list[index] }

  if (typeof patch.name === 'string') {
    next.name = patch.name.trim().slice(0, MAX_NAME)
  }
  // A typed value wins over `regenerate` so a request carrying both is not
  // ambiguous: the explicit value is the more specific instruction.
  if (patch.regenerate === true && typeof patch.value !== 'string') {
    next.token = generateReadToken()
  } else if (typeof patch.value === 'string' && patch.value.trim()) {
    const token = patch.value.trim()
    const error = validateTokenValue(token)
    if (error) throw new Error(error)
    if (list.some((t, i) => i !== index && t.token === token)) {
      throw new Error('That token value is already in use')
    }
    next.token = token
  }
  // A changed value is a different credential, so its usage history no longer
  // describes it.
  if (next.token !== list[index].token) next.lastUsedAt = null

  const updated = [...list]
  updated[index] = next
  const saved = await saveTokens(updated)
  return { row: next, tokens: saved }
}

/** @param {string} id */
export async function deleteToken(id) {
  const list = await listTokens()
  if (!list.some((t) => t.id === id)) throw new Error('Token not found')
  return saveTokens(list.filter((t) => t.id !== id))
}

/**
 * Reorder to match `ids`. Ids that are not in the stored list are ignored, and
 * stored rows the caller did not mention keep their relative order at the end --
 * so a stale browser tab can reorder what it can see without deleting a token
 * created in another tab.
 * @param {string[]} ids
 */
export async function reorderTokens(ids) {
  const list = await listTokens()
  const wanted = Array.isArray(ids) ? ids : []
  const byId = new Map(list.map((t) => [t.id, t]))
  const ordered = []
  for (const id of wanted) {
    const row = byId.get(id)
    if (row && !ordered.includes(row)) ordered.push(row)
  }
  for (const row of list) {
    if (!ordered.includes(row)) ordered.push(row)
  }
  return saveTokens(ordered)
}

// --- auth ------------------------------------------------------------------

/**
 * The token a request is presenting, whichever of the three forms it used.
 *
 * Three forms because the caller may be a browser, a script, or an LLM's fetch
 * tool -- and many LLM tools can only be handed a URL, with no way to set a
 * header. The header forms are preferred (a query string lands in server logs
 * and browser history); the query param exists so the capability is reachable
 * at all from those callers.
 *
 * @param {Request} request
 * @returns {string}
 */
export function presentedToken(request) {
  const header = request.headers.get('authorization') || ''
  if (header) return header.startsWith('Bearer ') ? header.slice(7).trim() : header.trim()
  const apiKey = request.headers.get('x-api-key')
  if (apiKey) return apiKey.trim()
  try {
    return (new URL(request.url).searchParams.get('token') || '').trim()
  } catch {
    return ''
  }
}

/**
 * Resolve a request to the read token it carries, or null.
 *
 * Costs one Redis command (plus at most one write per hour per token, to keep
 * `lastUsedAt` roughly current so a forgotten token can be spotted and removed).
 *
 * @param {Request} request
 * @returns {Promise<object|null>}
 */
export async function resolveReadToken(request) {
  const presented = presentedToken(request)
  if (!presented) return null
  const list = await listTokens()
  let matched = null
  // No early exit: every row is compared so the time taken does not depend on
  // WHICH token matched.
  for (const row of list) {
    if (safeEqual(presented, row.token)) matched = row
  }
  if (!matched) return null

  const last = matched.lastUsedAt ? new Date(matched.lastUsedAt).getTime() : 0
  if (Date.now() - last > TOUCH_INTERVAL_MS) {
    const stamped = { ...matched, lastUsedAt: new Date().toISOString() }
    try {
      await saveTokens(list.map((t) => (t.id === matched.id ? stamped : t)))
    } catch {
      // A missed usage stamp is cosmetic; never fail a read over it.
    }
  }
  return matched
}
