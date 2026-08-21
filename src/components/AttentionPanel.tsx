import { AnimatePresence, motion } from 'framer-motion'
import type { Item } from '../hooks/useItems'
import type { ItemWithStatus } from '../lib/dashboardStats'
import { STATUS_LABEL } from '../lib/itemStatus'

// Added UI feedback pass three (21/8/26) — replaces the dashboard/place-
// dashboard's always-on "Needs attention" card with something that can
// also show a single clicked stat tile's full (urgency-sorted) list in the
// same spot, then animate back. Previously, clicking a stat tile navigated
// straight to the full ItemList view; the user asked for the tile to "pop
// up below, replacing the needs attention section" instead, with a nice
// animation — so the transition is now local state inside Dashboard/
// PlaceDashboard (see `selected` there) rather than a page navigation, and
// this component is the one place that renders whichever of the two states
// is currently active. See docs/decisions.md.

const EASE = [0.22, 1, 0.36, 1] as const

function ArrowIcon() {
  return (
    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  )
}

function CloseIcon() {
  return (
    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M18 6 6 18M6 6l12 12" />
    </svg>
  )
}

function AttentionRow({ entry, onOpen }: { entry: ItemWithStatus; onOpen: (item: Item, sourceEl: HTMLElement) => void }) {
  const { item, badgeStatus, countdownValue, countdownLabel } = entry
  return (
    <motion.li
      layout
      initial={{ opacity: 0, x: -6 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.18, ease: EASE }}
    >
      {/* Clickable (UI feedback pass four, 21/8/26) — opens the same
       * ItemDetailModal a card/table row in ItemList does, via the shared
       * useItemDetail hook the caller (Dashboard/PlaceDashboard) owns. A
       * plain `whileHover`/`whileTap` here is safe (unlike the stat tiles
       * above it) since rows already have a gap between them, not a flush
       * shared edge — nothing gets revealed underneath on lift. */}
      <motion.button
        type="button"
        className="attention-row-button"
        onClick={e => onOpen(item, e.currentTarget)}
        whileHover={{ x: 3 }}
        whileTap={{ scale: 0.98 }}
        transition={{ duration: 0.12 }}
      >
        <span className="attention-name">{item.name}</span>
        <span className={`attention-days attention-days-${badgeStatus}`}>
          {badgeStatus === 'warning' ? STATUS_LABEL.warning : `${countdownValue} ${countdownLabel}`}
        </span>
      </motion.button>
    </motion.li>
  )
}

interface AttentionPanelProps {
  /** Capped, priority-ordered list shown when nothing is selected. */
  needsAttention: ItemWithStatus[]
  /** Which stat tile (if any) is currently "expanded" in place of the
   * default needs-attention list. `null` means show the default list. */
  selected: string | null
  /** Full urgency-sorted list matching the selected status — already
   * filtered by the caller (`filterByStatus`), not filtered again here. */
  selectedItems: ItemWithStatus[]
  defaultTitle: string
  selectedTitle: string
  /** Defaults to "Nothing needs attention right now." — pass a
   * place-scoped version (e.g. "Nothing in Fridge needs attention right
   * now.") from `PlaceDashboard`. */
  emptyDefaultNote?: string
  /** Opens the shared ItemDetailModal for a clicked row (UI feedback pass
   * four, 21/8/26) — same open/edit/delete state as ItemList's cards/table
   * rows, owned by the caller's own `useItemDetail()` instance. */
  onOpenItem: (item: Item, sourceEl: HTMLElement) => void
  onClose: () => void
  onViewAllDefault: () => void
  onViewAllSelected: () => void
  viewAllDefaultLabel: string
  viewAllSelectedLabel: string
}

export function AttentionPanel({
  needsAttention,
  selected,
  selectedItems,
  defaultTitle,
  selectedTitle,
  emptyDefaultNote = 'Nothing needs attention right now.',
  onOpenItem,
  onClose,
  onViewAllDefault,
  onViewAllSelected,
  viewAllDefaultLabel,
  viewAllSelectedLabel,
}: AttentionPanelProps) {
  return (
    // Plain div, no `layout` (UI feedback pass seven, 21/8/26) — this card
    // used to animate its own height to fit whichever list was showing;
    // now `.attention-card`'s height is fixed externally by the desktop
    // fill-the-screen stretch chain (see App.css's `.dash-charts-row`), so
    // animating height here would fight that instead of matching it. The
    // list itself scrolls internally (`.attention-list`) rather than the
    // card growing/shrinking.
    <div className="attention-card">
      <AnimatePresence mode="wait" initial={false}>
        {selected === null ? (
          <motion.div
            key="default"
            className="attention-panel-content"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2, ease: EASE }}
          >
            <h2 className="section-title">{defaultTitle}</h2>
            {needsAttention.length === 0 ? (
              <p className="empty-note">{emptyDefaultNote}</p>
            ) : (
              <ul className="attention-list">
                {needsAttention.map(entry => (
                  <AttentionRow key={entry.item.id} entry={entry} onOpen={onOpenItem} />
                ))}
              </ul>
            )}
            <button type="button" className="view-all-button" onClick={onViewAllDefault}>
              {viewAllDefaultLabel}
              <ArrowIcon />
            </button>
          </motion.div>
        ) : (
          <motion.div
            key="selected"
            className="attention-panel-content"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2, ease: EASE }}
          >
            <div className="attention-panel-header">
              <h2 className="section-title">{selectedTitle}</h2>
              <button
                type="button"
                className="icon-button attention-panel-close"
                onClick={onClose}
                aria-label="Back to needs attention"
                title="Back to needs attention"
              >
                <CloseIcon />
              </button>
            </div>
            {/* Full list, no slice/"and N more" (UI feedback pass seven,
             * 21/8/26) — `.attention-list` now scrolls internally instead
             * of the panel truncating, so every matching item is reachable
             * by scrolling rather than only the first PANEL_LIST_LIMIT. */}
            {selectedItems.length === 0 ? (
              <p className="empty-note">No items match.</p>
            ) : (
              <ul className="attention-list">
                {selectedItems.map(entry => (
                  <AttentionRow key={entry.item.id} entry={entry} onOpen={onOpenItem} />
                ))}
              </ul>
            )}
            <button type="button" className="view-all-button" onClick={onViewAllSelected}>
              {viewAllSelectedLabel}
              <ArrowIcon />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
