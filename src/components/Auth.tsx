import { useState } from 'react'
import { supabase } from '../lib/supabase'

export function Auth() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isSignUp, setIsSignUp] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  // Lets the user check what they actually typed before submitting —
  // added 25/8/26 after feedback that a masked password field with no way
  // to double-check it is an easy way to lock yourself out on a typo,
  // especially on sign-up where there's no confirm-password field to catch
  // a mismatch. See docs/decisions.md.
  const [showPassword, setShowPassword] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setMessage(null)
    setLoading(true)

    if (isSignUp) {
      // Explicitly points the confirmation email's link at wherever this
      // page is actually running (window.location.origin), rather than
      // relying only on Supabase's dashboard-configured "Site URL" default.
      // That default drifted back to localhost at some point after being
      // fixed once already (see docs/decisions.md, "Auth redirect URL
      // fix"), which is exactly the "the link takes them to a localhost
      // site" bug this is closing — this way the redirect is correct
      // whether someone signs up from the deployed app or from a local
      // dev server, without depending on a dashboard setting staying put.
      // Supabase still requires this exact origin to be present in the
      // project's Auth → URL Configuration → Redirect URLs allow-list, or
      // it silently falls back to the Site URL anyway — see decisions.md.
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: window.location.origin },
      })
      if (error) setError(error.message)
      else setMessage('Check your email to confirm your account.')
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) setError(error.message)
    }

    setLoading(false)
  }

  return (
    <div className="auth-container">
      <h1>ExpiryMate</h1>
      <h2>{isSignUp ? 'Create account' : 'Sign in'}</h2>
      <form onSubmit={handleSubmit} className="auth-form">
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          required
        />
        <div className="password-field">
          <input
            type={showPassword ? 'text' : 'password'}
            placeholder="Password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
          />
          <button
            type="button"
            className="password-toggle"
            onClick={() => setShowPassword(s => !s)}
            aria-label={showPassword ? 'Hide password' : 'Show password'}
            title={showPassword ? 'Hide password' : 'Show password'}
          >
            {showPassword ? (
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" />
                <circle cx="12" cy="12" r="3" />
                <path d="M4 4l16 16" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
            )}
          </button>
        </div>
        {error && <p className="error">{error}</p>}
        {message && <p className="success">{message}</p>}
        <button type="submit" disabled={loading}>
          {loading ? 'Loading...' : isSignUp ? 'Sign Up' : 'Sign In'}
        </button>
      </form>
      <button className="toggle-auth" onClick={() => { setIsSignUp(!isSignUp); setError(null); setMessage(null) }}>
        {isSignUp ? 'Already have an account? Sign in' : "Don't have an account? Sign up"}
      </button>
    </div>
  )
}
