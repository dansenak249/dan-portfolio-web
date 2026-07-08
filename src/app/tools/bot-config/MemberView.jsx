'use client'

// Member view: self-service card for a signed-in team member.
// ------------------------------------------------------------------
// A member (role 'member') manages everything needed to keep their OWN poller
// running and routing correctly, without any admin controls:
//   - Account   : change their display name + password (username is locked).
//   - VGen       : paste their cookie, Verify it resolves to their own account,
//                  and see the derived chat token / user id.
//   - Notify     : their single self-mapping -- Discord id + per-event toggles
//                  (Like / Follow / Message / Commission).
//   - Poller     : their poller token (the Bearer their machine authenticates
//                  with) for reference.
//
// Auth: every request carries the member's own token (their pollerSecret) as the
// Bearer. The server derives the member's scope from the token, so no userId is
// trusted from the client (the credentials PATCH targets session.userId, which
// the server re-checks against the token owner).

import { useEffect, useState } from 'react'
import LoadingScreen from '../../../components/LoadingScreen'
import {
  ENDPOINT,
  USERS_ENDPOINT,
  VERIFY_COOKIE_ENDPOINT,
  Panel,
  Field,
  TextInput,
  ReadOnly,
  StatusLight,
  StatusText,
  CheckToggle,
  EyeButton,
  computeCookie,
  computePoller,
  deriveUserId,
  firstMapping,
  buildSelfMapping,
} from './shared'

// Auto-clear a success caption after this long so the footer doesn't stay green.
const OK_CLEAR_MS = 2500

