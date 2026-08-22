import type { FoodCategory, StorageLocation } from '../hooks/useItems'
import type { BadgeStatus } from '../lib/itemStatus'

// Hand-drawn inline SVGs, no icon library — consistent with the project's
// "no UI library" constraint. Pulled out of ItemList.tsx during the
// Feedback Sprint real-build (21/8/26) so the Fridge/Freezer/Pantry and
// status icons can be reused by the new Dashboard/PlaceDashboard
// components (quick-nav tiles, section headings) instead of duplicating
// the same shapes a second time.

export type PlaceOrStatusKey = StorageLocation | BadgeStatus

export function PlaceStatusIcon({ groupKey }: { groupKey: PlaceOrStatusKey }) {
  switch (groupKey) {
    case 'Fridge':
      return (
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <rect x="5" y="2" width="14" height="20" rx="2" />
          <path d="M5 9h14M9 5v2M9 12v2" />
        </svg>
      )
    case 'Freezer':
      return (
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M12 2v20M5 6.5l14 11M19 6.5 5 17.5" />
        </svg>
      )
    case 'Pantry':
      return (
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <rect x="3" y="3" width="18" height="18" rx="2" />
          <path d="M3 9h18M3 15h18M9 3v18" />
        </svg>
      )
    case 'expired':
      return (
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <circle cx="12" cy="12" r="10" />
          <path d="m15 9-6 6M9 9l6 6" />
        </svg>
      )
    case 'soon':
      return (
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <circle cx="12" cy="12" r="10" />
          <path d="M12 6v6l4 2" />
        </svg>
      )
    case 'fresh':
      return (
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <circle cx="12" cy="12" r="10" />
          <path d="m8 12 3 3 5-6" />
        </svg>
      )
    case 'warning':
      return (
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z" />
          <path d="M12 9v4M12 17h.01" />
        </svg>
      )
  }
}

// --- food-category icons ---------------------------------------------
//
// Shown on the collapsed card (and the expanded modal's heading) so the
// food type reads at a glance without opening the card. Kept deliberately
// simple (mostly basic shapes) since these are meant to be recognisable
// silhouettes, not detailed illustrations.

export function CategoryIcon({ category, size = 16 }: { category: FoodCategory; size?: number }) {
  const common = {
    viewBox: '0 0 24 24',
    width: size,
    height: size,
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 2,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    'aria-hidden': true,
  }

  switch (category) {
    case 'Dairy':
      return (
        <svg {...common}>
          <path d="M9 3h6l1 3H8l1-3Z" />
          <path d="M8 6h8v14a1 1 0 0 1-1 1H9a1 1 0 0 1-1-1V6Z" />
        </svg>
      )
    case 'Eggs':
      return (
        <svg {...common}>
          <ellipse cx="12" cy="13" rx="5.5" ry="7.5" />
        </svg>
      )
    case 'Meat':
      return (
        <svg {...common}>
          <ellipse cx="12" cy="12" rx="8" ry="5" />
          <path d="M8 10c1 1 1 3 0 4M12 9c1 1 1 5 0 6M16 10c1 1 1 3 0 4" />
        </svg>
      )
    case 'Seafood':
      return (
        <svg {...common}>
          <ellipse cx="10" cy="12" rx="7" ry="4" />
          <path d="M17 12l4-3v6l-4-3Z" />
        </svg>
      )
    case 'Produce':
      return (
        <svg {...common}>
          <path d="M6 20c-2-6 1-14 9-16 2 6-1 14-9 16Z" />
          <path d="M7 19c3-4 5-8 8-14" />
        </svg>
      )
    case 'Bakery':
      return (
        <svg {...common}>
          <path d="M4 13c0-5 3.5-9 8-9s8 4 8 9v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-5Z" />
          <path d="M8 12v6M12 11v7M16 12v6" />
        </svg>
      )
    case 'Frozen':
      return (
        <svg {...common}>
          <path d="M12 2v20M5 6.5l14 11M19 6.5 5 17.5" />
        </svg>
      )
    case 'Microwave Meals':
      // A TV-dinner tray — divided compartments, distinct from the plain
      // snowflake used for raw frozen ingredients above.
      return (
        <svg {...common}>
          <rect x="3" y="7" width="18" height="14" rx="2" />
          <path d="M3 7l3.5-4h11L21 7" />
          <path d="M9 7v14M15 7v14" />
        </svg>
      )
    case 'Beverages':
      return (
        <svg {...common}>
          <path d="M6 7h12l-1.2 13a1 1 0 0 1-1 .9H8.2a1 1 0 0 1-1-.9L6 7Z" />
          <path d="M14 3v6" />
        </svg>
      )
    case 'Condiments':
      return (
        <svg {...common}>
          <path d="M10 2h4v3l2 2v14a1 1 0 0 1-1 1H9a1 1 0 0 1-1-1V7l2-2V2Z" />
          <path d="M9 13h6" />
        </svg>
      )
    case 'Snacks':
      return (
        <svg {...common}>
          <path d="M6 6h12l1 14a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1L6 6Z" />
          <path d="M9 6V4h6v2" />
        </svg>
      )
    case 'Leftovers':
      return (
        <svg {...common}>
          <rect x="4" y="9" width="16" height="11" rx="2" />
          <path d="M4 9c0-2.5 2-4.5 8-4.5s8 2 8 4.5" />
        </svg>
      )
  }
}
