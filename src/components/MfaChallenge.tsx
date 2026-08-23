import { useState } from 'react'
import { supabase } from '../lib/supabase'

interface MfaChallengeProps {
  onVerified: () => void
  onSignOut: () => void
}

/**
 * Sign-in-time gate for accounts that have enabled two-factor
 * authentication (Feedback Sprint 3, 23/8/26). App.tsx's top-level App()
 * renders this instead of AuthenticatedApp whenever
 * supabase.auth.mfa.getAuthenticatorAssuranceLevel() reports the session
 * hasn't reached aal2 yet but a verified TOTP factor says it needs to —
 * see the enrollment side of this in ProfilePage.tsx's TwoFactorSettings.
 * Reuses the .auth-screen/.auth-container/.auth-form styling Auth.tsx
 * already defines rather than inventing a second look for what is,
 * visually, just another step of signing in.
 */
export function MfaChallenge({ onVerified, onSignOut }: MfaChallengeProps) {
  const [code, setCode] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setError(null)

    const { data: factorsData, error: factorsError } = await supabase.auth.mfa.listFactors()
    const factor = factorsData?.totp.find(f => f.status === 'verified')
    if (factorsError || !factor) {
      setSubmitting(false)
      setError(factorsError?.message ?? 'Could not find your authenticator. Try signing in again.')
      return
    }

    const { data: challenge, error: challengeError } = await supabase.auth.mfa.challenge({ factorId: factor.id })
    if (challengeError || !challenge) {
      setSubmitting(false)
      setError(challengeError?.message ?? 'Could not verify that code. Try again.')
      return
    }

    const { error: verifyError } = await supabase.auth.mfa.verify({
      factorId: factor.id,
      challengeId: challenge.id,
      code: code.trim(),
    })
    setSubmitting(false)
    if (verifyError) {
      setError('Incorrect code. Check your authenticator app and try again.')
      return
    }
    onVerified()
  }

  return (
    <div className="auth-screen">
      <div className="auth-container">
        <h1>ExpiryMate</h1>
        <h2>Enter your code</h2>
        <p className="settings-muted">
          Open your authenticator app and enter the 6-digit code for
          ExpiryMate.
        </p>
        <form onSubmit={handleSubmit} className="auth-form">
          <input
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            placeholder="123456"
            value={code}
            onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
            aria-label="6-digit code from your authenticator app"
            autoFocus
          />
          {error && <p className="error">{error}</p>}
          <button type="submit" disabled={submitting || code.length !== 6}>
            {submitting ? 'Verifying...' : 'Verify'}
          </button>
        </form>
        <button type="button" className="toggle-auth" onClick={onSignOut}>
          Sign out
        </button>
      </div>
    </div>
  )
}
