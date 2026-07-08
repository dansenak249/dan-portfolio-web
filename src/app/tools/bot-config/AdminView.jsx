'use client'

// Admin view: preloaded member cards + one global notification channel.
// ------------------------------------------------------------------
// On sign-in the admin's own token (their pollerSecret, treated as master-level
// by the store's role check) preloads EVERY member's full config in a single
// pass -- one loading screen, no per-click fetching afterwards. The admin's own
// card is expanded by default; other cards open instantly (data is already in
// memory) and multiple can be open at once.
//
// Each card holds one member end-to-end: credentials (username / password /
// display name), their VGen session (cookie first, then the auto-fetched handle
// / chat token / user id), and their notifications (the Discord user to tag +
// the per-event toggles + timezone). Every member maps only to THEMSELVES, so
// the mapping is a single self-mapping: vgenId is the member's own handle; only
// the Discord id + event toggles are edited here.
//
// The VGen cookie is the primary field: pasting it and hitting Verify resolves
// which account it belongs to (via the public profile feed) so the admin can't
// accidentally save the wrong person's cookie while testing.
//
// The Discord *notification channel* (where the bot posts) is a single shared,
// admin-owned setting -- edited once in a panel at the very bottom of the page.

import { useEffect, useState } from 'react'
import LoadingScreen from '../../../components/LoadingScreen'
import {
  ENDPOINT,
  USERS_ENDPOINT,
  VERIFY_COOKIE_ENDPOINT,
  TIMEZONES,
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

// Auto-clear a success caption after this long so a card doesn't stay green.
const OK_CLEAR_MS = 2500

export default function AdminView({ session, onLogout }) {
  const { token } = session

  const [records, setRecords] = useState([]) // full per-user configs (preloaded)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(null)
  const [createStatus, setCreateStatus] = useState(null)
  const [showCreate, setShowCreate] = useState(false) // add-member panel hidden by default

  // Authorized fetch helper: attaches the admin Bearer + no-store.
  async function authFetch(url, options = {}) {
    const res = await fetch(url, {
      ...options,
      cache: 'no-store',
      headers: {
        ...(options.headers || {}),
        Authorization: `Bearer ${token}`,
      },
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      throw new Error(data?.error || `HTTP ${res.status}`)
    }
    return data
  }

  // Preload: list members, then pull each member's full config in parallel.
  useEffect(() => {
    let cancelled = false
    async function preload() {
      setLoading(true)
      setLoadError(null)
      try {
        const list = await authFetch(USERS_ENDPOINT)
        const summaries = Array.isArray(list.users) ? list.users : []
        const configs = await Promise.all(
          summaries.map((u) =>
            authFetch(`${ENDPOINT}?userId=${encodeURIComponent(u.userId)}`)
          )
        )
        if (cancelled) return
        setRecords(configs)
      } catch (error) {
        if (cancelled) return
        const message = error instanceof Error ? error.message : 'Failed to load members'
        setLoadError(message)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    preload()
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token])

  // In-memory patches so nothing is refetched after the initial preload.
  function replaceRecord(updated) {
    setRecords((prev) =>
      prev.map((r) => (r.userId === updated.userId ? updated : r))
    )
  }
  function removeRecord(userId) {
    setRecords((prev) => prev.filter((r) => r.userId !== userId))
  }

  async function createMember({ username, password, displayName }) {
    setCreateStatus({ kind: 'pending', text: 'Creating...' })
    try {
      const created = await authFetch(USERS_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password, displayName }),
      })
      setRecords((prev) => [...prev, created])
      setCreateStatus({ kind: 'ok', text: `Created "${created.username}"` })
      setTimeout(() => setCreateStatus(null), OK_CLEAR_MS)
      return true
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Create failed'
      setCreateStatus({ kind: 'error', text: message })
      return false
    }
  }

  const adminRecord = records.find((r) => r.userId === session.userId) || null

  return (
    <div className="space-y-5">
      {loading && <LoadingScreen />}

      {/* Header: who is signed in + add-member toggle + logout */}
      <div className="flex items-center justify-between px-1">
        <div className="text-sm text-[#2d2d3a]">
          Signed in as <b>{session.displayName || session.username}</b>
          <span className="ml-2 rounded-full bg-[#fdeef4] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[#e0517a]">
            admin
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowCreate((v) => !v)}
            title="Add member"
            aria-expanded={showCreate}
            className={`flex items-center gap-1 rounded-lg border px-3 py-1.5 text-xs font-semibold transition ${
              showCreate
                ? 'border-[#5b8de8] text-[#5b8de8]'
                : 'border-[#e0e4ee] text-[#6b6b82] hover:border-[#5b8de8] hover:text-[#5b8de8]'
            }`}
          >
            <span className="text-sm leading-none">{showCreate ? '\u00D7' : '+'}</span>
            <span>Member</span>
          </button>
          <button
            type="button"
            onClick={onLogout}
            className="rounded-lg border border-[#e0e4ee] px-3 py-1.5 text-xs font-semibold text-[#6b6b82] transition hover:border-[#c3859a] hover:text-[#e0517a]"
          >
            Sign out
          </button>
        </div>
      </div>

      {/* Add member (hidden until the + toggle is pressed) */}
      {showCreate && <CreateMemberPanel status={createStatus} onCreate={createMember} />}

      {loadError && <p className="px-1 text-xs text-[#e0517a]">{loadError}</p>}

      {/* Member cards */}
      {!loading && (
        <div className="space-y-3">
          {records.map((record) => (
            <MemberCard
              key={record.userId}
              record={record}
              defaultOpen={record.userId === session.userId}
              authFetch={authFetch}
              onSaved={replaceRecord}
              onDeleted={removeRecord}
            />
          ))}
        </div>
      )}

      {/* Global notification channel (admin-owned, one shared destination) */}
      {!loading && adminRecord && (
        <NotificationChannelPanel record={adminRecord} authFetch={authFetch} onSaved={replaceRecord} />
      )}
    </div>
  )
}

