import { useMemo, useState } from 'react'
import type { FoodCategory, Item, ItemInput, StorageLocation } from '../hooks/useItems'
import { useItemDetail } from '../hooks/useItemDetail'
import { useItemsWithStatus } from '../hooks/useItemsWithStatus'
import { CardHero, ItemDetailModal } from './ItemDetailModal'
import { STATUS_CLASS, STATUS_LABEL } from '../lib/itemStatus'
import type { BadgeStatus } from '../lib/itemStatus'
import { STORAGE_LOCATIONS, sortByUrgency } from '../lib/dashboardStats'
import { CategoryIcon } from './icons'

const CATEGORIES: FoodCategory[] = [
  'Dairy', 'Eggs', 'Meat', 'Seafood', 'Produce', 'Bakery',
  'Frozen', 'Beverages', 'Condiments', 'Snacks', 'Leftovers',
]

// A 4th value on top of BadgeStatus | 'all' — "show me everything that
// isn't fresh," i.e. soon + expired + unsafe combined. Added during the
// Feedback Sprint real-build so the dashboard's "View all expiring" link
// (and a place-dashboard's own needs-attention list) has a real, selectable
// filter behind it rather than a hidden nav-only trick — it shows up in the
// status dropdown too, as "Needs attention (not fresh)".
export type StatusFilterValue = BadgeStatus | 'all' | 'attention'

// --- collapsed card -------------------------------------------------

interface ItemCardProps {
  item: Item
  badgeStatus: BadgeStatus
  countdownValue: number | null
  countdownLabel: string | null
  onOpen: (item: Item, sourceEl: HTMLElement) => void
}

function ItemCard({ item, badgeStatus, countdownValue, countdownLabel, onOpen }: ItemCardProps) {
  return (
    <li>
      <button
        type="button"
        className={`item-card ${STATUS_CLASS[badgeStatus]}`}
        onClick={e => onOpen(item, e.currentTarget)}
      >
        <CardHero
          badgeStatus={badgeStatus}
          countdownValue={countdownValue}
          countdownLabel={countdownLabel}
          warningMessage={null}
          size="card"
        />
        <span className="item-card-footer">
          <CategoryIcon category={item.category} />
          <span className="item-card-name">{item.name}</span>
        </span>
      </button>
    </li>
  )
}


// --- list ---------------------------------------------------------------

type DisplayMode = 'card' | 'table'

interface Props {
  items: Item[]
  onUpdate: (id: string, input: ItemInput) => Promise<{ error?: string }>
  onDelete: (id: string) => Promise<{ error?: string }>
  /** Seeds the storage-location filter when arriving here from a place's
   * "View all X items" link — e.g. Fridge's place-dashboard passes
   * 'Fridge' so the list opens already scoped to it, rather than making
   * the user reselect what they just clicked their way into. Since
   * ItemList only mounts while App's view === 'list', a plain useState
   * initialiser is enough — no effect/key-reset trick needed, it just
   * re-reads this prop fresh each time the list view is (re)entered. */
  initialStorageFilter?: StorageLocation | 'all'
  initialStatusFilter?: StatusFilterValue
}

