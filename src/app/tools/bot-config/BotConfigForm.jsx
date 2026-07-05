'use client'

import { useState } from 'react'

// Client form for editing the Discord bot runtime config.
//
// Flow: the owner pastes the admin secret (BOT_CONFIG_SECRET), clicks Load to
// pull the current config from /api/bot-config, edits the fields, then Save.
// The secret is held only in component state and sent as a Bearer token on
// each request -- it is never persisted to the config store or the URL.
//
// The UI is split into three panels:
//   1. Admin secret (unlock) -- with a reveal toggle.
//   2. VGen session -- the cookie is the only editable credential; the user id
//      is derived client-side from the cookie's v-session JWT, and the chat
//      token is shown read-only for inspection (the bot now derives a live one
//      at runtime from the cookie).
//   3. Discord + timezone -- single notification channel + IANA timezone.

const ENDPOINT = '/api/bot-config'

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
  const match = cookie.match(
    new RegExp('(?:^|;\\s*)' + name + '=([^;]*)')
  )
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
  const [revealCookie, setRevealCookie] = useState(false)
  const [config, setConfig] = useState(EMPTY)
  const [chatToken, setChatToken] = useState('')
  const [updatedAt, setUpdatedAt] = useState(null)
  const [loaded, setLoaded] = useState(false)
  const [busy, setBusy] = useState(false)
  const [status, setStatus] = useState(null) // { kind: 'ok' | 'error', text }

  const derivedUserId = deriveUserId(config.vgenCookie)

  function setField(key, value) {
    setConfig((prev) => ({ ...prev, [key]: value }))
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
      {/* Panel 1 -- Admin secret ------------------------------------------- */}
      <Panel title="Admin secret" subtitle="Unlock the config with BOT_CONFIG_SECRET.">
        <label className="block">
          <span className="text-xs font-semibold text-[#2d2d3a]">Secret</span>
          <div className="mt-1.5 flex gap-2">
            <div className="relative flex-1">
              <input
                type={showSecret ? 'text' : 'password'}
                value={secret}
                onChange={(e) => setSecret(e.target.value)}
                placeholder="BOT_CONFIG_SECRET"
                autoComplete="off"
                className="w-full rounded-lg border border-[#e0e4ee] px-3 py-2 pr-10 text-sm text-[#2d2d3a] outline-none transition focus:border-[#5b8de8] focus:ring-2 focus:ring-[#5b8de8]/15"
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

      {/* Panel 2 -- VGen session ------------------------------------------- */}
      <Panel
        title="VGen session"
        subtitle="Paste the cookie; the user id and chat token are derived automatically."
      >
        <fieldset disabled={!loaded || busy} className="space-y-4 disabled:opacity-60">
          <Field
            label="VGen user ID"
            hint="Derived from the cookie's v-session token. Read-only."
          >
            <ReadOnly value={derivedUserId} mono placeholder="Derived from cookie" />
          </Field>

          <Field
            label="VGen cookie"
            hint="Full cookie string (v-refresh + cf_clearance at minimum). Pushed automatically by the relay."
            action={
              <RevealToggle
                shown={revealCookie}
                onClick={() => setRevealCookie((v) => !v)}
              />
            }
          >
            <textarea
              value={config.vgenCookie}
              onChange={(e) => setField('vgenCookie', e.target.value)}
              rows={4}
              spellCheck={false}
              placeholder="v-refresh=...; cf_clearance=...; ..."
              style={{ filter: revealCookie ? 'none' : 'blur(4px)' }}
              className="w-full resize-y rounded-lg border border-[#e0e4ee] px-3 py-2 font-mono text-xs text-[#2d2d3a] outline-none transition focus:border-[#5b8de8] focus:ring-2 focus:ring-[#5b8de8]/15"
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

      {/* Panel 3 -- Discord + timezone ------------------------------------- */}
      <Panel
        title="Discord & timezone"
        subtitle="Where the bot posts, and how it reads milestone dates."
      >
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

function Panel({ title, subtitle, children }) {
  return (
    <section className="rounded-2xl border border-[#e5e9f4] bg-white p-6 shadow-sm">
      <header className="mb-4">
        <h2 className="text-sm font-semibold text-[#2d2d3a]">{title}</h2>
        {subtitle && (
          <p className="mt-0.5 text-[11px] text-[#9a9ab5]">{subtitle}</p>
        )}
      </header>
      {children}
    </section>
  )
}

function Field({ label, hint, action, children }) {
  return (
    <label className="block">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-semibold text-[#2d2d3a]">{label}</span>
        {action}
      </div>
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

// Small text toggle used as a Field action (e.g. reveal a blurred cookie).
function RevealToggle({ shown, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="text-[11px] font-semibold text-[#5b8de8] transition hover:text-[#4a7ad3]"
    >
      {shown ? 'Hide' : 'Reveal'}
    </button>
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
