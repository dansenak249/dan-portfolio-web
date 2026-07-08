'use client'

// Shared UI primitives + helpers for the bot-config surface.
// ------------------------------------------------------------------
// Extracted from the original single-file BotConfigForm so the login gate,
// member view, and admin view can all reuse the same panels, fields, status
// lights, and cookie/JWT helpers without duplicating them.

export const ENDPOINT = '/api/bot-config'
export const LOGIN_ENDPOINT = '/api/bot-config/login'
export const USERS_ENDPOINT = '/api/bot-config/users'
export const VERIFY_COOKIE_ENDPOINT = '/api/bot-config/verify-cookie'

// localStorage key for the last-used login username, so a returning user only
// needs to re-enter their password. Never stores the password itself.
export const LAST_USERNAME_KEY = 'botConfig:lastUsername'

// COOKIE light: the cookie is pushed manually (via `npm run relay-cookie`) and
// only needs refreshing roughly monthly, so a generous window before it reads
// stale. Green while a cookie was pushed within this window.
export const COOKIE_STALE_MS = 26 * 60 * 60 * 1000

// POLLER light: the off-host poller heartbeats every cycle (default 3 min). If
// no heartbeat lands within this window, the poller is likely down -> red.
export const POLLER_STALE_MS = 8 * 60 * 1000

// Curated IANA zones. The value is what the bot stores/uses; the label adds a
// human-friendly UTC hint. Asia/Ho_Chi_Minh (the owner's zone) leads the list.
export const TIMEZONES = [
  { value: 'Asia/Ho_Chi_Minh', label: '(UTC+7) Ho Chi Minh' },
  { value: 'Asia/Bangkok', label: '(UTC+7) Bangkok' },
  { value: 'Asia/Singapore', label: '(UTC+8) Singapore' },
  { value: 'Asia/Shanghai', label: '(UTC+8) Shanghai' },
  { value: 'Asia/Tokyo', label: '(UTC+9) Tokyo' },
  { value: 'Asia/Seoul', label: '(UTC+9) Seoul' },
  { value: 'Asia/Kolkata', label: '(UTC+5:30) Kolkata' },
  { value: 'Asia/Dubai', label: '(UTC+4) Dubai' },
  { value: 'UTC', label: '(UTC+0) UTC' },
  { value: 'Europe/London', label: '(UTC+0/+1) London' },
  { value: 'Europe/Paris', label: '(UTC+1/+2) Paris' },
  { value: 'Europe/Berlin', label: '(UTC+1/+2) Berlin' },
  { value: 'America/New_York', label: '(UTC-5/-4) New York' },
  { value: 'America/Chicago', label: '(UTC-6/-5) Chicago' },
  { value: 'America/Denver', label: '(UTC-7/-6) Denver' },
  { value: 'America/Los_Angeles', label: '(UTC-8/-7) Los Angeles' },
  { value: 'Australia/Sydney', label: '(UTC+10/+11) Sydney' },
]

// Decode a JWT payload (base64url) without verifying the signature. Used only
// to surface the account id embedded in the v-session token for inspection.
export function decodeJwtPayload(jwt) {
  try {
    const part = jwt.split('.')[1]
    if (!part) return null
    let b64 = part.replace(/-/g, '+').replace(/_/g, '/')
    while (b64.length % 4) b64 += '='
    return JSON.parse(atob(b64))
  } catch {
    return null
  }
}

// Extract a single cookie value from a full cookie string.
export function cookieValue(cookie, name) {
  const match = cookie.match(new RegExp('(?:^|;\\s*)' + name + '=([^;]*)'))
  return match ? match[1] : ''
}

// Derive the VGen account id from the cookie's v-session JWT. Empty when the
// cookie has no session yet (the bot mints one on its next refresh).
export function deriveUserId(cookie) {
  const session = cookieValue(cookie, 'v-session')
  if (!session) return ''
  const payload = decodeJwtPayload(session)
  if (!payload) return ''
  return (
    payload.userID ||
    payload.userId ||
    payload.user_id ||
    payload.sub ||
    payload.id ||
    ''
  )
}

// Shared color palette for the status lights.
export const LIGHT_UNKNOWN = '#c7c9d6'
export const LIGHT_OK = '#2e9e6b'
export const LIGHT_STALE = '#e0517a'

// Inline status caption used next to action buttons (no full-screen loader for
// fast ops). kind: 'pending' (amber, in-flight) | 'ok' (green) | 'error' (red).
const STATUS_COLOR = {
  pending: '#c98a24',
  ok: '#2e9e6b',
  error: '#e0517a',
}

export function StatusText({ status }) {
  if (!status) return null
  return (
    <span
      className="text-xs font-medium"
      style={{ color: STATUS_COLOR[status.kind] || STATUS_COLOR.pending }}
    >
      {status.text}
    </span>
  )
}

