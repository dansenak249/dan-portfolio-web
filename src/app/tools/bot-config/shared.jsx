'use client'

// Shared UI primitives + helpers for the bot-config surface.
// ------------------------------------------------------------------
// Extracted from the original single-file BotConfigForm so the login gate,
// member view, and admin view can all reuse the same panels, fields, status
// lights, and cookie/JWT helpers without duplicating them.

export const ENDPOINT = '/api/bot-config'
export const LOGIN_ENDPOINT = '/api/bot-config/login'
export const USERS_ENDPOINT = '/api/bot-config/users'

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

export function CheckCell({ checked, onChange }) {
  return (
    <span className="flex justify-center">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="h-4 w-4 cursor-pointer accent-[#5b8de8]"
      />
    </span>
  )
}

// Editable VGen->Discord mapping table: a drag handle for manual sorting, two
// text ids, three per-event checkboxes, and a remove button per row.
export function MappingTable({
  mappings,
  dragIndex,
  onAdd,
  onRemove,
  onUpdate,
  onDragStart,
  onDragEnter,
  onDragEnd,
}) {
  return (
    <div className="space-y-2">
      <div className="overflow-x-auto">
        <div className="min-w-[620px]">
          {/* Header */}
          <div className="grid grid-cols-[24px_1.1fr_1.3fr_1.3fr_52px_52px_64px_28px] items-center gap-2 px-1 pb-1 text-[10px] font-semibold uppercase tracking-wide text-[#9a9ab5]">
            <span />
            <span>Name</span>
            <span>VGen handle</span>
            <span>Discord ID</span>
            <span className="text-center">Like</span>
            <span className="text-center">Follow</span>
            <span className="text-center">Message</span>
            <span />
          </div>

          {mappings.length === 0 ? (
            <p className="px-1 py-3 text-xs text-[#9a9ab5]">
              No mappings yet. Add one to tag a Discord user.
            </p>
          ) : (
            <div className="space-y-1.5">
              {mappings.map((row, index) => (
                <MappingRow
                  key={index}
                  row={row}
                  index={index}
                  dragging={dragIndex === index}
                  onRemove={onRemove}
                  onUpdate={onUpdate}
                  onDragStart={onDragStart}
                  onDragEnter={onDragEnter}
                  onDragEnd={onDragEnd}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      <button
        type="button"
        onClick={onAdd}
        className="rounded-lg border border-dashed border-[#c3cbe0] px-3 py-1.5 text-xs font-semibold text-[#5b8de8] transition hover:border-[#5b8de8] hover:bg-[#5b8de8]/5"
      >
        + Add user
      </button>
    </div>
  )
}

function MappingRow({
  row,
  index,
  dragging,
  onRemove,
  onUpdate,
  onDragStart,
  onDragEnter,
  onDragEnd,
}) {
  return (
    <div
      onDragEnter={() => onDragEnter(index)}
      onDragOver={(e) => e.preventDefault()}
      className={`grid grid-cols-[24px_1.1fr_1.3fr_1.3fr_52px_52px_64px_28px] items-center gap-2 rounded-lg border px-1 py-1 transition ${
        dragging ? 'border-[#5b8de8] bg-[#5b8de8]/5' : 'border-transparent'
      }`}
    >
      {/* Drag handle (3 lines) */}
      <span
        draggable
        onDragStart={() => onDragStart(index)}
        onDragEnd={onDragEnd}
        title="Drag to reorder"
        className="flex cursor-grab justify-center text-[#b4b8c8] active:cursor-grabbing"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <line x1="4" y1="7" x2="20" y2="7" />
          <line x1="4" y1="12" x2="20" y2="12" />
          <line x1="4" y1="17" x2="20" y2="17" />
        </svg>
      </span>

      <input
        type="text"
        value={row.name}
        onChange={(e) => onUpdate(index, 'name', e.target.value)}
        placeholder="label"
        autoComplete="off"
        className="w-full rounded-md border border-[#e0e4ee] px-2 py-1.5 text-xs text-[#2d2d3a] outline-none transition focus:border-[#5b8de8] focus:ring-2 focus:ring-[#5b8de8]/15"
      />
      <input
        type="text"
        value={row.vgenId}
        onChange={(e) => onUpdate(index, 'vgenId', e.target.value)}
        placeholder="e.g. dansenak249 (not UUID)"
        autoComplete="off"
        className="w-full rounded-md border border-[#e0e4ee] px-2 py-1.5 text-xs text-[#2d2d3a] outline-none transition focus:border-[#5b8de8] focus:ring-2 focus:ring-[#5b8de8]/15"
      />
      <input
        type="text"
        value={row.discordId}
        onChange={(e) => onUpdate(index, 'discordId', e.target.value)}
        placeholder="discord numeric id"
        autoComplete="off"
        className="w-full rounded-md border border-[#e0e4ee] px-2 py-1.5 text-xs text-[#2d2d3a] outline-none transition focus:border-[#5b8de8] focus:ring-2 focus:ring-[#5b8de8]/15"
      />

      <CheckCell checked={row.like} onChange={(v) => onUpdate(index, 'like', v)} />
      <CheckCell checked={row.follow} onChange={(v) => onUpdate(index, 'follow', v)} />
      <CheckCell checked={row.message} onChange={(v) => onUpdate(index, 'message', v)} />

      <button
        type="button"
        onClick={() => onRemove(index)}
        aria-label="Remove mapping"
        className="flex justify-center rounded p-1 text-[#c3859a] transition hover:text-[#e0517a]"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>
    </div>
  )
}
