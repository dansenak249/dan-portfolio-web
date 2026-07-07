'use client'

// Member view: the cookie + poller-token section, and nothing else.
// ------------------------------------------------------------------
// A signed-in member (role 'member') sees only what they need to keep their own
// poller running: their VGen cookie (editable, pushed here or via the relay),
// the derived chat token / user id for reference, and their poller token (the
// Bearer their machine authenticates with). All identity/admin controls are
// hidden -- the parent gates on role and never mounts this for admins' extra
// sections.
//
// Auth: every request carries the member's own token (their pollerSecret) as the
// Bearer. The server derives the member's scope from the token, so no userId is
// ever sent from the client.

import { useEffect, useState } from 'react'
import LoadingScreen from '../../../components/LoadingScreen'
import {
  ENDPOINT,
  Panel,
  Field,
  ReadOnly,
  StatusLight,
  EyeButton,
  computeCookie,
  computePoller,
  deriveUserId,
} from './shared'

export default function MemberView({ session, onLogout }) {
  const [cookie, setCookie] = useState('')
  const [chatToken, setChatToken] = useState('')
  const [accountHandle, setAccountHandle] = useState('')
  const [cookieUpdatedAt, setCookieUpdatedAt] = useState(null)
  const [pollerHeartbeatAt, setPollerHeartbeatAt] = useState(null)
  const [loaded, setLoaded] = useState(false)
  const [busy, setBusy] = useState(false)
  const [status, setStatus] = useState(null) // { kind: 'ok' | 'error', text }
  const [showToken, setShowToken] = useState(false)
  const [cookieLight, setCookieLight] = useState(() => computeCookie(false, null))
  const [pollerLight, setPollerLight] = useState(() => computePoller(false, null))

  const derivedUserId = deriveUserId(cookie)

  useEffect(() => {
    setCookieLight(computeCookie(loaded, cookieUpdatedAt))
  }, [loaded, cookieUpdatedAt])

  useEffect(() => {
    setPollerLight(computePoller(loaded, pollerHeartbeatAt))
  }, [loaded, pollerHeartbeatAt])

  // Pull the member's own config once, on mount.
  useEffect(() => {
    let cancelled = false
    async function load() {
      setBusy(true)
      setStatus(null)
      try {
        const res = await fetch(ENDPOINT, {
          headers: { Authorization: `Bearer ${session.token}` },
          cache: 'no-store',
        })
        const data = await res.json()
        if (!res.ok) {
          throw new Error(data?.error || `HTTP ${res.status}`)
        }
        if (cancelled) return
        setCookie(data.vgenCookie ?? '')
        setChatToken(data.vgenChatToken ?? '')
        setAccountHandle(data.vgenAccountHandle ?? '')
        setCookieUpdatedAt(data.vgenCookieUpdatedAt ?? null)
        setPollerHeartbeatAt(data.pollerHeartbeatAt ?? null)
        setLoaded(true)
      } catch (error) {
        if (cancelled) return
        const message = error instanceof Error ? error.message : 'Load failed'
        setStatus({ kind: 'error', text: message })
      } finally {
        if (!cancelled) setBusy(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [session.token])

  async function handleSave() {
    setBusy(true)
    setStatus(null)
    try {
      const res = await fetch(ENDPOINT, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.token}`,
        },
        body: JSON.stringify({ vgenCookie: cookie }),
      })
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data?.error || `HTTP ${res.status}`)
      }
      setCookieUpdatedAt(data.vgenCookieUpdatedAt ?? null)
      setPollerHeartbeatAt(data.pollerHeartbeatAt ?? null)
      setStatus({ kind: 'ok', text: 'Cookie saved. Your poller will pick it up shortly.' })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Save failed'
      setStatus({ kind: 'error', text: message })
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-5">
      {busy && <LoadingScreen />}

      {/* Header: who is signed in + logout */}
      <div className="flex items-center justify-between px-1">
        <div className="text-sm text-[#2d2d3a]">
          Signed in as{' '}
          <b>{session.displayName || session.username}</b>
          <span className="ml-2 rounded-full bg-[#eef2fb] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[#5b8de8]">
            member
          </span>
        </div>
        <button
          type="button"
          onClick={onLogout}
          className="rounded-lg border border-[#e0e4ee] px-3 py-1.5 text-xs font-semibold text-[#6b6b82] transition hover:border-[#c3859a] hover:text-[#e0517a]"
        >
          Sign out
        </button>
      </div>

      {/* VGen session card ------------------------------------------------- */}
      <Panel
        corner={
          <span className="flex items-center gap-3">
            <StatusLight color={cookieLight.color} label={cookieLight.label} text="Cookie" />
            <StatusLight color={pollerLight.color} label={pollerLight.label} text="Poller" />
          </span>
        }
      >
        <fieldset disabled={!loaded || busy} className="space-y-4 disabled:opacity-60">
          <Field
            label="VGen account handle"
            hint="Your VGen @handle. Managed by your admin -- read-only here."
          >
            <ReadOnly value={accountHandle} placeholder="Assigned by admin" />
          </Field>

          <Field
            label="VGen cookie"
            hint="Full cookie string. Pushed from your machine via `npm run relay-cookie`, or paste it here. Ctrl+A to copy."
          >
            <input
              type="text"
              value={cookie}
              onChange={(e) => setCookie(e.target.value)}
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

          <Field
            label="VGen user ID"
            hint="Derived from the cookie's v-session token. Read-only."
          >
            <ReadOnly value={derivedUserId} mono placeholder="Derived from cookie" />
          </Field>
        </fieldset>
      </Panel>

      {/* Poller token card ------------------------------------------------- */}
      <Panel>
        <Field
          label="Your poller token"
          hint="Paste this into your machine's poller (.env POLLER_SECRET). It is the Bearer your poller uses to authenticate. Keep it private; ask your admin to rotate it if it leaks."
        >
          <div className="relative">
            <input
              type={showToken ? 'text' : 'password'}
              value={session.token}
              readOnly
              tabIndex={-1}
              className="w-full rounded-lg border border-dashed border-[#e0e4ee] bg-[#f7f8fc] px-3 py-2 pr-10 font-mono text-xs text-[#6b6b82] outline-none [&::-ms-clear]:hidden [&::-ms-reveal]:hidden"
            />
            <EyeButton shown={showToken} onClick={() => setShowToken((v) => !v)} />
          </div>
        </Field>
      </Panel>

      {/* Footer: status + Save */}
      <div className="flex items-center justify-between gap-3 px-1">
        <div className="min-h-[1.25rem] text-xs">
          {status && (
            <span className={status.kind === 'ok' ? 'text-[#2e9e6b]' : 'text-[#e0517a]'}>
              {status.text}
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={handleSave}
          disabled={!loaded || busy}
          className="rounded-lg bg-[#5b8de8] px-5 py-2 text-sm font-semibold text-white transition hover:bg-[#4a7ad3] disabled:opacity-50"
        >
          {busy ? 'Working...' : 'Save cookie'}
        </button>
      </div>
    </div>
  )
}