// --- Create member ---------------------------------------------------------

function CreateMemberPanel({ status, onCreate }) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [displayName, setDisplayName] = useState('')

  async function submit() {
    const ok = await onCreate({
      username: username.trim(),
      password,
      displayName: displayName.trim(),
    })
    if (ok) {
      setUsername('')
      setPassword('')
      setDisplayName('')
    }
  }

  return (
    <Panel>
      <div className="space-y-3">
        <div>
          <span className="text-xs font-semibold text-[#2d2d3a]">Add member</span>
          <span className="mt-0.5 block text-[11px] text-[#9a9ab5]">
            You assign the username + password; the server mints their poller
            secret. Display name is optional (falls back to the username).
          </span>
        </div>
        <div className="grid gap-2 sm:grid-cols-3">
          <TextInput value={username} onChange={setUsername} placeholder="username" />
          <TextInput value={password} onChange={setPassword} placeholder="password" />
          <TextInput
            value={displayName}
            onChange={setDisplayName}
            placeholder="display name (optional)"
          />
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={submit}
            className="rounded-lg bg-[#2d2d3a] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#40405a]"
          >
            + Create member
          </button>
          <StatusText status={status} />
        </div>
      </div>
    </Panel>
  )
}

// --- Global notification channel -------------------------------------------

