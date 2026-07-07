'use client'

// Admin view: member management + the full per-user config editor.
// ------------------------------------------------------------------
// A signed-in admin (role 'admin') authenticates with their own token (their
// pollerSecret, which the store treats as master-level via the role check). All
// requests carry that Bearer; the target member is chosen with the ?userId=
// query param, never a raw secret.
//
// Layout:
//   1. Members panel  -- list + select + create + per-member credential edits.
//   2. Config editor  -- appears once a member is selected: VGen session,
//      Discord channel + timezone, and the VGen->Discord mapping table, all
//      scoped to the selected member.

import { useEffect, useState } from 'react'
import LoadingScreen from '../../../components/LoadingScreen'
import {
  ENDPOINT,
  USERS_ENDPOINT,
  TIMEZONES,
  Panel,
  Field,
  TextInput,
  ReadOnly,
  StatusLight,
  EyeButton,
  MappingTable,
  computeCookie,
  computePoller,
  deriveUserId,
} from './shared'

const EMPTY_CONFIG = {
  vgenCookie: '',
  reminderChannelId: '',
  vgenChatToken: '',
  vgenAccountHandle: '',
  timelineTimezone: 'Asia/Ho_Chi_Minh',
}

export default function AdminView({ session, onLogout }) {
  const { token } = session

  const [users, setUsers] = useState([])
  const [selectedUserId, setSelectedUserId] = useState('')
  const [busy, setBusy] = useState(false)
  const [status, setStatus] = useState(null) // { kind, text }

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

  async function loadUsers() {
    setBusy(true)
    setStatus(null)
    try {
      const data = await authFetch(USERS_ENDPOINT)
      setUsers(Array.isArray(data.users) ? data.users : [])
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to load members'
      setStatus({ kind: 'error', text: message })
    } finally {
      setBusy(false)
    }
  }

  useEffect(() => {
    loadUsers()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token])

  return (
    <div className="space-y-5">
      {busy && <LoadingScreen />}

      {/* Header: who is signed in + logout */}
      <div className="flex items-center justify-between px-1">
        <div className="text-sm text-[#2d2d3a]">
          Signed in as <b>{session.displayName || session.username}</b>
          <span className="ml-2 rounded-full bg-[#fdeef4] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[#e0517a]">
            admin
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

      {status && (
        <p
          className={`px-1 text-xs ${
            status.kind === 'ok' ? 'text-[#2e9e6b]' : 'text-[#e0517a]'
          }`}
        >
          {status.text}
        </p>
      )}

      <MembersPanel
        users={users}
        selectedUserId={selectedUserId}
        onSelect={setSelectedUserId}
        authFetch={authFetch}
        onChanged={loadUsers}
        setBusy={setBusy}
        setStatus={setStatus}
      />

      {selectedUserId && (
        <ConfigEditor
          key={selectedUserId}
          userId={selectedUserId}
          authFetch={authFetch}
          setBusy={setBusy}
          setStatus={setStatus}
        />
      )}
    </div>
  )
}

// --- Members management ----------------------------------------------------

