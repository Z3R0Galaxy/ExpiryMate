import { useEffect, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from './lib/supabase'
import { Auth } from './components/Auth'
import { AddItemForm } from './components/AddItemForm'
import { ItemList } from './components/ItemList'
import { useItems } from './hooks/useItems'

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
        <button className="sign-out" onClick={onSignOut}>Sign Out</button>
      </header>
      <main className="app-main">
        <AddItemForm onAdd={addItem} />
        {error && <p className="error">{error}</p>}
        <ItemList items={items} loading={loading} onUpdate={updateItem} onDelete={deleteItem} />
      </main>
    </div>
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
    return <Auth />
  }

  return <AuthenticatedApp userId={session.user.id} onSignOut={handleSignOut} />
}

export default App
