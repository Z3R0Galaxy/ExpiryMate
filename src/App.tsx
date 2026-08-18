import { useEffect, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from './lib/supabase'
import { Auth } from './components/Auth'
import { AddItemForm } from './components/AddItemForm'
import { ItemList } from './components/ItemList'

function App() {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [refresh, setRefresh] = useState(0)

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

  return (
    <div className="app-shell">
      <header className="app-header">
        <h1>ExpiryMate</h1>
        <button className="sign-out" onClick={handleSignOut}>Sign Out</button>
      </header>
      <main className="app-main">
        <AddItemForm userId={session.user.id} onAdded={() => setRefresh(r => r + 1)} />
        <ItemList userId={session.user.id} refresh={refresh} />
      </main>
    </div>
  )
}

export default App