export function ItemList({
  items, onUpdate, onDelete,
  initialStorageFilter = 'all', initialStatusFilter = 'all',
}: Props) {
  const detail = useItemDetail(onUpdate, onDelete)

  // Defaults to table/list view rather than the card grid (UI feedback pass
  // five, 21/8/26) — the user asked for list view as the default everywhere;
  // the toggle itself is unchanged, this only flips which one loads first.
  const [displayMode, setDisplayMode] = useState<DisplayMode>('table')
  const [storageFilter, setStorageFilter] = useState<StorageLocation | 'all'>(initialStorageFilter)
  const [categoryFilter, setCategoryFilter] = useState<FoodCategory | 'all'>('all')
  // Collapses the 3 filter selects behind a single "Filters" disclosure
  // button on phone-width screens, where showing all three full-width in a
  // row (or stacked) ate a lot of vertical space above the fold. Desktop
  // ignores this entirely (see .item-toolbar-filters' `display: contents`
  // base rule in App.css) — the row layout there already had room for
  // everything, so there's nothing to collapse.
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [statusFilter, setStatusFilter] = useState<StatusFilterValue>(initialStatusFilter)
  const [search, setSearch] = useState('')

  const itemsWithStatus = useItemsWithStatus(items)

  const visible = useMemo(() => {
    const term = search.trim().toLowerCase()
    return itemsWithStatus.filter(({ item, badgeStatus }) => {
      if (storageFilter !== 'all' && item.storage_location !== storageFilter) return false
      if (statusFilter === 'attention') {
        if (badgeStatus === 'fresh') return false
      } else if (statusFilter !== 'all' && badgeStatus !== statusFilter) {
        return false
      }
      if (categoryFilter !== 'all' && item.category !== categoryFilter) return false
      if (term && !item.name.toLowerCase().includes(term)) return false
      return true
    })
  }, [itemsWithStatus, storageFilter, categoryFilter, statusFilter, search])

  // Default read order: closest-to-expiring first, unsafe items pinned to
  // the very front — see lib/dashboardStats.ts. Replaces the earlier
  // "group by status or by place" sections; the dashboard now covers the
  // "what needs attention" summary those sections used to provide.
  const sorted = useMemo(() => sortByUrgency(visible), [visible])

  if (items.length === 0) return <p className="empty">No items yet. Add one to get started!</p>

  const expandedItem = items.find(i => i.id === detail.expandedId) ?? null

  // Only counts the 3 selects tucked behind the "Filters" disclosure — the
  // card/table view toggle isn't a filter (it never hides items), and
  // search has its own always-visible box, so neither belongs in this count.
  const activeFilterCount = [storageFilter, categoryFilter, statusFilter]
    .filter(value => value !== 'all').length

  return (
    <>
      <div className="item-toolbar">
        <div className="search-field">
          <svg className="search-field-icon" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <circle cx="11" cy="11" r="7" />
            <path d="m21 21-4.3-4.3" />
          </svg>
          <input
            type="search"
            className="item-search"
            placeholder="Search by name..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            aria-label="Search items by name"
          />
        </div>

        {/* Phone-only disclosure button — hidden on desktop, where
         * .item-toolbar-filters below renders inline via `display: contents`
         * and this toggle never needs to be shown or clicked at all. */}
        <button
          type="button"
          className="filters-toggle"
          onClick={() => setFiltersOpen(o => !o)}
          aria-expanded={filtersOpen}
          aria-controls="item-filters-panel"
        >
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M4 6h16M8 12h8M11 18h2" />
          </svg>
          Filters
          {activeFilterCount > 0 && <span className="filters-count">{activeFilterCount}</span>}
          <svg className="filters-toggle-chevron" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="m6 9 6 6 6-6" />
          </svg>
        </button>

        <div
          id="item-filters-panel"
          className={`item-toolbar-filters${filtersOpen ? ' is-open' : ''}`}
        >
          <select
            aria-label="Filter by storage location"
            value={storageFilter}
            onChange={e => setStorageFilter(e.target.value as StorageLocation | 'all')}
          >
            <option value="all">All storage</option>
            {STORAGE_LOCATIONS.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <select
            aria-label="Filter by category"
            value={categoryFilter}
            onChange={e => setCategoryFilter(e.target.value as FoodCategory | 'all')}
          >
            <option value="all">All categories</option>
            {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <select
            aria-label="Filter by status"
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value as StatusFilterValue)}
          >
            <option value="all">All statuses</option>
            <option value="attention">Needs attention (not fresh)</option>
            <option value="fresh">Fresh</option>
            <option value="soon">Expiring soon</option>
            <option value="expired">Expired</option>
            <option value="warning">Unsafe</option>
          </select>
        </div>

        {/* Always visible on every screen size, unlike the 3 selects above —
         * how items are displayed matters just as much on phone as desktop,
         * so this isn't tucked behind the "Filters" disclosure. */}
        <div className="view-toggle" role="group" aria-label="View">
          <button
            type="button"
            className={displayMode === 'card' ? 'active' : ''}
            onClick={() => setDisplayMode('card')}
            aria-pressed={displayMode === 'card'}
          >
            Card view
          </button>
          <button
            type="button"
            className={displayMode === 'table' ? 'active' : ''}
            onClick={() => setDisplayMode('table')}
            aria-pressed={displayMode === 'table'}
          >
            List view
          </button>
        </div>
      </div>

      {sorted.length === 0 ? (
        <p className="empty">No items match the current filters.</p>
      ) : displayMode === 'table' ? (
        <div className="table-scroll">
          <table className="item-table">
            <thead>
              <tr>
                <th scope="col">Name</th>
                <th scope="col">Days left</th>
                <th scope="col">Status</th>
                <th scope="col" className="col-collapsible">Category</th>
                <th scope="col" className="col-collapsible">Storage</th>
                <th scope="col" className="col-collapsible">Expiry date</th>
                <th scope="col" className="col-collapsible">Qty</th>
                <th scope="col" className="col-collapsible">Opened</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map(({ item, badgeStatus, daysRemaining }) => {
                const daysLabel = daysRemaining === null
                  ? '—'
                  : daysRemaining < 0
                    ? `${Math.abs(daysRemaining)}d ago`
                    : `${daysRemaining}d left`
                return (
                  <tr
                    key={item.id}
                    className="item-row"
                    role="button"
                    tabIndex={0}
                    onClick={e => detail.openItem(item, e.currentTarget)}
                    onKeyDown={e => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault()
                        detail.openItem(item, e.currentTarget)
                      }
                    }}
                  >
                    <td className="item-row-name">
                      <CategoryIcon category={item.category} />
                      {item.name}
                    </td>
                    <td>{daysLabel}</td>
                    <td>
                      <span className={`status-badge ${STATUS_CLASS[badgeStatus]}`}>{STATUS_LABEL[badgeStatus]}</span>
                    </td>
                    <td className="col-collapsible">{item.category}</td>
                    <td className="col-collapsible">{item.storage_location}</td>
                    <td className="col-collapsible">{item.expiry_date}</td>
                    <td className="col-collapsible">{item.quantity}</td>
                    <td className="col-collapsible">{item.is_opened ? item.date_opened ?? 'Yes' : 'No'}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <ul className="item-list">
          {sorted.map(({ item, badgeStatus, countdownValue, countdownLabel }) => (
            <ItemCard
              key={item.id}
              item={item}
              badgeStatus={badgeStatus}
              countdownValue={countdownValue}
              countdownLabel={countdownLabel}
              onOpen={detail.openItem}
            />
          ))}
        </ul>
      )}

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
    </>
  )
}
