'use client'

import { useState } from 'react'

// Client form for editing the Discord bot runtime config.
//
// Flow: the owner pastes the admin secret (VGEN_ADMIN_SECRET), clicks Load to
// pull the current config from /api/bot-config, edits the fields, then Save.
// The secret is held only in component state and sent as a Bearer token on
// each request — it is never persisted to the config store or the URL.

const ENDPOINT = '/api/bot-config'

const EMPTY = {
  vgenCookie: '',
  vgenChannelId: '',
  reminderChannelId: '',
  timelineTzOffset: 7,
}

export default function BotConfigForm() {
  const [secret, setSecret] = useState('')
  const [config, setConfig] = useState(EMPTY)
  const [updatedAt, setUpdatedAt] = useState(null)
  const [loaded, setLoaded] = useState(false)
  const [busy, setBusy] = useState(false)
  const [status, setStatus] = useState(null) // { kind: 'ok' | 'error', text }

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
        vgenChannelId: data.vgenChannelId ?? '',
        reminderChannelId: data.reminderChannelId ?? '',
        timelineTzOffset: data.timelineTzOffset ?? 7,
      })
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
      const res = await fetch(ENDPOINT, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${secret}`,
        },
        body: JSON.stringify({
          vgenCookie: config.vgenCookie,
          vgenChannelId: config.vgenChannelId,
          reminderChannelId: config.reminderChannelId,
          timelineTzOffset: Number(config.timelineTzOffset),
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
    <div className="rounded-2xl border border-[#e5e9f4] bg-white p-6 shadow-sm">
      {/* Admin secret + Load */}
      <label className="block">
        <span className="text-xs font-semibold text-[#2d2d3a]">
          Admin secret
        </span>
        <div className="mt-1.5 flex gap-2">
          <input
            type="password"
            value={secret}
            onChange={(e) => setSecret(e.target.value)}
            placeholder="VGEN_ADMIN_SECRET"
            autoComplete="off"
            className="flex-1 rounded-lg border border-[#e0e4ee] px-3 py-2 text-sm text-[#2d2d3a] outline-none transition focus:border-[#5b8de8] focus:ring-2 focus:ring-[#5b8de8]/15"
          />
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

      <div className="my-5 h-px bg-[#eef1f8]" />

      {/* Config fields — disabled until a successful load. */}
      <fieldset
        disabled={!loaded || busy}
        className="space-y-4 disabled:opacity-60"
      >
        <Field label="VGen cookie" hint="Full cookie string (v-refresh + cf_clearance at minimum).">
          <textarea
            value={config.vgenCookie}
            onChange={(e) => setField('vgenCookie', e.target.value)}
            rows={4}
            spellCheck={false}
            placeholder="v-refresh=...; cf_clearance=...; ..."
            className="w-full resize-y rounded-lg border border-[#e0e4ee] px-3 py-2 font-mono text-xs text-[#2d2d3a] outline-none transition focus:border-[#5b8de8] focus:ring-2 focus:ring-[#5b8de8]/15"
          />
        </Field>

        <Field label="VGen channel ID" hint="Where VGen notifications are announced. Blank = use reminder channel.">
          <TextInput
            value={config.vgenChannelId}
            onChange={(v) => setField('vgenChannelId', v)}
            placeholder="123456789012345678"
          />
        </Field>

        <Field label="Reminder channel ID" hint="Default channel for timeline reminders.">
          <TextInput
            value={config.reminderChannelId}
            onChange={(v) => setField('reminderChannelId', v)}
            placeholder="123456789012345678"
          />
        </Field>

        <Field label="Timeline TZ offset" hint="Hours from UTC used to interpret milestone dates (VN = 7).">
          <input
            type="number"
            min={-12}
            max={14}
            value={config.timelineTzOffset}
            onChange={(e) => setField('timelineTzOffset', e.target.value)}
            className="w-28 rounded-lg border border-[#e0e4ee] px-3 py-2 text-sm text-[#2d2d3a] outline-none transition focus:border-[#5b8de8] focus:ring-2 focus:ring-[#5b8de8]/15"
          />
        </Field>
      </fieldset>

      {/* Footer: status + Save */}
      <div className="mt-6 flex items-center justify-between gap-3">
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
          {busy ? 'Working…' : 'Save'}
        </button>
      </div>
    </div>
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
