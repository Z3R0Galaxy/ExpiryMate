import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { supabase } from '../lib/supabase'
import { nameFromEmail, initialsFromName } from '../lib/userDisplay'
import type { Theme } from '../hooks/useTheme'

interface ProfilePageProps {
  userId: string
  email: string
  theme: Theme
  onSetTheme: (theme: Theme) => void
  onReplayTour: () => void
  onSignOut: () => void
}

/**
 * Reached by clicking the sidebar's profile block (Feedback Sprint 3,
 * 23/8/26) — previously that block was purely decorative.
 *
 * Fleshed out into the app's real settings page (28/8/26): an identity
 * header with a summary strip, then four cards, each one a
 * <SettingsSection> so they all read as the same kind of thing.
 * Appearance holds the light/dark choice, which used to live as a single
 * icon button in the sidebar footer and now lives only here (see
 * docs/decisions.md, "Profile page build-out"). Notifications surfaces the
 * browser permission that Slice 5's useExpiryNotifications quietly depends
 * on and that previously had no UI at all. Two-factor authentication is
 * unchanged apart from now reporting its on/off state upward for the
 * header strip. Account holds the two whole-account actions: replaying the
 * onboarding tour, and signing out.
 */
export function ProfilePage({ userId, email, theme, onSetTheme, onReplayTour, onSignOut }: ProfilePageProps) {
  const name = nameFromEmail(email)
  const initials = initialsFromName(name)
  const [joined, setJoined] = useState<string | null>(null)
  // null while TwoFactorSettings is still asking Supabase, so the header
  // strip can say "Checking..." rather than guessing "Off" and then
  // flipping to "On" a moment later. setTwoFactorOn is passed straight
  // down as that component's onStatusChange: a useState setter is stable
  // across renders, so it can sit in the child's effect deps safely.
  const [twoFactorOn, setTwoFactorOn] = useState<boolean | null>(null)

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
      <header className="profile-header">
        <div className="profile-banner" aria-hidden="true" />
        <div className="profile-identity">
          <span className="profile-avatar" aria-hidden="true">{initials}</span>
          <div className="profile-header-text">
            <h1>{name}</h1>
            <p className="profile-email">{email}</p>
          </div>
        </div>
        {/* A description list rather than three divs: each of these really
          * is a term and its value, and it gives the strip a sensible
          * reading order for a screen reader for free. */}
        <dl className="profile-facts">
          <div className="profile-fact">
            <dt>Member since</dt>
            <dd>{joined ?? 'Checking...'}</dd>
          </div>
          <div className="profile-fact">
            <dt>Two-factor</dt>
            <dd>{twoFactorOn === null ? 'Checking...' : twoFactorOn ? 'On' : 'Off'}</dd>
          </div>
          <div className="profile-fact">
            <dt>Theme</dt>
            <dd>{theme === 'dark' ? 'Dark' : 'Light'}</dd>
          </div>
        </dl>
      </header>

      <SettingsSection
        icon="appearance"
        title="Appearance"
        description="Choose how ExpiryMate looks. Your choice is saved in this browser and used again next time you visit."
      >
        <ThemeChoice theme={theme} onSetTheme={onSetTheme} />
      </SettingsSection>

      <SettingsSection
        icon="notifications"
        title="Notifications"
        description="ExpiryMate can send one browser notification when you open the app, summarising anything expiring soon or already expired."
      >
        <NotificationSettings />
      </SettingsSection>

      <SettingsSection
        icon="security"
        title="Two-factor authentication"
        description="Add a second step at sign-in using an authenticator app, so a stolen password is not enough on its own."
      >
        <TwoFactorSettings onStatusChange={setTwoFactorOn} />
      </SettingsSection>

      <SettingsSection
        icon="account"
        title="Account"
        description="Actions that affect this whole account rather than one setting."
      >
        <div className="account-actions">
          <div className="account-row">
            <div className="account-row-text">
              <span className="account-row-title">Replay the tutorial</span>
              <span className="settings-muted">
                Take the guided tour of the sidebar, dashboard, and add-item button again.
              </span>
            </div>
            <button type="button" className="secondary-button" onClick={onReplayTour}>
              Replay
            </button>
          </div>
          <div className="account-row">
            <div className="account-row-text">
              <span className="account-row-title">Sign out</span>
              <span className="settings-muted">
                End this session on this device. Your items stay saved to your account.
              </span>
            </div>
            <button type="button" className="danger-button" onClick={onSignOut}>
              Sign out
            </button>
          </div>
        </div>
      </SettingsSection>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Shared section shell                                                */
/* ------------------------------------------------------------------ */

type SectionIconName = 'appearance' | 'notifications' | 'security' | 'account'

interface SettingsSectionProps {
  icon: SectionIconName
  title: string
  description: string
  children: ReactNode
}

/**
 * One settings card: a tinted icon, a heading, a one-line explanation of
 * what the setting is for, then the control itself. Introduced when the
 * page grew from one section to four (28/8/26) — with four cards on the
 * page, a shared shell is what stops them drifting into four slightly
 * different layouts.
 */
function SettingsSection({ icon, title, description, children }: SettingsSectionProps) {
  return (
    <section className="settings-section">
      <div className="settings-section-head">
        <span className="settings-section-icon" aria-hidden="true">
          <SectionIcon name={icon} />
        </span>
        <div className="settings-section-heading">
          <h2>{title}</h2>
          <p className="settings-muted">{description}</p>
        </div>
      </div>
      <div className="settings-section-body">{children}</div>
    </section>
  )
}

function SectionIcon({ name }: { name: SectionIconName }) {
  const shared = {
    viewBox: '0 0 24 24',
    width: 18,
    height: 18,
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 2,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    'aria-hidden': true,
  }
  if (name === 'appearance') {
    return (
      <svg {...shared}>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 3a9 9 0 0 0 0 18Z" fill="currentColor" stroke="none" />
      </svg>
    )
  }
  if (name === 'notifications') {
    return (
      <svg {...shared}>
        <path d="M18 8a6 6 0 0 0-12 0c0 7-3 8-3 8h18s-3-1-3-8" />
        <path d="M13.7 21a2 2 0 0 1-3.4 0" />
      </svg>
    )
  }
  if (name === 'security') {
    return (
      <svg {...shared}>
        <path d="M12 3l7 3v5c0 4.5-3 8.2-7 10-4-1.8-7-5.5-7-10V6Z" />
        <path d="m9 12 2 2 4-4" />
      </svg>
    )
  }
  return (
    <svg {...shared}>
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  )
}

/* ------------------------------------------------------------------ */
/* Appearance                                                          */
/* ------------------------------------------------------------------ */

const THEME_OPTIONS: { value: Theme; label: string }[] = [
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
]

/**
 * A two-option segmented control rather than the single icon button the
 * sidebar footer used to hold (28/8/26). The icon button only ever showed
 * the theme you would get by pressing it, which is genuinely ambiguous
 * when it is the only thing on screen; a radiogroup shows both options at
 * once and marks which one is currently on, which is what a settings page
 * should do. Real radio semantics (role="radiogroup"/role="radio" plus
 * aria-checked) rather than two unrelated buttons, since these are two
 * values of one setting.
 */
function ThemeChoice({ theme, onSetTheme }: { theme: Theme; onSetTheme: (theme: Theme) => void }) {
  return (
    <div className="theme-choice" role="radiogroup" aria-label="Theme">
      {THEME_OPTIONS.map(option => (
        <button
          key={option.value}
          type="button"
          role="radio"
          aria-checked={theme === option.value}
          className={`theme-choice-option${theme === option.value ? ' active' : ''}`}
          onClick={() => onSetTheme(option.value)}
        >
          {option.value === 'light' ? (
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <circle cx="12" cy="12" r="4" />
              <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79Z" />
            </svg>
          )}
          <span>{option.label}</span>
        </button>
      ))}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Notifications                                                       */
/* ------------------------------------------------------------------ */

type NotificationState = 'unsupported' | 'default' | 'granted' | 'denied'

const NOTIFICATION_PILL: Record<NotificationState, { label: string; className: string }> = {
  granted: { label: 'On', className: 'settings-pill-on' },
  default: { label: 'Off', className: 'settings-pill-off' },
  denied: { label: 'Blocked', className: 'settings-pill-blocked' },
  unsupported: { label: 'Unavailable', className: 'settings-pill-unavailable' },
}

const NOTIFICATION_BODY: Record<NotificationState, string> = {
  granted: 'You will get one summary notification when you open ExpiryMate, if anything needs attention.',
  default: 'Notifications have not been turned on in this browser yet.',
  denied: 'This browser is blocking notifications for ExpiryMate. To turn them back on, allow notifications for this site in your browser settings, then reload the page.',
  unsupported: 'This browser does not support notifications, so ExpiryMate will only show expiring items inside the app.',
}

function readNotificationState(): NotificationState {
  if (typeof Notification === 'undefined') return 'unsupported'
  if (Notification.permission === 'granted') return 'granted'
  if (Notification.permission === 'denied') return 'denied'
  return 'default'
}

/**
 * Slice 5's browser notification has always requested permission silently
 * from useExpiryNotifications, with no UI anywhere saying whether it was
 * granted, and no way to grant it later if the browser prompt was
 * dismissed once. This section is that missing UI (28/8/26). It reads
 * Notification.permission rather than storing a flag of its own, so it
 * cannot disagree with what the browser actually thinks.
 *
 * 'denied' deliberately gets no button: once a browser has recorded a
 * denial, requestPermission() resolves immediately with 'denied' without
 * ever prompting, so a button there would look broken. The only real fix
 * is in the browser's own site settings, which is what the copy says.
 */
function NotificationSettings() {
  const [state, setState] = useState<NotificationState>(readNotificationState)
  const [busy, setBusy] = useState(false)
  const [testSent, setTestSent] = useState(false)

  async function requestPermission() {
    if (typeof Notification === 'undefined') return
    setBusy(true)
    const permission = await Notification.requestPermission()
    setBusy(false)
    setState(permission === 'granted' ? 'granted' : permission === 'denied' ? 'denied' : 'default')
  }

  function sendTest() {
    if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return
    new Notification('ExpiryMate', { body: 'Test notification. Expiry alerts will look like this.' })
    setTestSent(true)
  }

  const pill = NOTIFICATION_PILL[state]

  return (
    <div className="notification-settings">
      <p className={`settings-pill ${pill.className}`}>{pill.label}</p>
      <p className="settings-muted">{NOTIFICATION_BODY[state]}</p>
      {state === 'default' && (
        <button type="button" onClick={requestPermission} disabled={busy}>
          {busy ? 'Waiting for your browser...' : 'Turn on notifications'}
        </button>
      )}
      {state === 'granted' && (
        <div className="settings-actions">
          <button type="button" className="secondary-button" onClick={sendTest}>
            Send a test notification
          </button>
          {testSent && <span className="settings-muted">Sent. Check your notification area.</span>}
        </div>
      )}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Two-factor authentication                                           */
/* ------------------------------------------------------------------ */

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
 *
 * As of 28/8/26 the heading, description, and card come from the shared
 * <SettingsSection> above rather than being rendered here, and settled
 * on/off transitions are reported to the parent through onStatusChange so
 * the profile header's summary strip can show them.
 */
function TwoFactorSettings({ onStatusChange }: { onStatusChange: (on: boolean) => void }) {
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
        onStatusChange(false)
        return
      }
      const verified = data.totp.find(f => f.status === 'verified')
      if (verified) {
        setFactorId(verified.id)
        setStatus('on')
        onStatusChange(true)
      } else {
        setStatus('off')
        onStatusChange(false)
      }
    })
    return () => {
      cancelled = true
    }
  }, [onStatusChange])

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
    onStatusChange(true)
  }

  async function cancelEnroll() {
    if (factorId) await supabase.auth.mfa.unenroll({ factorId })
    setFactorId(null)
    setQrCode(null)
    setSecret(null)
    setCode('')
    setError(null)
    setStatus('off')
    onStatusChange(false)
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
    onStatusChange(false)
  }

  function handleCodeChange(e: React.ChangeEvent<HTMLInputElement>) {
    setCode(e.target.value.replace(/\D/g, '').slice(0, 6))
  }

  return (
    <>
      {status === 'loading' && <p className="settings-muted">Checking...</p>}

      {status === 'off' && (
        <>
          <p className="settings-pill settings-pill-off">Off</p>
          <p className="settings-muted">
            Works with any authenticator app, including Google Authenticator, Authy, and 1Password.
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
          <p className="settings-pill settings-pill-on">On</p>
          <p className="settings-muted">
            You will be asked for a code from your authenticator app each time you sign in.
          </p>
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
    </>
  )
}
