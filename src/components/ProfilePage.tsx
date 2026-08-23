import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { nameFromEmail, initialsFromName } from '../lib/userDisplay'

interface ProfilePageProps {
  userId: string
  email: string
}

/**
 * Reached by clicking the sidebar's profile block (Feedback Sprint 3,
 * 23/8/26) — previously that block was purely decorative. Shows the same
 * derived name/initials Sidebar.tsx already computes (now shared via
 * lib/userDisplay.ts, so the two can't drift) plus the account's join
 * date, and is where account-level settings live going forward — starting
 * with two-factor authentication (see TwoFactorSettings.tsx, added the
 * same sprint).
 */
export function ProfilePage({ userId, email }: ProfilePageProps) {
  const name = nameFromEmail(email)
  const initials = initialsFromName(name)
  const [joined, setJoined] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    // getUser() rather than getSession() — the session object App.tsx
    // already holds doesn't carry created_at on its own `user`, but a
    // fresh getUser() call always returns the full user record.
    supabase.auth.getUser().then(({ data }) => {
      if (cancelled) return
      const createdAt = data.user?.created_at
      if (createdAt) {
        setJoined(new Date(createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' }))
      }
    })
    return () => {
      cancelled = true
    }
  }, [userId])

  return (
    <div className="profile-page">
      <div className="profile-header">
        <span className="profile-avatar" aria-hidden="true">{initials}</span>
        <div className="profile-header-text">
          <h1>{name}</h1>
          <p className="profile-email">{email}</p>
          {joined && <p className="profile-joined">Member since {joined}</p>}
        </div>
      </div>
    </div>
  )
}
