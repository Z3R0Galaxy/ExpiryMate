import { useEffect, useState } from 'react'
import type { StorageLocation } from '../hooks/useItems'
import type { NavTarget } from './Dashboard'
import { PlaceStatusIcon } from './icons'
import type { Theme } from '../hooks/useTheme'
import { nameFromEmail, initialsFromName } from '../lib/userDisplay'

const COLLAPSE_KEY = 'expirymate-sidebar-collapsed'

// Mirrors useTheme.ts's own localStorage-persistence pattern, just without
// the flash-avoidance inline script — a sidebar briefly rendering at its
// default width for one frame before collapsing is a minor, one-time
// layout shift, nowhere near as jarring as the wrong-theme colour flash
// that pattern exists to prevent.
function getInitialCollapsed(): boolean {
  try {
    return window.localStorage.getItem(COLLAPSE_KEY) === 'true'
  } catch {
    return false
  }
}

export type NavKey = 'dashboard' | StorageLocation | 'all'

interface SidebarProps {
  email: string
  activeNav: NavKey
  /** Widened (Feedback Sprint 3, 23/8/26) to also accept 'profile' and
   * 'about' — clicking the profile block or the logo now navigates there,
   * the same `onNavigate` App.tsx already threads through for every other
   * destination. Neither ever carries a `NavTarget`. */
  onNavigate: (view: 'dashboard' | 'place-dashboard' | 'list' | 'profile' | 'about', target?: NavTarget) => void
  theme: Theme
  onToggleTheme: () => void
  onSignOut: () => void
}

const NAV_ITEMS: { key: NavKey; label: string }[] = [
  { key: 'dashboard', label: 'Dashboard' },
  { key: 'Fridge', label: 'Fridge' },
  { key: 'Freezer', label: 'Freezer' },
  { key: 'Pantry', label: 'Pantry' },
  { key: 'all', label: 'All items' },
]

/**
 * Persistent left navigation (Feedback Sprint, 21/8/26) — replaces the old
 * top app-header + Dashboard's quick-nav tiles as the primary way to move
 * between sections, matching the admin-template reference the user
 * supplied: a profile block, then icon+label destinations, then a footer
 * with the theme toggle and sign-out. Deliberately kept a constant dark
 * navy regardless of the light/dark theme toggle (which only affects the
 * main content surfaces) — see docs/decisions.md.
 */
export function Sidebar({ email, activeNav, onNavigate, theme, onToggleTheme, onSignOut }: SidebarProps) {
  const name = nameFromEmail(email)
  const initials = initialsFromName(name)

  // Collapse/expand (25/8/26) — the fixed 250px sidebar is a lot of
  // permanent width to spend once a user knows where everything is. This
  // is a separate concern from the below-900px responsive collapse (which
  // always forces icon-only, regardless of this state): this one is a
  // deliberate desktop choice the user can toggle back at any width, so it
  // persists to localStorage the same way the theme choice does.
  const [collapsed, setCollapsed] = useState(getInitialCollapsed)

  useEffect(() => {
    try {
      window.localStorage.setItem(COLLAPSE_KEY, String(collapsed))
    } catch {
      // Same defensive no-op as useTheme.ts — private-browsing/storage-
      // denied shouldn't ever crash the sidebar, just fail to persist.
    }
  }, [collapsed])

  function handleNavClick(key: NavKey) {
    if (key === 'dashboard') onNavigate('dashboard')
    else if (key === 'all') onNavigate('list', 'all')
    else onNavigate('place-dashboard', key)
  }

  return (
    <aside className={`sidebar${collapsed ? ' collapsed' : ''}`}>
      <div className="sidebar-top">
        {/* Feedback Sprint 3 (23/8/26): now opens the About page —
         * previously purely decorative. A real <button>, same reasoning
         * as .sidebar-profile below. */}
        <button
          type="button"
          className="brand sidebar-brand"
          onClick={() => onNavigate('about')}
          aria-label="About ExpiryMate"
          title="About ExpiryMate"
          data-tour="sidebar-brand"
        >
          <span className="brand-mark" aria-hidden="true">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M6 20c-2-6 1-14 9-16 2 6-1 14-9 16Z" />
              <path d="M7 19c3-4 5-8 8-14" />
            </svg>
          </span>
          {!collapsed && <span className="sidebar-title">ExpiryMate</span>}
        </button>
        <button
          type="button"
          className="sidebar-collapse-toggle"
          onClick={() => setCollapsed(c => !c)}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? (
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="m9 6 6 6-6 6" />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="m15 6-6 6 6 6" />
            </svg>
          )}
        </button>
      </div>

      {/* Feedback Sprint 3 (23/8/26): now opens the Profile page —
       * previously purely decorative. A real <button>, not a div with a
       * click handler bolted on, so it's keyboard-reachable for free. */}
      <button
        type="button"
        className="sidebar-profile"
        onClick={() => onNavigate('profile')}
        aria-label="View your profile"
        title="View your profile"
        data-tour="sidebar-profile"
      >
        <span className="sidebar-avatar" aria-hidden="true">{initials}</span>
        {!collapsed && (
          <span className="sidebar-profile-text">
            <span className="sidebar-profile-name">{name}</span>
            <span className="sidebar-profile-email">{email}</span>
          </span>
        )}
      </button>

      <nav className="sidebar-nav" aria-label="Main" data-tour="sidebar-nav">
        {NAV_ITEMS.map(navItem => (
          <button
            key={navItem.key}
            type="button"
            className={`sidebar-nav-item${activeNav === navItem.key ? ' active' : ''}`}
            onClick={() => handleNavClick(navItem.key)}
            aria-current={activeNav === navItem.key ? 'page' : undefined}
            aria-label={navItem.label}
            title={navItem.label}
          >
            <SidebarNavIcon navKey={navItem.key} />
            {!collapsed && <span>{navItem.label}</span>}
          </button>
        ))}
      </nav>

      <div className="sidebar-footer">
        <button
          type="button"
          className="sidebar-footer-button"
          onClick={onToggleTheme}
          aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          {theme === 'dark' ? (
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <circle cx="12" cy="12" r="4" />
              <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79Z" />
            </svg>
          )}
          {!collapsed && <span>{theme === 'dark' ? 'Light mode' : 'Dark mode'}</span>}
        </button>
        <button type="button" className="sidebar-footer-button" onClick={onSignOut} aria-label="Sign out" title="Sign out">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
            <path d="M16 17l5-5-5-5M21 12H9" />
          </svg>
          {!collapsed && <span>Sign out</span>}
        </button>
      </div>
    </aside>
  )
}

function SidebarNavIcon({ navKey }: { navKey: NavKey }) {
  if (navKey === 'dashboard') {
    return (
      <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M3 10.5 12 3l9 7.5" />
        <path d="M5 9.5V20a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1V9.5" />
      </svg>
    )
  }
  if (navKey === 'all') {
    return (
      <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <rect x="3" y="3" width="7" height="7" rx="1.5" />
        <rect x="14" y="3" width="7" height="7" rx="1.5" />
        <rect x="3" y="14" width="7" height="7" rx="1.5" />
        <rect x="14" y="14" width="7" height="7" rx="1.5" />
      </svg>
    )
  }
  return <PlaceStatusIcon groupKey={navKey} />
}