function NotificationChannelPanel({ record, authFetch, onSaved }) {
  const [channelId, setChannelId] = useState(record.reminderChannelId || '')
  const [status, setStatus] = useState(null)
  const [busy, setBusy] = useState(false)
  const configUrl = `${ENDPOINT}?userId=${encodeURIComponent(record.userId)}`

  async function save() {
    setBusy(true)
    setStatus({ kind: 'pending', text: 'Saving...' })
    try {
      const saved = await authFetch(configUrl, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reminderChannelId: channelId }),
      })
      onSaved(saved)
      setStatus({ kind: 'ok', text: 'Saved' })
      setTimeout(() => setStatus((s) => (s && s.kind === 'ok' ? null : s)), OK_CLEAR_MS)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Save failed'
      setStatus({ kind: 'error', text: message })
    } finally {
      setBusy(false)
    }
  }

  return (
    <Panel>
      <fieldset disabled={busy} className="space-y-3 disabled:opacity-60">
        <Field
          label="Discord notification channel ID"
          hint="Administration setting: the single shared channel where the bot posts VGen notifications and timeline reminders for the whole team."
        >
          <TextInput
            value={channelId}
            onChange={setChannelId}
            placeholder="123456789012345678"
          />
        </Field>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={save}
            className="rounded-lg bg-[#5b8de8] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#4a7ad3]"
          >
            Save channel
          </button>
          <StatusText status={status} />
        </div>
      </fieldset>
    </Panel>
  )
}

// --- Member card -----------------------------------------------------------

const CHEVRON = 'M6 9l6 6 6-6'

