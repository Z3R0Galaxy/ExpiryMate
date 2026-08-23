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
 * with two-factor authentication (see TwoFactorSettings below, added the
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
      <TwoFactorSettings />
    </div>
  )
}

type TwoFactorStatus = 'loading' | 'off' | 'enrolling' | 'on' | 'disabling'

/**
 * Two-factor authentication settings (Feedback Sprint 3, 23/8/26) — opt-in
 * from this page rather than mandatory for every account (see
 * docs/decisions.md, "Feedback Sprint 3"). Uses Supabase Auth's built-in
 * TOTP MFA API directly (enroll/challenge/verify/unenroll/listFactors) —
 * no separate table or edge function needed, Supabase stores the factor
 * against the account itself. The sign-in-time half of this (asking for a
 * code after password sign-in) lives in MfaChallenge.tsx and is wired up
 * in App.tsx's top-level App() component.
 */
function TwoFactorSettings() {
  const [status, setStatus] = useState<TwoFactorStatus>('loading')
  const [factorId, setFactorId] = useState<string | null>(null)
  const [qrCode, setQrCode] = useState<string | null>(null)
  const [secret, setSecret] = useState<string | null>(null)
  const [code, setCode] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  // Inlined directly in the effect (rather than a separately-defined
  // function called from it) with the same cancelled-flag pattern
  // ProfilePage's own join-date effect above uses — setStatus only ever
  // runs inside the .then() continuation, never synchronously in the
  // effect body itself.
  useEffect(() => {
    let cancelled = false
    supabase.auth.mfa.listFactors().then(({ data, error: listError }) => {
      if (cancelled) return
      if (listError || !data) {
        setStatus('off')
        return
      }
      const verified = data.totp.find(f => f.status === 'verified')
      if (verified) {
        setFactorId(verified.id)
        setStatus('on')
      } else {
        setStatus('off')
      }
    })
    return () => {
      cancelled = true
    }
  }, [])

  async function startEnroll() {
    setError(null)
    setBusy(true)
    // Supabase refuses a fresh enroll() while an earlier, never-confirmed
    // attempt is still sitting there unverified (e.g. the user closed the
    // tab mid-setup last time) — clear those out first rather than making
    // the user hunt down why "Enable" silently fails.
    // Supabase's own TS types claim `data.totp` only ever holds 'verified'
    // factors (it doesn't, in practice — see the SDK's own listFactors
    // docs), so unverified ones have to be found via the untyped `data.all`
    // instead, filtered down to this account's totp factors by hand.
    const { data: existing } = await supabase.auth.mfa.listFactors()
    if (existing) {
      for (const f of existing.all.filter(f => f.factor_type === 'totp' && f.status === 'unverified')) {
        await supabase.auth.mfa.unenroll({ factorId: f.id })
      }
    }
    const { data, error: enrollError } = await supabase.auth.mfa.enroll({ factorType: 'totp' })
    setBusy(false)
    if (enrollError || !data) {
      setError(enrollError?.message ?? 'Could not start setup. Try again.')
      return
    }
    setFactorId(data.id)
    setQrCode(data.totp.qr_code)
    setSecret(data.totp.secret)
    setCode('')
    setStatus('enrolling')
  }

  async function confirmEnroll(e: React.FormEvent) {
    e.preventDefault()
    if (!factorId) return
    setBusy(true)
    setError(null)
    const { data: challenge, error: challengeError } = await supabase.auth.mfa.challenge({ factorId })
    if (challengeError || !challenge) {
      setBusy(false)
      setError(challengeError?.message ?? 'Could not verify that code. Try again.')
      return
    }
    const { error: verifyError } = await supabase.auth.mfa.verify({ factorId, challengeId: challenge.id, code: code.trim() })
    setBusy(false)
    if (verifyError) {
      setError('Incorrect code. Check your authenticator app and try again.')
      return
    }
    setQrCode(null)
    setSecret(null)
    setCode('')
    setStatus('on')
  }

  async function cancelEnroll() {
    if (factorId) await supabase.auth.mfa.unenroll({ factorId })
    setFactorId(null)
    setQrCode(null)
    setSecret(null)
    setCode('')
    setError(null)
    setStatus('off')
  }

  function startDisable() {
    setCode('')
    setError(null)
    setStatus('disabling')
  }

  async function confirmDisable(e: React.FormEvent) {
    e.preventDefault()
    if (!factorId) return
    setBusy(true)
    setError(null)
    // Require a fresh code before disabling, the same as enabling —
    // otherwise anyone who gets hold of an already-signed-in session could
    // turn two-factor off without ever proving they hold the authenticator.
    const { data: challenge, error: challengeError } = await supabase.auth.mfa.challenge({ factorId })
    if (challengeError || !challenge) {
      setBusy(false)
      setError(challengeError?.message ?? 'Could not verify that code. Try again.')
      return
    }
    const { error: verifyError } = await supabase.auth.mfa.verify({ factorId, challengeId: challenge.id, code: code.trim() })
    if (verifyError) {
      setBusy(false)
      setError('Incorrect code. Check your authenticator app and try again.')
      return
    }
    const { error: unenrollError } = await supabase.auth.mfa.unenroll({ factorId })
    setBusy(false)
    if (unenrollError) {
      setError(unenrollError.message)
      return
    }
    setFactorId(null)
    setCode('')
    setStatus('off')
  }

  function handleCodeChange(e: React.ChangeEvent<HTMLInputElement>) {
    setCode(e.target.value.replace(/\D/g, '').slice(0, 6))
  }

  return (
    <div className="settings-section">
      <h2>Two-factor authentication</h2>

      {status === 'loading' && <p className="settings-muted">Checking...</p>}

      {status === 'off' && (
        <>
          <p className="settings-muted">
            Add an extra step at sign-in using an authenticator app like Google
            Authenticator, Authy, or 1Password.
          </p>
          <button type="button" onClick={startEnroll} disabled={busy}>
            {busy ? 'Starting...' : 'Enable two-factor authentication'}
          </button>
        </>
      )}

      {status === 'enrolling' && (
        <form className="mfa-form" onSubmit={confirmEnroll}>
          <p className="settings-muted">
            Scan this code with your authenticator app, then enter the 6-digit
            code it shows you.
          </p>
          {qrCode && <img className="mfa-qr" src={qrCode} alt="QR code for two-factor authentication setup" />}
          {secret && (
            <p className="mfa-secret">
              Can't scan it? Enter this code manually: <code>{secret}</code>
            </p>
          )}
          <input
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            placeholder="123456"
            value={code}
            onChange={handleCodeChange}
            aria-label="6-digit code from your authenticator app"
          />
          {error && <p className="error">{error}</p>}
          <div className="mfa-form-actions">
            <button type="submit" disabled={busy || code.length !== 6}>
              {busy ? 'Confirming...' : 'Confirm'}
            </button>
            <button type="button" className="secondary-button" onClick={cancelEnroll} disabled={busy}>
              Cancel
            </button>
          </div>
        </form>
      )}

      {status === 'on' && (
        <>
          <p className="settings-status-on">Two-factor authentication is on.</p>
          <button type="button" className="danger-button" onClick={startDisable} disabled={busy}>
            Disable
          </button>
        </>
      )}

      {status === 'disabling' && (
        <form className="mfa-form" onSubmit={confirmDisable}>
          <p className="settings-muted">
            Enter a code from your authenticator app to confirm turning
            two-factor authentication off.
          </p>
          <input
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            placeholder="123456"
            value={code}
            onChange={handleCodeChange}
            aria-label="6-digit code from your authenticator app"
          />
          {error && <p className="error">{error}</p>}
          <div className="mfa-form-actions">
            <button type="submit" className="danger-button" disabled={busy || code.length !== 6}>
              {busy ? 'Disabling...' : 'Disable'}
            </button>
            <button type="button" className="secondary-button" onClick={() => setStatus('on')} disabled={busy}>
              Cancel
            </button>
          </div>
        </form>
      )}
    </div>
  )
}