function MembersPanel({
  users,
  selectedUserId,
  onSelect,
  authFetch,
  onChanged,
  setBusy,
  setStatus,
}) {
  const [newUsername, setNewUsername] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [newDisplayName, setNewDisplayName] = useState('')

  async function createUser() {
    if (!newUsername.trim() || !newPassword) {
      setStatus({ kind: 'error', text: 'Username and password are required.' })
      return
    }
    setBusy(true)
    setStatus(null)
    try {
      const created = await authFetch(USERS_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: newUsername.trim(),
          password: newPassword,
          displayName: newDisplayName.trim(),
        }),
      })
      setNewUsername('')
      setNewPassword('')
      setNewDisplayName('')
      setStatus({ kind: 'ok', text: `Member "${created.username}" created.` })
      await onChanged()
      if (created.userId) onSelect(created.userId)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Create failed'
      setStatus({ kind: 'error', text: message })
    } finally {
      setBusy(false)
    }
  }

  return (
    <Panel>
      <div className="space-y-4">
        <div>
          <span className="text-xs font-semibold text-[#2d2d3a]">Members</span>
          <span className="mt-0.5 block text-[11px] text-[#9a9ab5]">
            Select a member to edit their config, or add a new one. You assign the
            username + password; the server mints their poller secret.
          </span>
        </div>

        {/* Member list */}
        {users.length === 0 ? (
          <p className="text-xs text-[#9a9ab5]">No members yet. Add one below.</p>
        ) : (
          <div className="space-y-1.5">
            {users.map((user) => (
              <MemberRow
                key={user.userId}
                user={user}
                selected={user.userId === selectedUserId}
                onSelect={() => onSelect(user.userId)}
                authFetch={authFetch}
                onChanged={onChanged}
                setBusy={setBusy}
                setStatus={setStatus}
              />
            ))}
          </div>
        )}

        {/* Add member */}
        <div className="rounded-xl border border-dashed border-[#c3cbe0] p-4">
          <span className="text-xs font-semibold text-[#2d2d3a]">Add member</span>
          <div className="mt-2 grid gap-2 sm:grid-cols-3">
            <TextInput
              value={newUsername}
              onChange={setNewUsername}
              placeholder="username"
            />
            <TextInput
              value={newPassword}
              onChange={setNewPassword}
              placeholder="password"
            />
            <TextInput
              value={newDisplayName}
              onChange={setNewDisplayName}
              placeholder="display name (optional)"
            />
          </div>
          <button
            type="button"
            onClick={createUser}
            className="mt-3 rounded-lg bg-[#2d2d3a] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#40405a]"
          >
            + Create member
          </button>
        </div>
      </div>
    </Panel>
  )
}