export default function MemberView({ session, onLogout }) {
  const [loaded, setLoaded] = useState(false)
  const [busy, setBusy] = useState(false)
  const [status, setStatus] = useState(null) // { kind: 'ok' | 'error', text }

  // Account (username is locked; password blank means "keep current").
  const [displayName, setDisplayName] = useState(session.displayName || '')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showToken, setShowToken] = useState(false)

  // VGen session.
  const [cookie, setCookie] = useState('')
  const [chatToken, setChatToken] = useState('')
  const [accountHandle, setAccountHandle] = useState('')
  const [cookieUpdatedAt, setCookieUpdatedAt] = useState(null)
  const [pollerHeartbeatAt, setPollerHeartbeatAt] = useState(null)
  const [verifyStatus, setVerifyStatus] = useState(null)

  // Single self-mapping (this member -> their own Discord user). Seeded from the
  // stored config on load so the toggles reflect the REAL saved routing.
  const [discordId, setDiscordId] = useState('')
  const [notifyLike, setNotifyLike] = useState(false)
  const [notifyFollow, setNotifyFollow] = useState(false)
  const [notifyMessage, setNotifyMessage] = useState(false)
  const [notifyCommission, setNotifyCommission] = useState(false)

  const [cookieLight, setCookieLight] = useState(() => computeCookie(false, null))
  const [pollerLight, setPollerLight] = useState(() => computePoller(false, null))

  const derivedUserId = deriveUserId(cookie)
  const userUrl = `${USERS_ENDPOINT}/${encodeURIComponent(session.userId)}`

  useEffect(() => {
    setCookieLight(computeCookie(loaded, cookieUpdatedAt))
  }, [loaded, cookieUpdatedAt])

  useEffect(() => {
    setPollerLight(computePoller(loaded, pollerHeartbeatAt))
  }, [loaded, pollerHeartbeatAt])

  // Authorized fetch helper: attaches the member Bearer + no-store, throws on
  // non-2xx with the server's error message.
  async function authFetch(url, options = {}) {
    const res = await fetch(url, {
      ...options,
      cache: 'no-store',
      headers: {
        ...(options.headers || {}),
        Authorization: `Bearer ${session.token}`,
      },
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      throw new Error(data?.error || `HTTP ${res.status}`)
    }
    return data
  }

  // Pull the member's own config once, on mount. The GET is redacted (no
  // password) but includes the cookie, derived tokens, handle, and the stored
  // userMappings that seed the notification toggles.
  useEffect(() => {
    let cancelled = false
    async function load() {
      setBusy(true)
      setStatus(null)
      try {
        const data = await authFetch(ENDPOINT)
        if (cancelled) return
        setCookie(data.vgenCookie ?? '')
        setChatToken(data.vgenChatToken ?? '')
        setAccountHandle(data.vgenAccountHandle ?? '')
        setCookieUpdatedAt(data.vgenCookieUpdatedAt ?? null)
        setPollerHeartbeatAt(data.pollerHeartbeatAt ?? null)
        const map = firstMapping(data.userMappings)
        setDiscordId(map.discordId)
        setNotifyLike(map.like)
        setNotifyFollow(map.follow)
        setNotifyMessage(map.message)
        setNotifyCommission(map.commission)
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
    // Only re-run if the token identity changes.
  }, [session.token]) // eslint-disable-line react-hooks/exhaustive-deps

  function flashOk(text) {
    setStatus({ kind: 'ok', text })
    setTimeout(() => setStatus((s) => (s && s.kind === 'ok' ? null : s)), OK_CLEAR_MS)
  }

  // Verify: resolve the pasted cookie to the account it belongs to and adopt the
  // fetched handle, so the member can confirm they grabbed their OWN cookie.
  async function handleVerify() {
    if (!cookie.trim()) {
      setVerifyStatus({ kind: 'error', text: 'Paste a cookie first' })
      return
    }
    setVerifyStatus({ kind: 'pending', text: 'Verifying...' })
    try {
      const data = await authFetch(VERIFY_COOKIE_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cookie }),
      })
      if (data.handle) setAccountHandle(data.handle)
      const label = data.handle
        ? `@${data.handle}${data.displayName ? ` (${data.displayName})` : ''}`
        : `id ${data.userId} -- no public handle found`
      setVerifyStatus({ kind: data.handle ? 'ok' : 'error', text: `Verified: ${label}` })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Verify failed'
      setVerifyStatus({ kind: 'error', text: message })
    }
  }

  // Save credentials (PATCH /users/self: displayName + optional password) then
  // config (PUT /bot-config: cookie, handle, and the single self-mapping).
  async function handleSave() {
    setBusy(true)
    setStatus({ kind: 'pending', text: 'Saving...' })
    try {
      const credentials = { displayName }
      if (password) credentials.password = password
      await authFetch(userUrl, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(credentials),
      })

      const saved = await authFetch(ENDPOINT, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vgenCookie: cookie,
          vgenAccountHandle: accountHandle,
          userMappings: buildSelfMapping({
            handle: accountHandle,
            discordId,
            like: notifyLike,
            follow: notifyFollow,
            message: notifyMessage,
            commission: notifyCommission,
          }),
        }),
      })
      setCookieUpdatedAt(saved.vgenCookieUpdatedAt ?? cookieUpdatedAt)
      setPollerHeartbeatAt(saved.pollerHeartbeatAt ?? pollerHeartbeatAt)
      setPassword('') // clear the change-password field after a successful save
      flashOk('Saved')
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
          Signed in as <b>{session.displayName || session.username}</b>
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

      {/* Account card ------------------------------------------------------ */}
      <Panel>
        <h3 className="text-sm font-semibold text-[#2d2d3a]">Account</h3>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <Field label="Username" hint="Your login name. Managed by your admin.">
            <ReadOnly value={session.username} placeholder="Assigned by admin" />
          </Field>
          <Field label="Display name" hint="Shown when you sign in.">
            <TextInput value={displayName} onChange={setDisplayName} placeholder="Your name" />
          </Field>
        </div>
        <div className="mt-4">
          <Field label="Change password" hint="Leave blank to keep your current password.">
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="New password"
                autoComplete="new-password"
                className="w-full rounded-lg border border-[#e0e4ee] px-3 py-2 pr-10 text-sm text-[#2d2d3a] outline-none transition focus:border-[#5b8de8] focus:ring-2 focus:ring-[#5b8de8]/15 [&::-ms-clear]:hidden [&::-ms-reveal]:hidden"
              />
              <EyeButton shown={showPassword} onClick={() => setShowPassword((v) => !v)} />
            </div>
          </Field>
        </div>
      </Panel>

      {/* VGen session card ------------------------------------------------- */}
      <Panel
        corner={
          <span className="flex items-center gap-3">
            <StatusLight color={cookieLight.color} label={cookieLight.label} text="Cookie" />
            <StatusLight color={pollerLight.color} label={pollerLight.label} text="Poller" />
          </span>
        }
      >
        <h3 className="text-sm font-semibold text-[#2d2d3a]">VGen session</h3>
        <fieldset disabled={!loaded || busy} className="mt-4 space-y-4 disabled:opacity-60">
          <Field
            label="VGen cookie"
            hint="Full cookie string from your browser. Paste it here, then Verify. Ctrl+A to select."
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

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleVerify}
              className="rounded-lg border border-[#5b8de8] px-4 py-1.5 text-xs font-semibold text-[#5b8de8] transition hover:bg-[#5b8de8] hover:text-white"
            >
              Verify cookie
            </button>
            {/* Fixed-height slot so the verdict never shifts the layout. */}
            <div className="h-5 flex-1 truncate leading-5">
              <StatusText status={verifyStatus} />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="VGen account handle" hint="Auto-fetched on Verify. Notification recipient.">
              <ReadOnly value={accountHandle} placeholder="Verify to fetch" />
            </Field>
            <Field label="VGen user ID" hint="Derived from the cookie's v-session.">
              <ReadOnly value={derivedUserId} mono placeholder="From cookie" />
            </Field>
          </div>

          <Field label="VGen chat token" hint="Auto-derived by the bot at runtime.">
            <ReadOnly value={chatToken} mono placeholder="Derived by the bot" />
          </Field>
        </fieldset>
      </Panel>

      {/* Notification config card ------------------------------------------ */}
      <Panel>
        <h3 className="text-sm font-semibold text-[#2d2d3a]">Notifications</h3>
        <fieldset disabled={!loaded || busy} className="mt-4 space-y-4 disabled:opacity-60">
          <Field
            label="Your Discord user ID"
            hint="Where the bot pings you. Leave blank to post plain @handle text with no mention."
          >
            <TextInput value={discordId} onChange={setDiscordId} placeholder="e.g. 519521795145990146" />
          </Field>
          <Field label="Notify me about" hint="Pick which VGen events the bot announces for you.">
            <div className="flex flex-wrap gap-4 pt-1">
              <CheckToggle label="Like" checked={notifyLike} onChange={setNotifyLike} />
              <CheckToggle label="Follow" checked={notifyFollow} onChange={setNotifyFollow} />
              <CheckToggle label="Message" checked={notifyMessage} onChange={setNotifyMessage} />
              <CheckToggle label="Commission" checked={notifyCommission} onChange={setNotifyCommission} />
            </div>
          </Field>
        </fieldset>
      </Panel>

      {/* Poller token card ------------------------------------------------- */}
      <Panel>
        <Field
          label="Your poller token"
          hint="Used by the installer to set up your machine's poller. Keep it private; ask your admin to rotate it if it leaks."
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
          {busy ? 'Working...' : 'Save changes'}
        </button>
      </div>
    </div>
  )
}
