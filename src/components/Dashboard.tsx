import { useState } from 'react'
import { motion } from 'framer-motion'
import type { Item, ItemInput, StorageLocation } from '../hooks/useItems'
import { useItemsWithStatus } from '../hooks/useItemsWithStatus'
import { useItemDetail } from '../hooks/useItemDetail'
import { ItemDetailModal } from './ItemDetailModal'
import {
  STORAGE_LOCATIONS,
  buildNeedsAttention,
  countByStatus,
  countByStorage,
  filterByStatus,
  statusPanelTitle,
} from '../lib/dashboardStats'
import { STATUS_LABEL } from '../lib/itemStatus'
import type { BadgeStatus } from '../lib/itemStatus'
import { AttentionPanel } from './AttentionPanel'
import { Donut } from './Donut'
import type { DonutSegment } from './Donut'
import { BarChart } from './BarChart'

export type NavTarget = StorageLocation | 'all' | 'attention'

interface DashboardProps {
  items: Item[]
  /** Widened (Feedback Sprint 2, 22/8/26) from `(view: 'list', target:
   * 'attention')` to also accept `'place-dashboard'` — clicking a bar in
   * "Items by location" now navigates to that place's PlaceDashboard, the
   * same destination the sidebar's Fridge/Freezer/Pantry links use. */
  onNavigate: (view: 'list' | 'place-dashboard', target?: NavTarget) => void
  /** Called only from the expanded stat-tile panel's "See full list" button
   * (UI feedback pass three, 21/8/26) — clicking a stat tile itself no
   * longer navigates away, it expands the panel below in place instead.
   * App.tsx owns what "Expired" etc. actually means in list terms (see
   * navigateToStatus). */
  onSelectStatus: (status: BadgeStatus | 'all') => void
  /** Backs the shared `ItemDetailModal` opened from an AttentionPanel row
   * (UI feedback pass four, 21/8/26) — same `updateItem`/`deleteItem` from
   * `useItems` that ItemList already receives, so editing/deleting an item
   * from the dashboard works exactly the same as from the full list. */
  onUpdate: (id: string, input: ItemInput) => Promise<{ error?: string }>
  onDelete: (id: string) => Promise<{ error?: string }>
}

const PLACE_COLOR_VAR: Record<StorageLocation, string> = {
  Fridge: 'var(--color-place-fridge)',
  Freezer: 'var(--color-place-freezer)',
  Pantry: 'var(--color-place-pantry)',
}

type SelectedStat = BadgeStatus | 'all'

/**
 * The landing page (Feedback Sprint, 21/8/26) — a summary, not a raw list of
 * every item. Originally ported the wireframe's two-donut layout
 * (docs/wireframes/feedback-sprint-dashboard-wireframe.html); revised
 * again 21/8/26 against a real admin-template reference the user
 * supplied: one status-breakdown donut (with a real punched centre, see
 * Donut.tsx) plus one bar chart comparing item counts across storage
 * locations, and a "needs attention" list. Revised again 21/8/26: the
 * donut and bar-chart cards stack in their own left-hand column
 * (`.dash-charts-col`) beside the needs-attention card, rather than three
 * equal grid columns, to close the empty space a flat 3-column grid left
 * underneath the shorter cards. The "Jump to a place" quick-nav row (added
 * in the real-UI build) is removed as of the UI feedback pass three,
 * 21/8/26 — the sidebar already covers every one of those destinations, so
 * it was a second way to do something already one click away. The 4 stat
 * tiles no longer navigate to a new page on click either (as they did in
 * the previous pass) — they now expand `AttentionPanel` in place, showing
 * that status's full list right where "Needs attention" was, with a
 * framer-motion crossfade (see `selected` below and `onSelectStatus`, still
 * owned by App.tsx but now only reached via the panel's own "See full
 * list" button). See docs/decisions.md, "Feedback Sprint: real UI build"
 * and the later "reference-matched redesign" and "UI feedback pass
 * two"/"UI feedback pass three" entries for what changed and why.
 */