// One member row: summary + expandable credential editor. Because "khoa chinh la
// secret", the admin can freely view/edit the human username + password here for
// forgotten-password recovery; the real boundary is the poller secret.
function MemberRow({
  user,
  selected,
  onSelect,
  authFetch,
  onChanged,
  setBusy,
  setStatus,
}) {
  const [open, setOpen] = useState(false)
  const [username, setUsername] = useState(user.username || '')
  const [password, setPassword] = useState(user.password || '')
  const [displayName, setDisplayName] = useState(user.displayName || '')
  const [showPassword, setShowPassword] = useState(false)

  const userUrl = `${USERS_ENDPOINT}/${encodeURIComponent(user.userId)}`

  async function saveCreds() {
    setBusy(true)
    setStatus(null)
    try {
      await authFetch(userUrl, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: username.trim(),
          password,
          displayName,
        }),
      })
      setStatus({ kind: 'ok', text: `Updated "${username.trim()}".` })
      await onChanged()
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Update failed'
      setStatus({ kind: 'error', text: message })
    } finally {
      setBusy(false)
    }
  }

  async function regenerateSecret() {
    if (
      !window.confirm(
        `Rotate ${user.username}'s poller secret? Their machine must re-enroll with the new one.`
      )
    ) {
      return
    }
    setBusy(true)
    setStatus(null)
    try {
      await authFetch(userUrl, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ regenerateSecret: true }),
      })
      setStatus({ kind: 'ok', text: `Secret rotated for "${user.username}".` })
      await onChanged()
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Rotate failed'
      setStatus({ kind: 'error', text: message })
    } finally {
      setBusy(false)
    }
  }

  async function deleteUser() {
    if (!window.confirm(`Delete member "${user.username}"? This cannot be undone.`)) {
      return
    }
    setBusy(true)
    setStatus(null)
    try {
      await authFetch(userUrl, { method: 'DELETE' })
      setStatus({ kind: 'ok', text: `Deleted "${user.username}".` })
      await onChanged()
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Delete failed'
      setStatus({ kind: 'error', text: message })
    } finally {
      setBusy(false)
    }
  }

  return (
    <div
      className={`rounded-xl border transition ${
        selected ? 'border-[#5b8de8] bg-[#5b8de8]/5' : 'border-[#e5e9f4]'
      }`}
    >
      {/* Row header */}
      <div className="flex items-center gap-2 px-3 py-2">
        <button
          type="button"
          onClick={onSelect}
          className="flex-1 text-left"
        >
          <span className="text-sm font-semibold text-[#2d2d3a]">
            {user.displayName || user.username}
          </span>
          <span className="ml-2 text-[11px] text-[#9a9ab5]">@{user.username}</span>
          <span className="ml-2 inline-flex items-center gap-1 text-[10px] text-[#9a9ab5]">
            <span
              className="inline-block h-1.5 w-1.5 rounded-full"
              style={{ backgroundColor: user.hasCookie ? '#2e9e6b' : '#c7c9d6' }}
            />
            cookie
          </span>
        </button>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="rounded-md border border-[#e0e4ee] px-2 py-1 text-[11px] font-semibold text-[#6b6b82] transition hover:border-[#5b8de8] hover:text-[#5b8de8]"
        >
          {open ? 'Close' : 'Credentials'}
        </button>
      </div>

      {/* Credential editor */}
      {open && (
        <div className="space-y-3 border-t border-[#e5e9f4] px-3 py-3">
          <div className="grid gap-2 sm:grid-cols-3">
            <label className="block">
              <span className="text-[11px] font-semibold text-[#6b6b82]">Username</span>
              <TextInput value={username} onChange={setUsername} placeholder="username" />
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
              <TextInput
                value={displayName}
                onChange={setDisplayName}
                placeholder="display name"
              />
            </label>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={saveCreds}
              className="rounded-lg bg-[#5b8de8] px-4 py-1.5 text-xs font-semibold text-white transition hover:bg-[#4a7ad3]"
            >
              Save credentials
            </button>
            <button
              type="button"
              onClick={regenerateSecret}
              className="rounded-lg border border-[#e0e4ee] px-4 py-1.5 text-xs font-semibold text-[#6b6b82] transition hover:border-[#5b8de8] hover:text-[#5b8de8]"
            >
              Rotate poller secret
            </button>
            <button
              type="button"
              onClick={deleteUser}
              className="rounded-lg border border-[#f0d3dc] px-4 py-1.5 text-xs font-semibold text-[#c3859a] transition hover:border-[#e0517a] hover:text-[#e0517a]"
            >
              Delete member
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// --- Per-user config editor ------------------------------------------------

function ConfigEditor({ userId, authFetch, setBusy, setStatus }) {
  const [config, setConfig] = useState(EMPTY_CONFIG)
  const [chatToken, setChatToken] = useState('')
  const [mappings, setMappings] = useState([])
  const [dragIndex, setDragIndex] = useState(null)
  const [updatedAt, setUpdatedAt] = useState(null)
  const [cookieUpdatedAt, setCookieUpdatedAt] = useState(null)
  const [pollerHeartbeatAt, setPollerHeartbeatAt] = useState(null)
  const [loaded, setLoaded] = useState(false)
  const [saving, setSaving] = useState(false)
  const [cookieLight, setCookieLight] = useState(() => computeCookie(false, null))
  const [pollerLight, setPollerLight] = useState(() => computePoller(false, null))

  const derivedUserId = deriveUserId(config.vgenCookie)
  const configUrl = `${ENDPOINT}?userId=${encodeURIComponent(userId)}`

  useEffect(() => {
    setCookieLight(computeCookie(loaded, cookieUpdatedAt))
  }, [loaded, cookieUpdatedAt])

  useEffect(() => {
    setPollerLight(computePoller(loaded, pollerHeartbeatAt))
  }, [loaded, pollerHeartbeatAt])

  // Load the selected member's config on mount / when the userId changes.
  useEffect(() => {
    let cancelled = false
    async function load() {
      setBusy(true)
      setStatus(null)
      try {
        const data = await authFetch(configUrl)
        if (cancelled) return
        setConfig({
          vgenCookie: data.vgenCookie ?? '',
          reminderChannelId: data.reminderChannelId ?? '',
          vgenChatToken: data.vgenChatToken ?? '',
          vgenAccountHandle: data.vgenAccountHandle ?? '',
          timelineTimezone: data.timelineTimezone ?? 'Asia/Ho_Chi_Minh',
        })
        setChatToken(data.vgenChatToken ?? '')
        setMappings(
          Array.isArray(data.userMappings)
            ? data.userMappings.map((m) => ({
                name: m.name ?? '',
                vgenId: m.vgenId ?? '',
                discordId: m.discordId ?? '',
                like: Boolean(m.like),
                follow: Boolean(m.follow),
                message: Boolean(m.message),
              }))
            : []
        )
        setUpdatedAt(data.updatedAt ?? null)
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId])

  function setField(key, value) {
    setConfig((prev) => ({ ...prev, [key]: value }))
  }

  // --- mapping table helpers (immutable) ---
  function addMapping() {
    setMappings((prev) => [
      ...prev,
      { name: '', vgenId: '', discordId: '', like: false, follow: false, message: false },
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

  async function handleSave() {
    setSaving(true)
    setBusy(true)
    setStatus(null)
    try {
      const data = await authFetch(configUrl, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vgenCookie: config.vgenCookie,
          reminderChannelId: config.reminderChannelId,
          timelineTimezone: config.timelineTimezone,
          vgenAccountHandle: config.vgenAccountHandle,
          userMappings: mappings,
        }),
      })
      setUpdatedAt(data.updatedAt ?? null)
      setCookieUpdatedAt(data.vgenCookieUpdatedAt ?? null)
      setPollerHeartbeatAt(data.pollerHeartbeatAt ?? null)
      setStatus({ kind: 'ok', text: 'Saved. The bot will pick this up shortly.' })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Save failed'
      setStatus({ kind: 'error', text: message })
    } finally {
      setSaving(false)
      setBusy(false)
    }
  }

  return (
    <>
      {/* VGen session ---------------------------------------------------- */}
      <Panel
        corner={
          <span className="flex items-center gap-3">
            <StatusLight color={cookieLight.color} label={cookieLight.label} text="Cookie" />
            <StatusLight color={pollerLight.color} label={pollerLight.label} text="Poller" />
          </span>
        }
      >
        <fieldset disabled={!loaded || saving} className="space-y-4 disabled:opacity-60">
          <Field
            label="VGen account handle"
            hint="This member's VGen @handle. The notification recipient, so the bot can tag their mapped Discord user instead of writing 'you'."
          >
            <TextInput
              value={config.vgenAccountHandle}
              onChange={(v) => setField('vgenAccountHandle', v)}
              placeholder="e.g. dansenak249"
            />
          </Field>

          <Field
            label="VGen cookie"
            hint="Full cookie string. Usually pushed from the member's machine via `npm run relay-cookie`."
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

          <Field
            label="VGen user ID"
            hint="Derived from the cookie's v-session token. Read-only."
          >
            <ReadOnly value={derivedUserId} mono placeholder="Derived from cookie" />
          </Field>
        </fieldset>
      </Panel>

      {/* Discord + timezone --------------------------------------------- */}
      <Panel>
        <fieldset disabled={!loaded || saving} className="space-y-4 disabled:opacity-60">
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

      {/* VGen -> Discord mapping ---------------------------------------- */}
      <Panel>
        <fieldset disabled={!loaded || saving} className="space-y-3 disabled:opacity-60">
          <div>
            <span className="text-xs font-semibold text-[#2d2d3a]">
              VGen &rarr; Discord mapping
            </span>
            <span className="mt-0.5 block text-[11px] text-[#9a9ab5]">
              Match a VGen <b>@handle</b> (same form as the account handle above,
              e.g. <b>dansenak249</b> &mdash; NOT the UUID) to a Discord user. The
              bot tags that user instead of plain text. Toggle which events tag.
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

      {/* Footer: last saved + Save */}
      <div className="flex items-center justify-between gap-3 px-1">
        <div className="min-h-[1.25rem] text-xs">
          {updatedAt && (
            <span className="text-[#9a9ab5]">
              Last saved {new Date(updatedAt).toLocaleString()}
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={handleSave}
          disabled={!loaded || saving}
          className="rounded-lg bg-[#5b8de8] px-5 py-2 text-sm font-semibold text-white transition hover:bg-[#4a7ad3] disabled:opacity-50"
        >
          {saving ? 'Working...' : 'Save'}
        </button>
      </div>
    </>
  )
}
