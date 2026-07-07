'use client'

// Bot config surface: login gate + role router.
// ------------------------------------------------------------------
// Nothing but the login screen renders until the caller authenticates. On a
// successful sign-in the server returns { role, userId, username, displayName,
// token }; we hold that session in component state (never persisted) and route:
//   - admin  -> AdminView  (member management + full per-user config editor)
//   - member -> MemberView (their own cookie + poller-token section only)
//
// The token is the caller's pollerSecret and is used as the Bearer for every
// subsequent request. Signing out simply drops the session from memory.

import { useState } from 'react'
import LoginGate from './LoginGate'
import AdminView from './AdminView'
import MemberView from './MemberView'

export default function BotConfigForm() {
  const [session, setSession] = useState(null)

  if (!session) {
    return <LoginGate onSuccess={setSession} />
  }

  const handleLogout = () => setSession(null)

  if (session.role === 'admin') {
    return <AdminView session={session} onLogout={handleLogout} />
  }

  return <MemberView session={session} onLogout={handleLogout} />
}
