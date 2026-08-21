import type { Item, StorageLocation } from '../hooks/useItems'
import type { BadgeStatus, StatusInfo } from './itemStatus'
import { STATUS_LABEL } from './itemStatus'

// Shared helpers for the Feedback Sprint dashboard/place-dashboard/list
// views (21/8/26) — see docs/10-feedback-sprint.md and docs/decisions.md,
// "Feedback Sprint: real UI build" for the design this ports from (the
// clickable wireframe at docs/wireframes/feedback-sprint-dashboard-wireframe.html).

export const STORAGE_LOCATIONS: StorageLocation[] = ['Fridge', 'Freezer', 'Pantry']

export interface ItemWithStatus extends StatusInfo {
  item: Item
}

export interface StatusCounts {
  fresh: number
  soon: number
  expired: number
  warning: number
}

export interface StorageCounts {
  Fridge: number
  Freezer: number
  Pantry: number
}

export function countByStatus(entries: ItemWithStatus[]): StatusCounts {
  const counts: StatusCounts = { fresh: 0, soon: 0, expired: 0, warning: 0 }
  entries.forEach(({ badgeStatus }) => {
    counts[badgeStatus]++
  })
  return counts
}

export function countByStorage(items: Item[]): StorageCounts {
  const counts: StorageCounts = { Fridge: 0, Freezer: 0, Pantry: 0 }
  items.forEach(item => {
    counts[item.storage_location]++
  })
  return counts
}

/**
 * Default read order everywhere items are listed (card view and table view
 * alike): "how close to expiring" as one scale. Unsafe/not-recommended
 * items are a food-safety alert rather than a countdown, so they're pinned
 * to the front instead of being slotted in by a daysRemaining value they
 * don't really have; everything else sorts ascending by daysRemaining,
 * which reads as most-overdue-expired -> closest-to-expiring-soon ->
 * furthest-away-fresh.
 *
 * This replaces the earlier "group by status or by place" sections
 * (decisions.md, "Slice 4 fifth revision") — the Feedback Sprint's agreed
 * wireframe uses one flat sorted list instead, with the dashboard now
 * covering the "what needs attention" summary that the grouped sections
 * used to provide.
 */
export function sortByUrgency<T extends ItemWithStatus>(entries: T[]): T[] {
  const unsafe = entries.filter(e => e.badgeStatus === 'warning')
  const rest = entries
    .filter(e => e.badgeStatus !== 'warning')
    .sort((a, b) => (a.daysRemaining ?? 0) - (b.daysRemaining ?? 0))
  return [...unsafe, ...rest]
}

/**
 * Ported from the wireframe's `needsAttention` logic: unsafe items first,
 * then expiring-soon ordered by fewest days left, then expired ordered by
 * most-recently-expired first. Fresh items are excluded entirely — this is
 * "what needs a look," not everything. Shared by the main dashboard and
 * each place-dashboard so both agree on priority.
 */
export function buildNeedsAttention<T extends ItemWithStatus>(entries: T[], limit: number): T[] {
  const rank = (status: BadgeStatus) => (status === 'warning' ? 0 : status === 'soon' ? 1 : 2)
  return entries
    .filter(e => e.badgeStatus !== 'fresh')
    .sort((a, b) => {
      const r = rank(a.badgeStatus) - rank(b.badgeStatus)
      if (r !== 0) return r
      if (a.badgeStatus === 'soon') return (a.daysRemaining ?? 0) - (b.daysRemaining ?? 0)
      if (a.badgeStatus === 'expired') return (b.daysRemaining ?? 0) - (a.daysRemaining ?? 0)
      return 0
    })
    .slice(0, limit)
}

/**
 * Backs the dashboard's "click a stat tile" inline panel (UI feedback pass
 * three, 21/8/26) — filters to exactly the clicked status (or every item, for
 * the "Total"/'all' tile), then applies the same urgency ordering every
 * other list on this project uses, so a status-filtered preview reads
 * consistently with the rest of the app.
 */
export function filterByStatus<T extends ItemWithStatus>(entries: T[], status: BadgeStatus | 'all'): T[] {
  const filtered = status === 'all' ? entries : entries.filter(e => e.badgeStatus === status)
  return sortByUrgency(filtered)
}

/** Shared title text for the inline panel's selected-status header — e.g.
 * "Expired" (Dashboard) or "Expired in Fridge" (PlaceDashboard, via
 * `scopeLabel`). Mirrors the phrasing `App.tsx`'s `pageTitleFor` already
 * uses for the full-list view, so the wording is consistent whether the
 * user is looking at the inline preview or the full list it links to. */
export function statusPanelTitle(status: BadgeStatus | 'all', scopeLabel?: string): string {
  if (status === 'all') return scopeLabel ? `All ${scopeLabel} items` : 'All items'
  const label = STATUS_LABEL[status]
  return scopeLabel ? `${label} in ${scopeLabel}` : label
}
