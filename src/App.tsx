import { useEffect, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import './App.css'
import { supabase } from './lib/supabase'
import { Auth } from './components/Auth'
import { AddItemForm } from './components/AddItemForm'
import { ItemList } from './components/ItemList'
import { useItems } from './hooks/useItems'
import { useTheme } from './hooks/useTheme'

interface AuthenticatedAppProps {
  userId: string
  onSignOut: () => void
}

// Split out so useItems (which fetches on mount) only ever runs once we
// actually have a signed-in user, and cleanly unmounts on sign out.
function AuthenticatedApp({ userId, onSignOut }: AuthenticatedAppProps) {
  const { items, loading, error, addItem, updateItem, deleteItem } = useItems(userId)

  return (
    <div className="app-shell">
      <header className="app-header">
        <h1>ExpiryMate</h1>
        <div className="app-header-actions">
          <ThemeToggle />
          <button className="sign-out" onClick={onSignOut}>Sign Out</button>
        </div>
      </header>
      <main className="app-main">
        <AddItemForm onAdd={addItem} />
        {error && <p className="error">{error}</p>}
        <ItemList items={items} loading={loading} onUpdate={updateItem} onDelete={deleteItem} />
      </main>
    </div>
  )
}

// Used both inside the authenticated header (next to Sign Out) and on the
// auth screen (top-right corner of that centred card), so dark mode can be
// toggled before signing in too, not just once inside the app shell.
function ThemeToggle() {
  const { theme, toggleTheme } = useTheme()
  const isDark = theme === 'dark'

  return (
    <button
      type="button"
      className="theme-toggle"
      onClick={toggleTheme}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      {isDark ? (
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
        </svg>
      ) : (
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79Z" />
        </svg>
      )}
    </button>
  )
}

function App() {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setLoading(false)
    })

    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession)
    })

    return () => {
      listener.subscription.unsubscribe()
    }
  }, [])

  async function handleSignOut() {
    await supabase.auth.signOut()
  }

  if (loading) {
    return <p className="app-loading">Loading...</p>
  }

  if (!session) {
    return (
      <div className="auth-screen">
        <ThemeToggle />
        <Auth />
      </div>
    )
  }

  return <AuthenticatedApp userId={session.user.id} onSignOut={handleSignOut} />
}

export default App