export function Dashboard({ items, onNavigate, onSelectStatus, onUpdate, onDelete }: DashboardProps) {
  const withStatus = useItemsWithStatus(items)
  const [selected, setSelected] = useState<SelectedStat | null>(null)
  const detail = useItemDetail(onUpdate, onDelete)

  if (items.length === 0) {
    return <p className="empty">No items yet. Add one to get started!</p>
  }

  const expandedItem = items.find(i => i.id === detail.expandedId) ?? null
  const statusCounts = countByStatus(withStatus)
  const placeCounts = countByStorage(items)
  // Uncapped (UI feedback pass seven, 21/8/26) — the panel now scrolls
  // internally (see AttentionPanel.tsx/.attention-list) instead of
  // truncating to a fixed count, so every item that needs attention should
  // be in the list rather than only the first 8.
  const needsAttention = buildNeedsAttention(withStatus, withStatus.length)
  const selectedItems = selected === null ? [] : filterByStatus(withStatus, selected)

  // 'warning'/Unsafe dropped from the donut (Feedback Sprint 2, 22/8/26) —
  // an item can no longer be saved into an unsafe storage spot (see
  // checkStorageSafety in validateItem.ts), so a dedicated "Unsafe" slice
  // that should now always read 0 no longer belongs in the breakdown.
  const statusSegments: DonutSegment[] = [
    { key: 'fresh', label: STATUS_LABEL.fresh, value: statusCounts.fresh, color: 'var(--color-fresh-text)' },
    { key: 'soon', label: STATUS_LABEL.soon, value: statusCounts.soon, color: 'var(--color-soon-text)' },
    { key: 'expired', label: STATUS_LABEL.expired, value: statusCounts.expired, color: 'var(--color-expired-text)' },
  ]

  const placeSegments: DonutSegment[] = STORAGE_LOCATIONS.map(loc => ({
    key: loc,
    label: loc,
    value: placeCounts[loc],
    color: PLACE_COLOR_VAR[loc],
  }))

  function toggle(stat: SelectedStat) {
    setSelected(current => (current === stat ? null : stat))
  }

  // No whileHover offset here (UI feedback pass four, 21/8/26) — the tiles
  // sit flush against each other in one card (see .stat-row), so lifting
  // one on hover used to reveal a gap at its bottom edge where it separated
  // from the still-static row, and dragged its `.stat-tile-active` ring up
  // with it, visibly detaching the ring from the card. The hover feedback
  // now lives entirely in CSS (`.stat-tile:hover`'s background change plus
  // `.stat-value`'s small scale-up), which never moves the tile out of the
  // flow it's flush against. Only the press feedback is still motion-driven
  // (a brief inward scale reads fine even in a flush row, since it doesn't
  // reveal anything behind it).
  const tileProps = { whileTap: { scale: 0.97 }, transition: { duration: 0.12 } }

  return (
    <div className="dash-grid">
      <div className="stat-row" data-tour="stat-row">
        <motion.button
          {...tileProps}
          type="button"
          className={`stat-tile stat-total${selected === 'all' ? ' stat-tile-active' : ''}`}
          onClick={() => toggle('all')}
          aria-pressed={selected === 'all'}
          aria-label={`View all ${items.length} items`}
        >
          <span className="stat-label">Total items</span>
          <span className="stat-value">{items.length}</span>
        </motion.button>
        <motion.button
          {...tileProps}
          type="button"
          className={`stat-tile stat-fresh${selected === 'fresh' ? ' stat-tile-active' : ''}`}
          onClick={() => toggle('fresh')}
          aria-pressed={selected === 'fresh'}
          aria-label={`View ${statusCounts.fresh} fresh items`}
        >
          <span className="stat-label">Fresh</span>
          <span className="stat-value">{statusCounts.fresh}</span>
        </motion.button>
        <motion.button
          {...tileProps}
          type="button"
          className={`stat-tile stat-soon${selected === 'soon' ? ' stat-tile-active' : ''}`}
          onClick={() => toggle('soon')}
          aria-pressed={selected === 'soon'}
          aria-label={`View ${statusCounts.soon} items expiring soon`}
        >
          <span className="stat-label">Expiring soon</span>
          <span className="stat-value">{statusCounts.soon}</span>
        </motion.button>
        <motion.button
          {...tileProps}
          type="button"
          className={`stat-tile stat-expired${selected === 'expired' ? ' stat-tile-active' : ''}`}
          onClick={() => toggle('expired')}
          aria-pressed={selected === 'expired'}
          aria-label={`View ${statusCounts.expired} expired items`}
        >
          <span className="stat-label">Expired</span>
          <span className="stat-value">{statusCounts.expired}</span>
        </motion.button>
      </div>

      <div className="dash-charts-row">
        <div className="dash-charts-col">
          <div className="chart-card">
            <h2 className="section-title">Status breakdown</h2>
            {/* 220 is now an upper bound, not a fixed diameter (28/8/26)
             * — see Donut's `size` prop and `.donut-shape` in App.css.
             * The old value could not be raised past 168 precisely
             * because it was fixed: a card measured 170px tall at a
             * 1440x700 viewport and 360px tall at 1920x1080, so any one
             * number was either wasting most of a tall card or about to
             * overflow a short one. Now the ring takes 220 where the card
             * can hold it and shrinks itself where it cannot, which is
             * what finally closes the empty space UI feedback pass six
             * and the 22/8/26 follow-up were both aiming at. */}
            {/* Feedback Sprint 2 (22/8/26): clicking a segment (ring arc or
             * legend row) now does exactly what clicking the matching stat
             * tile above does — expands the AttentionPanel to that status.
             * Feedback Sprint 3 (23/8/26): wired the other direction too —
             * `activeKey` highlights the ring/legend to match whichever
             * stat tile is currently selected. 'all' and `null` both have
             * no matching slice, so the ring just shows its plain total in
             * either case, same as before this prop existed. */}
            <Donut
              segments={statusSegments}
              size={220}
              onSegmentClick={key => toggle(key as SelectedStat)}
              activeKey={selected === 'all' ? null : selected}
            />
          </div>

          <div className="chart-card">
            <h2 className="section-title">Items by location</h2>
            {/* Clicking a bar navigates to that place's PlaceDashboard —
             * placeSegments' keys are always exactly the 3 StorageLocation
             * values (built from STORAGE_LOCATIONS above), so the cast is
             * safe. */}
            <BarChart
              segments={placeSegments}
              ariaLabel="Item count by storage location"
              onSegmentClick={key => onNavigate('place-dashboard', key as StorageLocation)}
            />
          </div>
        </div>

        <AttentionPanel
          needsAttention={needsAttention}
          selected={selected}
          selectedItems={selectedItems}
          defaultTitle="Needs attention"
          selectedTitle={selected === null ? '' : statusPanelTitle(selected)}
          onOpenItem={detail.openItem}
          onClose={() => setSelected(null)}
          onViewAllDefault={() => onNavigate('list', 'attention')}
          onViewAllSelected={() => selected !== null && onSelectStatus(selected)}
          viewAllDefaultLabel="See all expiring items"
          viewAllSelectedLabel="See full list"
        />
      </div>

      {detail.modal.open && expandedItem && (
        <ItemDetailModal
          item={expandedItem}
          visible={detail.modal.visible}
          origin={detail.modal.origin}
          isEditing={detail.editingId === expandedItem.id}
          edit={detail.edit}
          error={detail.error}
          onClose={detail.closeItem}
          onStartEdit={detail.startEdit}
          onCancelEdit={detail.cancelEdit}
          onSaveEdit={detail.saveEdit}
          onDelete={detail.handleDelete}
          setEdit={detail.setEdit}
        />
      )}
    </div>
  )
}
