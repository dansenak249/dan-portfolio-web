'use client'

// Login-first screen for the bot-config surface.
// ------------------------------------------------------------------
// The ONLY thing rendered before authentication. It exchanges a username +
// password for a session via POST /api/bot-config/login, then hands the parent
// the resolved { role, userId, username, displayName, token }. The token is the
// caller's pollerSecret and becomes the Bearer for every subsequent request;
// an admin's token grants master-level access via the store's role check, so the
// env master secret is never exposed to the browser.

import { useState } from 'react'
import { LOGIN_ENDPOINT, LAST_USERNAME_KEY, EyeButton } from './shared'

// Read the remembered username once, on first render (SSR-safe: window is only
// touched inside the initializer, which never runs on the server).
function rememberedUsername() {
  if (typeof window === 'undefined') return ''
  try {
    return window.localStorage.getItem(LAST_USERNAME_KEY) || ''
  } catch {
    return ''
  }
}

export default function LoginGate({ onSuccess }) {
  // Prefill the last-used username so a returning user only types their password.
  const [username, setUsername] = useState(rememberedUsername)
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)

  async function handleSubmit(event) {
    event.preventDefault()
    if (!username.trim() || !password) {
      setError('Enter your username and password.')
      return
    }
    setBusy(true)
    setError(null)
    try {
      const res = await fetch(LOGIN_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        cache: 'no-store',
        body: JSON.stringify({ username: username.trim(), password }),
      })
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data?.error || `HTTP ${res.status}`)
      }
      // Remember the username for next time (password is never stored).
      try {
        window.localStorage.setItem(LAST_USERNAME_KEY, username.trim())
      } catch {
        // localStorage may be unavailable (private mode) -- ignore.
      }
      onSuccess(data)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Login failed'
      setError(message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mx-auto max-w-sm">
      <section className="rounded-2xl border border-[#e5e9f4] bg-white p-6 shadow-sm">
        <h2 className="text-base font-semibold text-[#2d2d3a]">Sign in</h2>
        <p className="mt-1 text-[11px] text-[#9a9ab5]">
          Use the username and password assigned by your admin.
        </p>

        <form onSubmit={handleSubmit} className="mt-4 space-y-3">
          <label className="block">
            <span className="text-xs font-semibold text-[#2d2d3a]">Username</span>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="e.g. dansenak249"
              autoComplete="username"
              className="mt-1.5 w-full rounded-lg border border-[#e0e4ee] px-3 py-2 text-sm text-[#2d2d3a] outline-none transition focus:border-[#5b8de8] focus:ring-2 focus:ring-[#5b8de8]/15"
            />
          </label>

          <label className="block">
            <span className="text-xs font-semibold text-[#2d2d3a]">Password</span>
            <div className="relative mt-1.5">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
                autoComplete="current-password"
                className="w-full rounded-lg border border-[#e0e4ee] px-3 py-2 pr-10 text-sm text-[#2d2d3a] outline-none transition focus:border-[#5b8de8] focus:ring-2 focus:ring-[#5b8de8]/15 [&::-ms-clear]:hidden [&::-ms-reveal]:hidden"
              />
              <EyeButton
                shown={showPassword}
                onClick={() => setShowPassword((v) => !v)}
              />
            </div>
          </label>

          <div className="min-h-[1.1rem] text-xs">
            {error && <span className="text-[#e0517a]">{error}</span>}
          </div>

          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-lg bg-[#5b8de8] px-5 py-2 text-sm font-semibold text-white transition hover:bg-[#4a7ad3] disabled:opacity-50"
          >
            {busy ? 'Signing in...' : 'Sign in'}
          </button>
        </form>
      </section>
    </div>
  )
}
