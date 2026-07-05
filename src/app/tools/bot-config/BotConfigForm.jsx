'use client'

import { useEffect, useState } from 'react'

// Client form for editing the Discord bot runtime config.
//
// Flow: the owner pastes the admin secret (BOT_CONFIG_SECRET), clicks Load to
// pull the current config from /api/bot-config, edits the fields, then Save.
// The secret is held only in component state and sent as a Bearer token on
// each request -- it is never persisted to the config store or the URL.
//
// The UI is split into three bordered cards:
//   1. Admin secret (unlock) -- with a single eye toggle.
//   2. VGen session -- the cookie is the only editable credential; the user id
//      is derived client-side from the cookie's v-session JWT, and the chat
//      token is shown read-only (the bot derives a live one at runtime). A tiny
//      status light reflects whether the cookie relay is pushing recently.
//   3. Discord + timezone -- single notification channel + IANA timezone.

const ENDPOINT = '/api/bot-config'

// The relay runs every 24h. If the config has not been updated within this
// window, the relay is likely not running -> show a red light.
const RELAY_STALE_MS = 26 * 60 * 60 * 1000

const EMPTY = {
  vgenCookie: '',
  reminderChannelId: '',
  vgenChatToken: '',
  timelineTimezone: 'Asia/Ho_Chi_Minh',
}

