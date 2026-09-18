'use client'

// Read tokens: the API keys that let an outsider pull the competitor census.
// ------------------------------------------------------------------
// A token is NOT an account. Accounts (the member cards above) can write -- run
// a crawl, purge a category. A token can only GET the export. That split is the
// whole point of this panel: a colleague who wants to analyse the data, or who
// wants to point an LLM at it, should not be handed something that can delete
// days of crawling.
//
// Rows are ordered by dragging the handle, and the order is the array order the
// server stores -- there is no separate rank field to fall out of step. The
// reorder is persisted once on drop, not on every hover, so dragging across ten
// rows is one request rather than ten.

import { useEffect, useState } from 'react'
import { TOKENS_ENDPOINT, EXPORT_PATH, Panel, TextInput, StatusText, EyeButton } from './shared'

const OK_CLEAR_MS = 2500

// Three bars. Drawn inline rather than pulled from an icon set because it is the
// only icon this panel needs and the rest of the surface already inlines its SVGs.
function GripIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <line x1="4" y1="7" x2="20" y2="7" />
      <line x1="4" y1="12" x2="20" y2="12" />
      <line x1="4" y1="17" x2="20" y2="17" />
    </svg>
  )
}

export default function TokenPanel({ authFetch }) {
  const [tokens, setTokens] = useState([])
  const [loaded, setLoaded] = useState(false)
  const [status, setStatus] = useState(null)
  const [busy, setBusy] = useState(false)
  const [newName, setNewName] = useState('')
  const [newValue, setNewValue] = useState('')

  // Which row is being dragged. `draggable` is switched on only while the grip
  // is held, so a click-drag anywhere else in the row still selects text.
  const [dragId, setDragId] = useState(null)
  const [gripId, setGripId] = useState(null)

  useEffect(() => {
    let cancelled = false
    authFetch(TOKENS_ENDPOINT)
      .then((data) => {
        if (cancelled) return
        setTokens(Array.isArray(data.tokens) ? data.tokens : [])
      })
      .catch((error) => {
        if (cancelled) return
        setStatus({ kind: 'error', text: error.message || 'Failed to load tokens' })
      })
      .finally(() => {
        if (!cancelled) setLoaded(true)
      })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function flashOk(text) {
    setStatus({ kind: 'ok', text })
    setTimeout(() => setStatus((s) => (s && s.kind === 'ok' ? null : s)), OK_CLEAR_MS)
  }

  // Every mutation returns the full list, so the panel never has to merge a
  // partial update into what it already has.
  async function mutate(url, options, okText) {
    setBusy(true)
    setStatus({ kind: 'pending', text: 'Saving...' })
    try {
      const data = await authFetch(url, options)
      if (Array.isArray(data.tokens)) setTokens(data.tokens)
      flashOk(okText)
      return true
    } catch (error) {
      setStatus({ kind: 'error', text: error.message || 'Failed' })
      return false
    } finally {
      setBusy(false)
    }
  }

  async function addToken() {
    const ok = await mutate(
      TOKENS_ENDPOINT,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName.trim(), value: newValue.trim() }),
      },
      'Token added'
    )
    if (ok) {
      setNewName('')
      setNewValue('')
    }
  }

  function rowUrl(id, patch, okText) {
    return mutate(
      `${TOKENS_ENDPOINT}/${encodeURIComponent(id)}`,
      {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
      },
      okText
    )
  }

  async function removeToken(row) {
    if (
      !window.confirm(
        `Revoke "${row.name || row.token.slice(0, 8)}"? Anyone using it loses access immediately.`
      )
    ) {
      return
    }
    await mutate(
      `${TOKENS_ENDPOINT}/${encodeURIComponent(row.id)}`,
      { method: 'DELETE' },
      'Token revoked'
    )
  }

  // --- drag to sort --------------------------------------------------------

  function handleDragOver(targetId) {
    if (!dragId || dragId === targetId) return
    setTokens((prev) => {
      const from = prev.findIndex((t) => t.id === dragId)
      const to = prev.findIndex((t) => t.id === targetId)
      if (from === -1 || to === -1) return prev
      const next = [...prev]
      const [moved] = next.splice(from, 1)
      next.splice(to, 0, moved)
      return next
    })
  }

  async function handleDrop() {
    setDragId(null)
    setGripId(null)
    // The visible order is already the new one; this only tells the server.
    await mutate(
      TOKENS_ENDPOINT,
      {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: tokens.map((t) => t.id) }),
      },
      'Order saved'
    )
  }

  return (
    <Panel>
      <fieldset disabled={busy} className="space-y-4 disabled:opacity-60">
        <div className="flex items-start justify-between gap-3">
          <div>
            <span className="text-xs font-semibold text-[#2d2d3a]">API read tokens</span>
            <span className="mt-0.5 block text-[11px] text-[#9a9ab5]">
              Read-only keys for{' '}
              <code className="rounded bg-[#f2f4fa] px-1">{EXPORT_PATH}</code>. They can
              pull the competitor census and nothing else -- crawling, editing and
              purging still need an account. Drag the handle to reorder.
            </span>
          </div>
          <StatusText status={status} />
        </div>

        {loaded && tokens.length === 0 && (
          <p className="rounded-xl border border-dashed border-[#e0e4ee] px-3 py-4 text-center text-[11px] text-[#9a9ab5]">
            No tokens yet. Add one below and send the URL to whoever needs the data.
          </p>
        )}

        <div className="space-y-2">
          {tokens.map((row) => (
            <TokenRow
              key={row.id}
              row={row}
              dragging={dragId === row.id}
              draggable={gripId === row.id}
              onGrip={(on) => setGripId(on ? row.id : null)}
              onDragStart={() => setDragId(row.id)}
              onDragOver={() => handleDragOver(row.id)}
              onDrop={handleDrop}
              onRename={(name) => rowUrl(row.id, { name }, 'Renamed')}
              onSetValue={(value) => rowUrl(row.id, { value }, 'Token changed')}
              onRegenerate={() => rowUrl(row.id, { regenerate: true }, 'New token generated')}
              onDelete={() => removeToken(row)}
            />
          ))}
        </div>

        {/* Add: a blank value means "mint one for me", which is the usual case. */}
        <div className="grid gap-2 sm:grid-cols-[12rem_1fr_auto]">
          <TextInput value={newName} onChange={setNewName} placeholder="token name (e.g. Mai)" />
          <TextInput
            value={newValue}
            onChange={setNewValue}
            placeholder="leave blank to generate automatically"
          />
          <button
            type="button"
            onClick={addToken}
            className="rounded-lg bg-[#2d2d3a] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#40405a]"
          >
            + Add token
          </button>
        </div>
      </fieldset>
    </Panel>
  )
}

