import { useEffect, useState } from 'react'
import type { User } from '@supabase/supabase-js'
import { supabase } from './lib/supabase'
import { Auth } from './components/Auth'
import { AddItemForm } from './components/AddItemForm'
import { ItemList } from './components/ItemList'
import './App.css'

function App() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [refresh, setRefresh] = useState(0)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })

    return () => subscription.unsubscribe()
  }, [])

  if (loading) return <p>Loading...</p>

  if (!user) return <Auth />

  return (
    <div className="app">
      <header className="app-header">
        <h1>ExpiryMate</h1>
        <button onClick={() => supabase.auth.signOut()}>Sign out</button>
      </header>
      <main>
        <AddItemForm userId={user.id} onAdded={() => setRefresh(r => r + 1)} />
        <ItemList userId={user.id} refresh={refresh} />
      </main>
    </div>
  )
}

export default App