// Curated IANA zones. The value is what the bot stores/uses; the label adds a
// human-friendly UTC hint. Asia/Ho_Chi_Minh (the owner's zone) leads the list.
const TIMEZONES = [
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
function decodeJwtPayload(jwt) {
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
function cookieValue(cookie, name) {
  const match = cookie.match(new RegExp('(?:^|;\\s*)' + name + '=([^;]*)'))
  return match ? match[1] : ''
}

// Derive the VGen account id from the cookie's v-session JWT. Empty when the
// cookie has no session yet (the bot mints one on its next refresh).
function deriveUserId(cookie) {
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

export default function BotConfigForm() {
  const [secret, setSecret] = useState('')
  const [showSecret, setShowSecret] = useState(false)
  const [config, setConfig] = useState(EMPTY)
  const [chatToken, setChatToken] = useState('')
  const [mappings, setMappings] = useState([])
  const [dragIndex, setDragIndex] = useState(null)
  const [updatedAt, setUpdatedAt] = useState(null)
  const [loaded, setLoaded] = useState(false)
  const [busy, setBusy] = useState(false)
  const [status, setStatus] = useState(null) // { kind: 'ok' | 'error', text }
  const [relay, setRelay] = useState(() => computeRelay(false, null))

  const derivedUserId = deriveUserId(config.vgenCookie)

  // Recompute the relay light whenever the config freshness changes. Kept in an
  // effect so the render stays pure (no Date.now() during render).
  useEffect(() => {
    setRelay(computeRelay(loaded, updatedAt))
  }, [loaded, updatedAt])

  function setField(key, value) {
    setConfig((prev) => ({ ...prev, [key]: value }))
  }

  // --- VGen -> Discord mapping table helpers (immutable updates) ---------
  function addMapping() {
    setMappings((prev) => [
      ...prev,
      { discordId: '', vgenId: '', like: false, follow: false, message: false },
    ])
  }

  function removeMapping(index) {
    setMappings((prev) => prev.filter((_, i) => i !== index))
  }

  function updateMapping(index, key, value) {
    setMappings((prev) =>
      prev.map((row, i) => (i === index ? { ...row, [key]: value } : row))
    )
  }

  // Move the currently dragged row so it lands before `index`, reordering the
  // list in place. Used by the drag handle for manual sorting.
  function reorderMapping(index) {
    setMappings((prev) => {
      if (dragIndex === null || dragIndex === index) return prev
      const next = [...prev]
      const [moved] = next.splice(dragIndex, 1)
      next.splice(index, 0, moved)
      return next
    })
    setDragIndex(index)
  }

  async function handleLoad() {
    if (!secret.trim()) {
      setStatus({ kind: 'error', text: 'Enter the admin secret first.' })
      return
    }
    setBusy(true)
    setStatus(null)
    try {
      const res = await fetch(ENDPOINT, {
        headers: { Authorization: `Bearer ${secret}` },
        cache: 'no-store',
      })
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data?.error || `HTTP ${res.status}`)
      }
      setConfig({
        vgenCookie: data.vgenCookie ?? '',
        reminderChannelId: data.reminderChannelId ?? '',
        vgenChatToken: data.vgenChatToken ?? '',
        timelineTimezone: data.timelineTimezone ?? 'Asia/Ho_Chi_Minh',
      })
      setChatToken(data.vgenChatToken ?? '')
      setMappings(Array.isArray(data.userMappings) ? data.userMappings : [])
      setUpdatedAt(data.updatedAt ?? null)
      setLoaded(true)
      setStatus({ kind: 'ok', text: 'Config loaded.' })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Load failed'
      setStatus({ kind: 'error', text: message })
    } finally {
      setBusy(false)
    }
  }

  async function handleSave() {
    if (!secret.trim()) {
      setStatus({ kind: 'error', text: 'Enter the admin secret first.' })
      return
    }
    setBusy(true)
    setStatus(null)
    try {
      // Only the editable fields are sent. The user id and chat token are
      // auto-derived (client-side / by the bot), so they are never written back.
      const res = await fetch(ENDPOINT, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${secret}`,
        },
        body: JSON.stringify({
          vgenCookie: config.vgenCookie,
          reminderChannelId: config.reminderChannelId,
          timelineTimezone: config.timelineTimezone,
          userMappings: mappings,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data?.error || `HTTP ${res.status}`)
      }
      setUpdatedAt(data.updatedAt ?? null)
      setStatus({ kind: 'ok', text: 'Saved. The bot will pick this up shortly.' })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Save failed'
      setStatus({ kind: 'error', text: message })
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-5">
      {/* Card 1 -- Admin secret ------------------------------------------- */}
      <Panel>
        <label className="block">
          <span className="text-xs font-semibold text-[#2d2d3a]">
            Admin secret
          </span>
          <div className="mt-1.5 flex gap-2">
            <div className="relative flex-1">
              <input
                type={showSecret ? 'text' : 'password'}
                value={secret}
                onChange={(e) => setSecret(e.target.value)}
                placeholder="BOT_CONFIG_SECRET"
                autoComplete="off"
                className="w-full rounded-lg border border-[#e0e4ee] px-3 py-2 pr-10 text-sm text-[#2d2d3a] outline-none transition focus:border-[#5b8de8] focus:ring-2 focus:ring-[#5b8de8]/15 [&::-ms-clear]:hidden [&::-ms-reveal]:hidden"
              />
              <EyeButton
                shown={showSecret}
                onClick={() => setShowSecret((v) => !v)}
              />
            </div>
            <button
              type="button"
              onClick={handleLoad}
              disabled={busy}
              className="rounded-lg bg-[#2d2d3a] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#40405a] disabled:opacity-50"
            >
              Load
            </button>
          </div>
        </label>
      </Panel>

      {/* Card 2 -- VGen session ------------------------------------------- */}
      <Panel corner={<RelayLight color={relay.color} label={relay.label} />}>
        <fieldset disabled={!loaded || busy} className="space-y-4 disabled:opacity-60">
          <Field
            label="VGen user ID"
            hint="Derived from the cookie's v-session token. Read-only."
          >
            <ReadOnly value={derivedUserId} mono placeholder="Derived from cookie" />
          </Field>

          <Field
            label="VGen cookie"
            hint="Full cookie string. Pushed automatically by the relay. Ctrl+A to copy."
          >
            <input
              type="text"
              value={config.vgenCookie}
              onChange={(e) => setField('vgenCookie', e.target.value)}
              spellCheck={false}
              placeholder="v-refresh=...; cf_clearance=...; ..."
              className="w-full rounded-lg border border-[#e0e4ee] px-3 py-2 font-mono text-xs text-[#2d2d3a] outline-none transition focus:border-[#5b8de8] focus:ring-2 focus:ring-[#5b8de8]/15"
            />
          </Field>

          <Field
            label="VGen chat token"
            hint="Auto-derived by the bot at runtime. Stored copy shown for reference only."
          >
            <ReadOnly value={chatToken} mono placeholder="Derived by the bot" />
          </Field>
        </fieldset>
      </Panel>

      {/* Card 3 -- Discord + timezone ------------------------------------- */}
      <Panel>
        <fieldset disabled={!loaded || busy} className="space-y-4 disabled:opacity-60">
          <Field
            label="Discord notification channel ID"
            hint="Single channel for both VGen notifications and timeline reminders."
          >
            <TextInput
              value={config.reminderChannelId}
              onChange={(v) => setField('reminderChannelId', v)}
              placeholder="123456789012345678"
            />
          </Field>

          <Field
            label="Timezone"
            hint="IANA zone used to interpret commission milestone dates."
          >
            <select
              value={config.timelineTimezone}
              onChange={(e) => setField('timelineTimezone', e.target.value)}
              className="w-full rounded-lg border border-[#e0e4ee] bg-white px-3 py-2 text-sm text-[#2d2d3a] outline-none transition focus:border-[#5b8de8] focus:ring-2 focus:ring-[#5b8de8]/15"
            >
              {TIMEZONES.map((tz) => (
                <option key={tz.value} value={tz.value}>
                  {tz.label}
                </option>
              ))}
            </select>
          </Field>
        </fieldset>
      </Panel>

      {/* Card 4 -- VGen <-> Discord user mapping -------------------------- */}
      <Panel>
        <fieldset disabled={!loaded || busy} className="space-y-3 disabled:opacity-60">
          <div>
            <span className="text-xs font-semibold text-[#2d2d3a]">
              VGen &rarr; Discord mapping
            </span>
            <span className="mt-0.5 block text-[11px] text-[#9a9ab5]">
              When a notification is addressed to a mapped VGen id, the bot tags
              the Discord user instead of plain text. Toggle which events tag.
            </span>
          </div>

          <MappingTable
            mappings={mappings}
            dragIndex={dragIndex}
            onAdd={addMapping}
            onRemove={removeMapping}
            onUpdate={updateMapping}
            onDragStart={setDragIndex}
            onDragEnter={reorderMapping}
            onDragEnd={() => setDragIndex(null)}
          />
        </fieldset>
      </Panel>

      {/* Footer: status + Save */}
      <div className="flex items-center justify-between gap-3 px-1">
        <div className="min-h-[1.25rem] text-xs">
          {status && (
            <span
              className={
                status.kind === 'ok' ? 'text-[#2e9e6b]' : 'text-[#e0517a]'
              }
            >
              {status.text}
            </span>
          )}
          {!status && updatedAt && (
            <span className="text-[#9a9ab5]">
              Last saved {new Date(updatedAt).toLocaleString()}
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={handleSave}
          disabled={!loaded || busy}
          className="rounded-lg bg-[#5b8de8] px-5 py-2 text-sm font-semibold text-white transition hover:bg-[#4a7ad3] disabled:opacity-50"
        >
          {busy ? 'Working...' : 'Save'}
        </button>
      </div>
    </div>
  )
}

// Editable VGen->Discord mapping table: a drag handle for manual sorting, two
// text ids, three per-event checkboxes, and a remove button per row.
function MappingTable({
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
        <div className="min-w-[560px]">
          {/* Header */}
          <div className="grid grid-cols-[24px_1.4fr_1.4fr_52px_52px_60px_28px] items-center gap-2 px-1 pb-1 text-[10px] font-semibold uppercase tracking-wide text-[#9a9ab5]">
            <span />
            <span>Discord ID</span>
            <span>VGen ID</span>
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
      className={`grid grid-cols-[24px_1.4fr_1.4fr_52px_52px_60px_28px] items-center gap-2 rounded-lg border px-1 py-1 transition ${
        dragging
          ? 'border-[#5b8de8] bg-[#5b8de8]/5'
          : 'border-transparent'
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
        value={row.discordId}
        onChange={(e) => onUpdate(index, 'discordId', e.target.value)}
        placeholder="discord id"
        autoComplete="off"
        className="w-full rounded-md border border-[#e0e4ee] px-2 py-1.5 text-xs text-[#2d2d3a] outline-none transition focus:border-[#5b8de8] focus:ring-2 focus:ring-[#5b8de8]/15"
      />
      <input
        type="text"
        value={row.vgenId}
        onChange={(e) => onUpdate(index, 'vgenId', e.target.value)}
        placeholder="vgen id"
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

function CheckCell({ checked, onChange }) {
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

function Panel({ children, corner }) {
  return (
    <section className="relative rounded-2xl border border-[#e5e9f4] bg-white p-6 shadow-sm">
      {corner && <div className="absolute right-4 top-4">{corner}</div>}
      {children}
    </section>
  )
}

function Field({ label, hint, children }) {
  return (
    <label className="block">
      <span className="text-xs font-semibold text-[#2d2d3a]">{label}</span>
      {hint && <span className="mt-0.5 block text-[11px] text-[#9a9ab5]">{hint}</span>}
      <div className="mt-1.5">{children}</div>
    </label>
  )
}

function TextInput({ value, onChange, placeholder }) {
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

function ReadOnly({ value, placeholder, mono }) {
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

// Derive the relay light color + tooltip from config freshness. Green when the
// config was updated within RELAY_STALE_MS (relay pushing on schedule), red
// when stale, gray when the config has not been loaded yet. Called from an
// effect (not render) since it reads the current time.
function computeRelay(loaded, updatedAt) {
  if (!loaded) {
    return { color: '#c7c9d6', label: 'Relay status unknown -- load the config first' }
  }
  const ts = updatedAt ? new Date(updatedAt).getTime() : 0
  if (ts && Date.now() - ts < RELAY_STALE_MS) {
    return {
      color: '#2e9e6b',
      label: `Relay active -- last push ${new Date(updatedAt).toLocaleString()}`,
    }
  }
  return {
    color: '#e0517a',
    label: updatedAt
      ? `Relay stale -- last push ${new Date(updatedAt).toLocaleString()}`
      : 'Relay never pushed',
  }
}

// Small status light for the cookie relay.
function RelayLight({ color, label }) {
  return (
    <span className="flex items-center gap-1.5" title={label}>
      <span
        className="inline-block h-2.5 w-2.5 rounded-full"
        style={{ backgroundColor: color, boxShadow: `0 0 6px ${color}` }}
      />
      <span className="text-[10px] font-semibold uppercase tracking-wide text-[#9a9ab5]">
        Relay
      </span>
    </span>
  )
}

// Eye icon button overlaid inside the admin secret input.
function EyeButton({ shown, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={shown ? 'Hide secret' : 'Show secret'}
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