function TokenRow({
  row,
  dragging,
  draggable,
  onGrip,
  onDragStart,
  onDragOver,
  onDrop,
  onRename,
  onSetValue,
  onRegenerate,
  onDelete,
}) {
  const [name, setName] = useState(row.name || '')
  const [value, setValue] = useState(row.token)
  const [shown, setShown] = useState(false)
  const [copied, setCopied] = useState(false)

  // The row is re-created from the server response after every mutation, so the
  // local drafts follow whatever the server actually stored.
  useEffect(() => {
    setName(row.name || '')
    setValue(row.token)
  }, [row.name, row.token])

  const dirty = name !== (row.name || '') || value !== row.token
  const fullUrl =
    typeof window === 'undefined'
      ? ''
      : `${window.location.origin}${EXPORT_PATH}?token=${row.token}`

  async function copyUrl() {
    try {
      await navigator.clipboard.writeText(fullUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      // Clipboard access can be refused (insecure context, permissions). The URL
      // is visible in the field either way, so there is nothing to recover from.
    }
  }

  function save() {
    if (name !== (row.name || '')) onRename(name)
    if (value !== row.token) onSetValue(value)
  }

  return (
    <div
      draggable={draggable}
      onDragStart={onDragStart}
      onDragOver={(e) => {
        e.preventDefault()
        onDragOver()
      }}
      onDrop={(e) => {
        e.preventDefault()
        onDrop()
      }}
      onDragEnd={onDrop}
      className={`rounded-xl border p-3 transition ${
        dragging ? 'border-[#5b8de8] bg-[#f5f8ff] opacity-70' : 'border-[#eef1f8] bg-white'
      }`}
    >
      <div className="flex items-center gap-2">
        <span
          onMouseDown={() => onGrip(true)}
          onMouseUp={() => onGrip(false)}
          title="Drag to reorder"
          className="cursor-grab select-none px-1 text-[#c7c9d6] transition hover:text-[#5b8de8] active:cursor-grabbing"
        >
          <GripIcon />
        </span>

        <div className="w-40 shrink-0">
          <TextInput value={name} onChange={setName} placeholder="name" />
        </div>

        <div className="relative min-w-0 flex-1">
          <input
            type={shown ? 'text' : 'password'}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            spellCheck={false}
            autoComplete="off"
            className="w-full rounded-lg border border-[#e0e4ee] px-3 py-2 pr-10 font-mono text-xs text-[#2d2d3a] outline-none transition focus:border-[#5b8de8] focus:ring-2 focus:ring-[#5b8de8]/15 [&::-ms-clear]:hidden [&::-ms-reveal]:hidden"
          />
          <EyeButton shown={shown} onClick={() => setShown((v) => !v)} />
        </div>

        <div className="flex shrink-0 items-center gap-1.5">
          {dirty && (
            <button
              type="button"
              onClick={save}
              className="rounded-md bg-[#5b8de8] px-2.5 py-1 text-[11px] font-semibold text-white transition hover:bg-[#4a7ad3]"
            >
              Save
            </button>
          )}
          <button
            type="button"
            onClick={onRegenerate}
            title="Replace with a freshly generated token"
            className="rounded-md border border-[#e0e4ee] px-2.5 py-1 text-[11px] font-semibold text-[#6b6b82] transition hover:border-[#5b8de8] hover:text-[#5b8de8]"
          >
            Generate
          </button>
          <button
            type="button"
            onClick={copyUrl}
            className="w-20 rounded-md border border-[#e0e4ee] px-2.5 py-1 text-[11px] font-semibold text-[#6b6b82] transition hover:border-[#5b8de8] hover:text-[#5b8de8]"
          >
            {copied ? 'Copied' : 'Copy URL'}
          </button>
          <button
            type="button"
            onClick={onDelete}
            className="rounded-md border border-[#f0d3dc] px-2.5 py-1 text-[11px] font-semibold text-[#c3859a] transition hover:border-[#e0517a] hover:text-[#e0517a]"
          >
            Revoke
          </button>
        </div>
      </div>

      <div className="mt-1.5 pl-8 text-[10px] text-[#9a9ab5]">
        {row.lastUsedAt
          ? `Last used ${new Date(row.lastUsedAt).toLocaleString()}`
          : 'Never used'}
        {row.createdAt && ` -- created ${new Date(row.createdAt).toLocaleDateString()}`}
      </div>
    </div>
  )
}