// Generic freshness -> {color,label} resolver shared by both lights. Green when
// the stamp is within `staleMs`, red when stale/never, gray before load. Called
// from an effect (not render) since it reads the current time.
export function computeLight(loaded, stamp, staleMs, noun) {
  if (!loaded) {
    return { color: LIGHT_UNKNOWN, label: `${noun} status unknown -- load the config first` }
  }
  const ts = stamp ? new Date(stamp).getTime() : 0
  if (ts && Date.now() - ts < staleMs) {
    return {
      color: LIGHT_OK,
      label: `${noun} active -- last update ${new Date(stamp).toLocaleString()}`,
    }
  }
  return {
    color: LIGHT_STALE,
    label: stamp
      ? `${noun} stale -- last update ${new Date(stamp).toLocaleString()}`
      : `${noun} never updated`,
  }
}

// COOKIE light: tracks when a fresh VGen cookie was last pushed to the config.
export function computeCookie(loaded, cookieUpdatedAt) {
  return computeLight(loaded, cookieUpdatedAt, COOKIE_STALE_MS, 'Cookie')
}

// POLLER light: tracks the off-host poller's last heartbeat (alive/down).
export function computePoller(loaded, pollerHeartbeatAt) {
  return computeLight(loaded, pollerHeartbeatAt, POLLER_STALE_MS, 'Poller')
}

// Small labelled status light (dot + caption). Reused for Cookie and Poller.
export function StatusLight({ color, label, text }) {
  return (
    <span className="flex items-center gap-1.5" title={label}>
      <span
        className="inline-block h-2.5 w-2.5 rounded-full"
        style={{ backgroundColor: color, boxShadow: `0 0 6px ${color}` }}
      />
      <span className="text-[10px] font-semibold uppercase tracking-wide text-[#9a9ab5]">
        {text}
      </span>
    </span>
  )
}

// Eye icon button overlaid inside a password/secret input.
export function EyeButton({ shown, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={shown ? 'Hide' : 'Show'}
      className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-[#9a9ab5] transition hover:text-[#5b8de8]"
    >
      {shown ? (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
          <line x1="1" y1="1" x2="23" y2="23" />
        </svg>
      ) : (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
          <circle cx="12" cy="12" r="3" />
        </svg>
      )}
    </button>
  )
}

export function Panel({ children, corner }) {
  return (
    <section className="relative rounded-2xl border border-[#e5e9f4] bg-white p-6 shadow-sm">
      {corner && <div className="absolute right-4 top-4">{corner}</div>}
      {children}
    </section>
  )
}

export function Field({ label, hint, children }) {
  return (
    <label className="block">
      <span className="text-xs font-semibold text-[#2d2d3a]">{label}</span>
      {hint && <span className="mt-0.5 block text-[11px] text-[#9a9ab5]">{hint}</span>}
      <div className="mt-1.5">{children}</div>
    </label>
  )
}

export function TextInput({ value, onChange, placeholder }) {
  return (
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      autoComplete="off"
      className="w-full rounded-lg border border-[#e0e4ee] px-3 py-2 text-sm text-[#2d2d3a] outline-none transition focus:border-[#5b8de8] focus:ring-2 focus:ring-[#5b8de8]/15"
    />
  )
}

export function ReadOnly({ value, placeholder, mono }) {
  return (
    <input
      type="text"
      value={value}
      readOnly
      tabIndex={-1}
      placeholder={placeholder}
      className={`w-full cursor-default rounded-lg border border-dashed border-[#e0e4ee] bg-[#f7f8fc] px-3 py-2 text-xs text-[#6b6b82] outline-none ${
        mono ? 'font-mono' : ''
      }`}
    />
  )
}

// A single labelled checkbox used for the per-event notification toggles
// (Like / Follow / Message / Commission).
export function CheckToggle({ label, checked, onChange }) {
  return (
    <label className="flex cursor-pointer items-center gap-1.5 select-none">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="h-4 w-4 cursor-pointer accent-[#5b8de8]"
      />
      <span className="text-xs text-[#2d2d3a]">{label}</span>
    </label>
  )
}

// Flatten the stored single self-mapping (userMappings[0]) into form state.
// Both the admin's per-member card and the member's own view read their one
// self-mapping through this, so the checkboxes always reflect the STORED routing
// on load (not a cosmetic default). Boolean() coerces missing flags to false.
export function firstMapping(rows) {
  const row = Array.isArray(rows) && rows.length > 0 ? rows[0] : null
  return {
    discordId: row?.discordId ?? '',
    like: Boolean(row?.like),
    follow: Boolean(row?.follow),
    message: Boolean(row?.message),
    commission: Boolean(row?.commission),
  }
}

// Build the single self-mapping array for save. vgenId is the member's own
// handle so the bot can resolve a notification addressed to them -> their
// Discord id. Persist as long as a handle exists, even with an empty discordId:
// this keeps the per-event toggle choices from being wiped on save (the bot's
// resolver skips the mention when discordId is blank, falling back to plain
// @handle text), so reopening shows exactly the selections the user made.
export function buildSelfMapping({ handle, discordId, like, follow, message, commission }) {
  const trimmedHandle = (handle || '').trim()
  if (!trimmedHandle) return []
  return [
    {
      name: '',
      vgenId: trimmedHandle,
      discordId: (discordId || '').trim(),
      like: Boolean(like),
      follow: Boolean(follow),
      message: Boolean(message),
      commission: Boolean(commission),
    },
  ]
}
