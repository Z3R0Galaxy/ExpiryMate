import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import type { Item, ItemInput, StorageLocation } from '../hooks/useItems'
import { useItemsWithStatus } from '../hooks/useItemsWithStatus'
import { useItemDetail } from '../hooks/useItemDetail'
import { ItemDetailModal } from './ItemDetailModal'
import { buildNeedsAttention, countByStatus, filterByStatus, statusPanelTitle } from '../lib/dashboardStats'
import type { BadgeStatus } from '../lib/itemStatus'
import type { NavTarget } from './Dashboard'
import { AttentionPanel } from './AttentionPanel'

interface PlaceDashboardProps {
  items: Item[]
  place: StorageLocation
  onNavigate: (view: 'dashboard' | 'list', target?: NavTarget) => void
  /** Called only from the expanded stat-tile panel's "See full list" button
   * (UI feedback pass three, 21/8/26) — clicking a stat tile itself no
   * longer navigates away, it expands the panel below in place instead.
   * App.tsx wires this to navigateToStatus(status, place), so e.g.
   * "Expired" here means only this place's expired items, not every
   * expired item. */
  onSelectStatus: (status: BadgeStatus | 'all') => void
  /** Backs the shared `ItemDetailModal` opened from an AttentionPanel row
   * (UI feedback pass four, 21/8/26) — same as `Dashboard`'s. */
  onUpdate: (id: string, input: ItemInput) => Promise<{ error?: string }>
  onDelete: (id: string) => Promise<{ error?: string }>
}

type SelectedStat = BadgeStatus | 'all'

/**
 * A deliberately smaller version of the main dashboard, scoped to one
 * storage place — no charts here, since the point is a quick "is
 * everything OK in the Fridge?" glance, not a second full dashboard.
 * Clicking Fridge/Freezer/Pantry from the main dashboard lands here first
 * rather than jumping straight to that place's full item list, matching
 * the "don't show more than needed by default" rule applied one level
 * down — the user still has to actively choose "View all X items" to see
 * everything. See docs/10-feedback-sprint.md.
 *
 * The 4 stat tiles no longer navigate to a new page on click (UI feedback
 * pass three, 21/8/26) — like the main Dashboard, they expand
 * `AttentionPanel` in place instead, scoped to this place's items only.
 */
export function PlaceDashboard({ items, place, onNavigate, onSelectStatus, onUpdate, onDelete }: PlaceDashboardProps) {
  const placeItems = useMemo(() => items.filter(i => i.storage_location === place), [items, place])
  const withStatus = useItemsWithStatus(placeItems)
  const [selected, setSelected] = useState<SelectedStat | null>(null)
  const detail = useItemDetail(onUpdate, onDelete)

  if (placeItems.length === 0) {
    return (
      <div className="dash-grid">
        <p className="empty">No items in {place} yet.</p>
      </div>
    )
  }

  const expandedItem = placeItems.find(i => i.id === detail.expandedId) ?? null
  const statusCounts = countByStatus(withStatus)
  // Uncapped (UI feedback pass seven, 21/8/26) — the panel now scrolls
  // internally (see AttentionPanel.tsx/.attention-list) instead of
  // truncating to a fixed count, so every item that needs attention should
  // be in the list rather than only the first 8.
  const needsAttention = buildNeedsAttention(withStatus, withStatus.length)
  const selectedItems = selected === null ? [] : filterByStatus(withStatus, selected)

  function toggle(stat: SelectedStat) {
    setSelected(current => (current === stat ? null : stat))
  }

  // See Dashboard.tsx's matching comment — no whileHover offset, the tiles
  // are flush against each other in one card (UI feedback pass four, 21/8/26).
  const tileProps = { whileTap: { scale: 0.97 }, transition: { duration: 0.12 } }

  return (
    <div className="dash-grid">
      <div className="stat-row">
        <motion.button
          {...tileProps}
          type="button"
          className={`stat-tile stat-total${selected === 'all' ? ' stat-tile-active' : ''}`}
          onClick={() => toggle('all')}
          aria-pressed={selected === 'all'}
          aria-label={`View all ${placeItems.length} ${place} items`}
        >
          <span className="stat-label">{place} items</span>
          <span className="stat-value">{placeItems.length}</span>
        </motion.button>
        <motion.button
          {...tileProps}
          type="button"
          className={`stat-tile stat-soon${selected === 'soon' ? ' stat-tile-active' : ''}`}
          onClick={() => toggle('soon')}
          aria-pressed={selected === 'soon'}
          aria-label={`View ${statusCounts.soon} ${place} items expiring soon`}
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
          aria-label={`View ${statusCounts.expired} expired ${place} items`}
        >
          <span className="stat-label">Expired</span>
          <span className="stat-value">{statusCounts.expired}</span>
        </motion.button>
        <motion.button
          {...tileProps}
          type="button"
          className={`stat-tile stat-warning${selected === 'warning' ? ' stat-tile-active' : ''}`}
          onClick={() => toggle('warning')}
          aria-pressed={selected === 'warning'}
          aria-label={`View ${statusCounts.warning} unsafe ${place} items`}
        >
          <span className="stat-label">Unsafe</span>
          <span className="stat-value">{statusCounts.warning}</span>
        </motion.button>
      </div>

      <AttentionPanel
        needsAttention={needsAttention}
        selected={selected}
        selectedItems={selectedItems}
        defaultTitle={`Needs attention in ${place}`}
        selectedTitle={selected === null ? '' : statusPanelTitle(selected, place)}
        emptyDefaultNote={`Nothing in ${place} needs attention right now.`}
        onOpenItem={detail.openItem}
        onClose={() => setSelected(null)}
        onViewAllDefault={() => onNavigate('list', place)}
        onViewAllSelected={() => selected !== null && onSelectStatus(selected)}
        viewAllDefaultLabel={`See all ${place} items`}
        viewAllSelectedLabel="See full list"
      />

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