function MemberCard({ record, defaultOpen, authFetch, onSaved, onDeleted }) {
  const [open, setOpen] = useState(Boolean(defaultOpen))
  const [status, setStatus] = useState(null)
  const [busy, setBusy] = useState(false)

  // Editable credentials.
  const [username, setUsername] = useState(record.username || '')
  const [password, setPassword] = useState(record.password || '')
  const [displayName, setDisplayName] = useState(record.displayName || '')
  const [showPassword, setShowPassword] = useState(false)

  // Editable config. The handle is auto-fetched by Verify (read-only display).
  const [vgenAccountHandle, setVgenAccountHandle] = useState(record.vgenAccountHandle || '')
  const [vgenCookie, setVgenCookie] = useState(record.vgenCookie || '')
  const [timelineTimezone, setTimelineTimezone] = useState(
    record.timelineTimezone || 'Asia/Ho_Chi_Minh'
  )
  const [verifyStatus, setVerifyStatus] = useState(null) // persistent verify result

  // Single self-mapping (this member -> their own Discord user).
  const selfMapping = firstMapping(record.userMappings)
  const [discordId, setDiscordId] = useState(selfMapping.discordId)
  const [notifyLike, setNotifyLike] = useState(selfMapping.like)
  const [notifyFollow, setNotifyFollow] = useState(selfMapping.follow)
  const [notifyMessage, setNotifyMessage] = useState(selfMapping.message)
  const [notifyCommission, setNotifyCommission] = useState(selfMapping.commission)

  const chatToken = record.vgenChatToken || ''
  const derivedUserId = deriveUserId(vgenCookie)
  const userUrl = `${USERS_ENDPOINT}/${encodeURIComponent(record.userId)}`
  const configUrl = `${ENDPOINT}?userId=${encodeURIComponent(record.userId)}`

  const cookieLight = computeCookie(true, record.vgenCookieUpdatedAt)
  const pollerLight = computePoller(true, record.pollerHeartbeatAt)

  function flashOk(text) {
    setStatus({ kind: 'ok', text })
    setTimeout(() => setStatus((s) => (s && s.kind === 'ok' ? null : s)), OK_CLEAR_MS)
  }

  // Verify: resolve the pasted cookie to the account it belongs to and adopt the
  // fetched handle. Guards against saving the wrong person's cookie by showing
  // exactly whose account it resolves to.
  async function handleVerify() {
    if (!vgenCookie.trim()) {
      setVerifyStatus({ kind: 'error', text: 'Paste a cookie first' })
      return
    }
    setVerifyStatus({ kind: 'pending', text: 'Verifying...' })
    try {
      const data = await authFetch(VERIFY_COOKIE_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cookie: vgenCookie }),
      })
      if (data.handle) setVgenAccountHandle(data.handle)
      const label = data.handle
        ? `@${data.handle}${data.displayName ? ` (${data.displayName})` : ''}`
        : `id ${data.userId} -- no public handle found`
      setVerifyStatus({ kind: data.handle ? 'ok' : 'error', text: `Verified: ${label}` })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Verify failed'
      setVerifyStatus({ kind: 'error', text: message })
    }
  }

  // Build this member's single self-mapping for save (shared with MemberView).
  function buildMappings() {
    return buildSelfMapping({
      handle: vgenAccountHandle,
      discordId,
      like: notifyLike,
      follow: notifyFollow,
      message: notifyMessage,
      commission: notifyCommission,
    })
  }

  // Save credentials (PATCH /users) then config (PUT /bot-config). The config
  // PUT re-reads the just-updated record, so its response reflects both edits.
  async function handleSave() {
    setBusy(true)
    setStatus({ kind: 'pending', text: 'Saving...' })
    try {
      await authFetch(userUrl, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: username.trim(), password, displayName }),
      })
      const savedCfg = await authFetch(configUrl, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vgenAccountHandle,
          vgenCookie,
          timelineTimezone,
          userMappings: buildMappings(),
        }),
      })
      onSaved(savedCfg)
      flashOk('Saved')
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Save failed'
      setStatus({ kind: 'error', text: message })
    } finally {
      setBusy(false)
    }
  }

  async function handleRotate() {
    if (
      !window.confirm(
        `Rotate ${record.username}'s poller secret? Their machine must re-enroll with the new one.`
      )
    ) {
      return
    }
    setBusy(true)
    setStatus({ kind: 'pending', text: 'Rotating...' })
    try {
      const saved = await authFetch(userUrl, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ regenerateSecret: true }),
      })
      onSaved(saved)
      flashOk('Secret rotated')
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Rotate failed'
      setStatus({ kind: 'error', text: message })
    } finally {
      setBusy(false)
    }
  }

  async function handleDelete() {
    if (!window.confirm(`Delete member "${record.username}"? This cannot be undone.`)) {
      return
    }
    setBusy(true)
    setStatus({ kind: 'pending', text: 'Deleting...' })
    try {
      await authFetch(userUrl, { method: 'DELETE' })
      onDeleted(record.userId)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Delete failed'
      setStatus({ kind: 'error', text: message })
      setBusy(false)
    }
  }

  return (
    <section
      className={`overflow-hidden rounded-2xl border bg-white shadow-sm transition-colors ${
        open ? 'border-[#c7d6f2]' : 'border-[#e5e9f4]'
      }`}
    >
      {/* Header: fixed left-packed columns so name / @handle / cookie align */}
      <div className="flex items-center gap-3 px-4 py-3">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="grid flex-1 grid-cols-[16px_10rem_8rem_auto] items-center gap-2 text-left"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={`text-[#9a9ab5] transition-transform duration-300 ${
              open ? 'rotate-180' : ''
            }`}
          >
            <path d={CHEVRON} />
          </svg>
          <span className="truncate text-sm font-semibold text-[#2d2d3a]">
            {displayName || username}
          </span>
          <span className="truncate text-[11px] text-[#9a9ab5]">@{username}</span>
          <span className="flex items-center gap-3 text-[10px] text-[#9a9ab5]">
            <span className="flex items-center gap-1" title={cookieLight.label}>
              <span
                className="inline-block h-1.5 w-1.5 rounded-full"
                style={{ backgroundColor: record.vgenCookie ? cookieLight.color : '#c7c9d6' }}
              />
              cookie
            </span>
            <span className="flex items-center gap-1" title={pollerLight.label}>
              <span
                className="inline-block h-1.5 w-1.5 rounded-full"
                style={{ backgroundColor: pollerLight.color }}
              />
              poller
            </span>
          </span>
        </button>
        <div className="flex shrink-0 items-center gap-3">
          <StatusText status={status} />
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="w-16 rounded-md border border-[#e0e4ee] px-2.5 py-1 text-[11px] font-semibold text-[#6b6b82] transition hover:border-[#5b8de8] hover:text-[#5b8de8]"
          >
            {open ? 'Close' : 'Open'}
          </button>
        </div>
      </div>

      {/* Slide-down body: grid-rows 0fr -> 1fr for jank-free height animation */}
      <div
        className={`grid transition-[grid-template-rows] duration-300 ease-out ${
          open ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
        }`}
      >
        <div className="overflow-hidden">
          <fieldset
            disabled={busy}
            className="space-y-5 border-t border-[#e5e9f4] px-4 py-4 disabled:opacity-60"
          >
            {/* Credentials -- items-end keeps all three inputs on one baseline */}
            <div className="grid items-end gap-2 sm:grid-cols-3">
              <label className="block">
                <span className="text-[11px] font-semibold text-[#6b6b82]">Username</span>
                <div className="mt-1.5">
                  <TextInput value={username} onChange={setUsername} placeholder="username" />
                </div>
              </label>
              <label className="block">
                <span className="text-[11px] font-semibold text-[#6b6b82]">Password</span>
                <div className="relative mt-1.5">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="password"
                    autoComplete="off"
                    className="w-full rounded-lg border border-[#e0e4ee] px-3 py-2 pr-10 text-sm text-[#2d2d3a] outline-none transition focus:border-[#5b8de8] focus:ring-2 focus:ring-[#5b8de8]/15 [&::-ms-clear]:hidden [&::-ms-reveal]:hidden"
                  />
                  <EyeButton shown={showPassword} onClick={() => setShowPassword((v) => !v)} />
                </div>
              </label>
              <label className="block">
                <span className="text-[11px] font-semibold text-[#6b6b82]">Display name</span>
                <div className="mt-1.5">
                  <TextInput
                    value={displayName}
                    onChange={setDisplayName}
                    placeholder="display name"
                  />
                </div>
              </label>
            </div>

            {/* VGen session: cookie first (primary), then auto-fetched fields */}
            <div className="space-y-4 rounded-xl border border-[#eef1f8] p-4">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold uppercase tracking-wide text-[#9a9ab5]">
                  VGen session
                </span>
                <span className="flex items-center gap-3">
                  <StatusLight color={cookieLight.color} label={cookieLight.label} text="Cookie" />
                  <StatusLight color={pollerLight.color} label={pollerLight.label} text="Poller" />
                </span>
              </div>

              {/* Cookie on top + Verify to resolve which account it belongs to */}
              <div>
                <span className="text-xs font-semibold text-[#2d2d3a]">VGen cookie</span>
                <span className="mt-0.5 block text-[11px] text-[#9a9ab5]">
                  Paste the full cookie, then Verify to confirm which account it belongs to
                  before saving. Usually pushed from the member&apos;s machine via
                  {' '}
                  <code className="rounded bg-[#f2f4fa] px-1">npm run relay-cookie</code>.
                </span>
                <div className="mt-1.5 flex gap-2">
                  <input
                    type="text"
                    value={vgenCookie}
                    onChange={(e) => setVgenCookie(e.target.value)}
                    spellCheck={false}
                    placeholder="v-session=...; v-refresh=...; cf_clearance=...; ..."
                    className="min-w-0 flex-1 rounded-lg border border-[#e0e4ee] px-3 py-2 font-mono text-xs text-[#2d2d3a] outline-none transition focus:border-[#5b8de8] focus:ring-2 focus:ring-[#5b8de8]/15"
                  />
                  <button
                    type="button"
                    onClick={handleVerify}
                    className="shrink-0 rounded-lg border border-[#5b8de8] px-3 py-2 text-xs font-semibold text-[#5b8de8] transition hover:bg-[#5b8de8] hover:text-white"
                  >
                    Verify
                  </button>
                </div>
                {/* Fixed-height, single-line slot so the Verify result never
                    shifts the fields below it (empty until Verify runs). h-5
                    fits the text-xs line height without clipping descenders. */}
                <div className="mt-1 h-5 truncate leading-5">
                  <StatusText status={verifyStatus} />
                </div>
              </div>

              {/* Handle + user ID share one row (two equal columns). */}
              <div className="grid gap-4 sm:grid-cols-2">
                <Field
                  label="VGen account handle"
                  hint="Auto-fetched on Verify. Notification recipient."
                >
                  <ReadOnly value={vgenAccountHandle} placeholder="Verify to fetch" />
                </Field>
                <Field
                  label="VGen user ID"
                  hint="Derived from the cookie's v-session."
                >
                  <ReadOnly value={derivedUserId} mono placeholder="From cookie" />
                </Field>
              </div>

              <Field
                label="VGen chat token"
                hint="Auto-derived by the bot at runtime."
              >
                <ReadOnly value={chatToken} mono placeholder="Derived by the bot" />
              </Field>
            </div>

            {/* Notifications: Discord id + per-event toggles (one row) + timezone */}
            <div className="space-y-4 rounded-xl border border-[#eef1f8] p-4">
              <div>
                <span className="text-xs font-semibold text-[#2d2d3a]">Discord user ID</span>
                <span className="mt-0.5 block text-[11px] text-[#9a9ab5]">
                  The Discord user the bot mentions on a VGen event. Commission covers request
                  submit &amp; confirm. Leave blank for plain @handle text.
                </span>
                <div className="mt-1.5 flex flex-wrap items-center gap-x-5 gap-y-3">
                  <div className="min-w-[13rem] flex-1">
                    <TextInput
                      value={discordId}
                      onChange={setDiscordId}
                      placeholder="discord numeric id"
                    />
                  </div>
                  <div className="flex flex-wrap gap-x-5 gap-y-2">
                    <CheckToggle label="Like" checked={notifyLike} onChange={setNotifyLike} />
                    <CheckToggle label="Follow" checked={notifyFollow} onChange={setNotifyFollow} />
                    <CheckToggle label="Message" checked={notifyMessage} onChange={setNotifyMessage} />
                    <CheckToggle
                      label="Commission"
                      checked={notifyCommission}
                      onChange={setNotifyCommission}
                    />
                  </div>
                </div>
              </div>

              <Field
                label="Timezone"
                hint="IANA zone used to interpret commission milestone dates."
              >
                <select
                  value={timelineTimezone}
                  onChange={(e) => setTimelineTimezone(e.target.value)}
                  className="w-full rounded-lg border border-[#e0e4ee] bg-white px-3 py-2 text-sm text-[#2d2d3a] outline-none transition focus:border-[#5b8de8] focus:ring-2 focus:ring-[#5b8de8]/15"
                >
                  {TIMEZONES.map((tz) => (
                    <option key={tz.value} value={tz.value}>
                      {tz.label}
                    </option>
                  ))}
                </select>
              </Field>
            </div>

            {/* Actions */}
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handleSave}
                className="rounded-lg bg-[#5b8de8] px-4 py-1.5 text-xs font-semibold text-white transition hover:bg-[#4a7ad3]"
              >
                Save changes
              </button>
              <button
                type="button"
                onClick={handleRotate}
                className="rounded-lg border border-[#e0e4ee] px-4 py-1.5 text-xs font-semibold text-[#6b6b82] transition hover:border-[#5b8de8] hover:text-[#5b8de8]"
              >
                Rotate poller secret
              </button>
              <button
                type="button"
                onClick={handleDelete}
                className="rounded-lg border border-[#f0d3dc] px-4 py-1.5 text-xs font-semibold text-[#c3859a] transition hover:border-[#e0517a] hover:text-[#e0517a]"
              >
                Delete member
              </button>
              {record.updatedAt && (
                <span className="ml-auto text-[11px] text-[#9a9ab5]">
                  Last saved {new Date(record.updatedAt).toLocaleString()}
                </span>
              )}
            </div>
          </fieldset>
        </div>
      </div>
    </section>
  )
}
