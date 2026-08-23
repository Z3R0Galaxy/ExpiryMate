import { useEffect, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import './App.css'
import { supabase } from './lib/supabase'
import { Auth } from './components/Auth'
import { AddItemForm } from './components/AddItemForm'
import { ItemList } from './components/ItemList'
import type { StatusFilterValue } from './components/ItemList'
import { Dashboard } from './components/Dashboard'
import type { NavTarget } from './components/Dashboard'
import { PlaceDashboard } from './components/PlaceDashboard'
import { ProfilePage } from './components/ProfilePage'
import { AboutPage } from './components/AboutPage'
import { Sidebar } from './components/Sidebar'
import type { NavKey } from './components/Sidebar'
import { useItems } from './hooks/useItems'
import type { StorageLocation } from './hooks/useItems'
import { useTheme } from './hooks/useTheme'
import { useAnimatedModal } from './hooks/useAnimatedModal'
import { useExpiryNotifications } from './hooks/useExpiryNotifications'
import { AnimatedModal } from './components/AnimatedModal'
import type { ItemInput } from './hooks/useItems'
import type { BadgeStatus } from './lib/itemStatus'
import { STATUS_LABEL } from './lib/itemStatus'

interface AuthenticatedAppProps {
  userId: string
  email: string
  onSignOut: () => void
}

// Dashboard-first navigation (Feedback Sprint, 21/8/26) — replaces the old
// single-page grouped list. See docs/10-feedback-sprint.md and
// docs/wireframes/feedback-sprint-dashboard-wireframe.html for the agreed
// structure: a summary Dashboard is the landing page, each storage place
// gets its own small PlaceDashboard, and the full ItemList (card or table)
// is only reached deliberately from either of those, or from search/filter
// use directly.
// 'profile' and 'about' both added Feedback Sprint 3 (23/8/26) — the
// sidebar's profile block and logo now navigate here instead of being
// purely decorative.
type View = 'dashboard' | 'place-dashboard' | 'list' | 'profile' | 'about'

function isStorageLocation(value: NavTarget): value is StorageLocation {
  return value === 'Fridge' || value === 'Freezer' || value === 'Pantry'
}

// A single current-page label plus one "back to Dashboard" button —
// replaces the old multi-level "Dashboard › Fridge › All items" breadcrumb
// trail (25/8/26). The trail was accurate but asked the user to parse a
// chain of clickable segments just to get back to the start; one clearly
// worded title (what am I looking at) and one clearly labelled button
// (how do I get back) does the same job in less to read. See
// docs/decisions.md.
function pageTitleFor(view: View, place: StorageLocation, listStorageFilter: StorageLocation | 'all', listStatusFilter: StatusFilterValue): string {
  if (view === 'profile') return 'Profile'
  if (view === 'about') return 'About'
  if (view === 'place-dashboard') return place
  if (view === 'list') {
    if (listStatusFilter === 'attention') return 'Needs attention'
    if (listStatusFilter !== 'all') {
      const statusLabel = STATUS_LABEL[listStatusFilter]
      return listStorageFilter !== 'all' ? `${statusLabel} in ${listStorageFilter}` : statusLabel
    }
    return listStorageFilter !== 'all' ? `${listStorageFilter} items` : 'All items'
  }
  return ''
}

interface PageHeadingProps {
  title: string
  onBackHome: () => void
}

function PageHeading({ title, onBackHome }: PageHeadingProps) {
  return (
    <div className="page-heading">
      <button type="button" className="back-home-button" onClick={onBackHome} aria-label="Back to Dashboard" title="Back to Dashboard">
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M3 10.5 12 3l9 7.5" />
          <path d="M5 9.5V20a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1V9.5" />
        </svg>
        Home
      </button>
      <h2 className="page-heading-title">{title}</h2>
    </div>
  )
}

// Split out so useItems (which fetches on mount) only ever runs once we
// actually have a signed-in user, and cleanly unmounts on sign out.
function AuthenticatedApp({ userId, email, onSignOut }: AuthenticatedAppProps) {
  const { items, loading, error, addItem, updateItem, deleteItem } = useItems(userId)
  const addModal = useAnimatedModal()
  // The on-page banner this used to feed is gone (25/8/26 — the dashboard's
  // own "Needs attention" card already covers the same information), but
  // the hook itself still runs: it's also what fires the one batched
  // browser Notification per page load, which is unrelated to the banner
  // and still wanted. See docs/decisions.md.
  useExpiryNotifications(items, loading)
  const { theme, toggleTheme } = useTheme()

  const [view, setView] = useState<View>('dashboard')
  const [place, setPlace] = useState<StorageLocation>('Fridge')
  const [listStorageFilter, setListStorageFilter] = useState<StorageLocation | 'all'>('all')
  const [listStatusFilter, setListStatusFilter] = useState<StatusFilterValue>('all')

  // What the sidebar highlights as "current" — kept as one derived value
  // rather than duplicating this view/place/filter logic inside Sidebar
  // itself, since AuthenticatedApp already owns all three source states.
  const activeNav: NavKey = view === 'place-dashboard'
    ? place
    : view === 'list' && listStorageFilter !== 'all'
      ? listStorageFilter
      : view === 'list'
        ? 'all'
        : 'dashboard'

  // Single navigation entry point for Dashboard/PlaceDashboard's onNavigate
  // props and the breadcrumb — keeps "what state does each destination need"
  // in one place instead of scattered across every place that can trigger a
  // navigation.
  function navigateTo(nextView: View, target?: NavTarget) {
    if (nextView === 'place-dashboard' && target && isStorageLocation(target)) {
      setPlace(target)
    } else if (nextView === 'list') {
      if (target && isStorageLocation(target)) {
        setListStorageFilter(target)
        setListStatusFilter('all')
      } else if (target === 'attention') {
        setListStorageFilter('all')
        setListStatusFilter('attention')
      } else {
        setListStorageFilter('all')
        setListStatusFilter('all')
      }
    }
    setView(nextView)
  }

  // Backs the 4 clickable stat tiles (Total/Expiring soon/Expired/Unsafe)
  // on Dashboard and PlaceDashboard alike (25/8/26). `scopePlace` is what
  // makes the same click mean two different things depending on where it
  // happened: Dashboard passes none (clicking "Expired" there means every
  // expired item, anywhere), PlaceDashboard passes its own `place` (the
  // same click there means only that place's expired items) — see how
  // each component's onSelectStatus is wired below.
  function navigateToStatus(status: BadgeStatus | 'all', scopePlace?: StorageLocation) {
    setListStorageFilter(scopePlace ?? 'all')
    setListStatusFilter(status)
    setView('list')
  }

  // Only close the add-item modal on a successful add — on a validation or
  // Supabase error the form should stay open with its error message visible,
  // same as it did when it lived inline on the dashboard.
  async function handleAdd(input: ItemInput) {
    const result = await addItem(input)
    if (!result.error) addModal.close()
    return result
  }

  return (
    <div className="app-shell">
      <Sidebar
        email={email}
        activeNav={activeNav}
        onNavigate={navigateTo}
        theme={theme}
        onToggleTheme={toggleTheme}
        onSignOut={onSignOut}
      />
      {/* `app-main-fill` (UI feedback pass seven, 21/8/26) scopes the
       * "fill the whole screen" dashboard layout to just the two dashboard
       * views — giving `.app-main` a genuinely definite `height: 100vh`
       * (see App.css) is what the charts/attention-panel stretch chain
       * actually needs to work (a `min-height` on `.app-shell` alone
       * isn't a definite height for flexbox/grid to distribute), but
       * every other view (the full item list, etc.) still wants its
       * previous natural, content-driven page scroll rather than being
       * boxed into exactly one viewport tall. */}
      <main className={`app-main${view === 'dashboard' || view === 'place-dashboard' ? ' app-main-fill' : ''}`}>
        {error && <p className="error">{error}</p>}
        {loading ? (
          <p className="app-loading">Loading items...</p>
        ) : (
          <>
            {view !== 'dashboard' && (
              <PageHeading
                title={pageTitleFor(view, place, listStorageFilter, listStatusFilter)}
                onBackHome={() => navigateTo('dashboard')}
              />
            )}
            {view === 'dashboard' && (
              <Dashboard
                items={items}
                onNavigate={navigateTo}
                onSelectStatus={status => navigateToStatus(status)}
                onUpdate={updateItem}
                onDelete={deleteItem}
              />
            )}
            {view === 'place-dashboard' && (
              <PlaceDashboard
                items={items}
                place={place}
                onNavigate={navigateTo}
                onSelectStatus={status => navigateToStatus(status, place)}
                onUpdate={updateItem}
                onDelete={deleteItem}
              />
            )}
            {view === 'list' && (
              <ItemList
                items={items}
                onUpdate={updateItem}
                onDelete={deleteItem}
                initialStorageFilter={listStorageFilter}
                initialStatusFilter={listStatusFilter}
              />
            )}
            {view === 'profile' && <ProfilePage userId={userId} email={email} />}
            {view === 'about' && <AboutPage />}
          </>
        )}
      </main>

      {/* Feedback Sprint 2 (22/8/26): hovering (or focusing) now slides the
       * pill open to reveal an "Add item" label instead of staying a bare
       * icon circle — see .fab/.fab-icon/.fab-label in App.css. */}
      <button
        type="button"
        className="fab"
        onClick={e => addModal.openFrom(e.currentTarget)}
        aria-label="Add item"
        title="Add item"
      >
        <span className="fab-icon">
          <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M12 5v14M5 12h14" />
          </svg>
        </span>
        <span className="fab-label">Add item</span>
      </button>

      {addModal.open && (
        <AnimatedModal visible={addModal.visible} origin={addModal.origin} onClose={addModal.close}>
          <div className="item-modal-header">
            <div className="item-modal-header-actions" />
            <button type="button" className="icon-button" onClick={addModal.close} aria-label="Close" title="Close">
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M18 6 6 18M6 6l12 12" />
              </svg>
            </button>
          </div>
          <h2 className="item-modal-name">Add Item</h2>
          <AddItemForm onAdd={handleAdd} />
        </AnimatedModal>
      )}
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

  return <AuthenticatedApp userId={session.user.id} email={session.user.email ?? ''} onSignOut={handleSignOut} />
}

export default App
