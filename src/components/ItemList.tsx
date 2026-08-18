import { useMemo, useState } from 'react'
import type { FoodCategory, Item, ItemInput, StorageLocation } from '../hooks/useItems'
import { useAnimatedModal } from '../hooks/useAnimatedModal'
import { AnimatedModal } from './AnimatedModal'
import { validateItemForm } from '../lib/validateItem'
import { computeStatusInfo, STATUS_CLASS, STATUS_LABEL } from '../lib/itemStatus'
import type { BadgeStatus, StatusInfo } from '../lib/itemStatus'
import type { ExpiryStatus } from '../lib/adjustedExpiry'

const CATEGORIES: FoodCategory[] = [
  'Dairy', 'Eggs', 'Meat', 'Seafood', 'Produce', 'Bakery',
  'Frozen', 'Beverages', 'Condiments', 'Snacks', 'Leftovers',
]

const STORAGE_LOCATIONS: StorageLocation[] = ['Fridge', 'Freezer', 'Pantry']
const STATUS_ORDER: ExpiryStatus[] = ['expired', 'soon', 'fresh']

const today = () => new Date().toISOString().slice(0, 10)

type GroupKey = StorageLocation | ExpiryStatus

// computeStatusInfo/BadgeStatus/STATUS_LABEL/STATUS_CLASS now live in
// ../lib/itemStatus (Slice 5) so useExpiryNotifications can reuse the exact
// same status logic instead of duplicating it.
interface StatusEntry extends StatusInfo {
  item: Item
}

interface EditState {
  name: string
  category: FoodCategory
  storage_location: StorageLocation
  expiry_date: string
  quantity: string
  is_opened: boolean
  date_opened: string
}

// --- shared hero (status badge + big countdown) --------------------------

function CardHero({ badgeStatus, countdownValue, countdownLabel, warningMessage, size }: {
  badgeStatus: BadgeStatus
  countdownValue: number | null
  countdownLabel: string | null
  warningMessage: string | null
  size: 'card' | 'modal'
}) {
  return (
    <div className={`item-hero item-hero-${size}`}>
      <span className={`status-badge ${STATUS_CLASS[badgeStatus]}`}>{STATUS_LABEL[badgeStatus]}</span>
      {countdownValue !== null ? (
        <span className="item-countdown">
          <span className="item-countdown-number">{countdownValue}</span>
          <span className="item-countdown-label">{countdownLabel}</span>
        </span>
      ) : (
        <span className="item-countdown item-countdown-warning">
          {/* Collapsed card: repeat the same short label the badge already
           * shows, just larger. Modal: room for the full explanation. */}
          <span className="item-countdown-text">{size === 'modal' ? warningMessage : STATUS_LABEL[badgeStatus]}</span>
        </span>
      )}
    </div>
  )
}

// --- section header icons -------------------------------------------------

function GroupIcon({ groupKey }: { groupKey: GroupKey | 'warning' }) {
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
        <span className="item-card-name">{item.name}</span>
      </button>
    </li>
  )
}

// --- expanded modal ---------------------------------------------------

interface ItemDetailModalProps {
  item: Item
  visible: boolean
  origin: { x: number; y: number }
  isEditing: boolean
  edit: EditState | null
  error: string | null
  onClose: () => void
  onStartEdit: (item: Item) => void
  onCancelEdit: () => void
  onSaveEdit: (id: string) => void
  onDelete: (id: string) => Promise<string | undefined>
  setEdit: (edit: EditState) => void
}

function ItemDetailModal({
  item, visible, origin, isEditing, edit, error,
  onClose, onStartEdit, onCancelEdit, onSaveEdit, onDelete, setEdit,
}: ItemDetailModalProps) {
  const { result, badgeStatus, countdownValue, countdownLabel } = computeStatusInfo(item)

  // Deletion is destructive and irreversible, so clicking the Delete icon
  // only arms a confirmation step inside the modal rather than deleting
  // immediately — the actual delete only happens once the user confirms.
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  function armDelete() {
    setDeleteError(null)
    setConfirmingDelete(true)
  }

  function cancelDelete() {
    setDeleteError(null)
    setConfirmingDelete(false)
  }

  async function confirmDelete() {
    const err = await onDelete(item.id)
    // On success the parent closes the whole modal (see ItemList's
    // handleDelete), so there's nothing left to reset here. On failure,
    // stay in the confirmation state and show why it didn't work.
    if (err) setDeleteError(err)
  }

  return (
    <AnimatedModal visible={visible} origin={origin} onClose={onClose}>
      <div className="item-modal-header">
        <div className="item-modal-header-actions">
          {!isEditing && !confirmingDelete && (
            <>
              <button
                type="button"
                className="icon-button"
                onClick={() => onStartEdit(item)}
                aria-label={`Edit ${item.name}`}
                title="Edit"
              >
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M12 20h9" />
                  <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
                </svg>
              </button>
              <button
                type="button"
                className="icon-button icon-button-danger"
                onClick={armDelete}
                aria-label={`Delete ${item.name}`}
                title="Delete"
              >
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M3 6h18" />
                  <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                  <path d="M10 11v6M14 11v6" />
                </svg>
              </button>
            </>
          )}
        </div>
        <button type="button" className="icon-button" onClick={onClose} aria-label="Close" title="Close">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M18 6 6 18M6 6l12 12" />
          </svg>
        </button>
      </div>

      {confirmingDelete ? (
        <div className="delete-confirm">
          <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="delete-confirm-icon">
            <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z" />
            <path d="M12 9v4M12 17h.01" />
          </svg>
          <p className="delete-confirm-text">Delete <strong>{item.name}</strong>? This can't be undone.</p>
          {deleteError && <p className="error">{deleteError}</p>}
          <div className="delete-confirm-actions">
            <button type="button" className="button-secondary" onClick={cancelDelete}>Cancel</button>
            <button type="button" className="button-danger" onClick={confirmDelete}>Delete</button>
          </div>
        </div>
      ) : isEditing && edit ? (
        <div className="item-edit">
          <label className="field-label">
            Item name
            <input
              value={edit.name}
              onChange={e => setEdit({ ...edit, name: e.target.value })}
            />
          </label>
          <label className="field-label">
            Category
            <select
              value={edit.category}
              onChange={e => setEdit({ ...edit, category: e.target.value as FoodCategory })}
            >
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </label>
          <label className="field-label">
            Storage location
            <select
              value={edit.storage_location}
              onChange={e => setEdit({ ...edit, storage_location: e.target.value as StorageLocation })}
            >
              {STORAGE_LOCATIONS.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </label>
          <label className="field-label">
            {edit.category === 'Leftovers' ? 'Date prepared' : 'Printed expiry date'}
            <input
              type="date"
              value={edit.expiry_date}
              onChange={e => setEdit({ ...edit, expiry_date: e.target.value })}
              max={edit.category === 'Leftovers' ? today() : undefined}
            />
          </label>
          <label className="field-label">
            Quantity
            <input
              type="number"
              min={1}
              max={999}
              value={edit.quantity}
              onChange={e => setEdit({ ...edit, quantity: e.target.value })}
            />
          </label>
          {/* A div, not a label — the checkbox already has its own label
              below, and a label can't validly wrap another label. */}
          <div className="field-label">
            Opened?
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={edit.is_opened}
                onChange={e => setEdit({
                  ...edit,
                  is_opened: e.target.checked,
                  date_opened: e.target.checked ? edit.date_opened : '',
                })}
              />
              {edit.is_opened ? 'Yes' : 'No'}
            </label>
          </div>
          {edit.is_opened && (
            <label className="field-label">
              Date opened
              <input
                type="date"
                value={edit.date_opened}
                onChange={e => setEdit({ ...edit, date_opened: e.target.value })}
                max={today()}
              />
            </label>
          )}
          {error && <p className="error">{error}</p>}
          <button onClick={() => onSaveEdit(item.id)}>Save</button>
          <button onClick={onCancelEdit}>Cancel</button>
        </div>
      ) : (
        <>
          <CardHero
            badgeStatus={badgeStatus}
            countdownValue={countdownValue}
            countdownLabel={countdownLabel}
            warningMessage={result.safe ? null : result.message}
            size="modal"
          />
          <h2 className="item-modal-name">{item.name}</h2>

          <dl className="item-stat-grid">
            <div className="item-stat-tile">
              <dt>Category</dt>
              <dd>{item.category}</dd>
            </div>
            <div className="item-stat-tile">
              <dt>Storage</dt>
              <dd>{item.storage_location}</dd>
            </div>
            <div className="item-stat-tile">
              <dt>{item.category === 'Leftovers' ? 'Prepared' : 'Expires'}</dt>
              <dd>{item.expiry_date}</dd>
            </div>
            <div className="item-stat-tile">
              <dt>Qty</dt>
              <dd>{item.quantity}</dd>
            </div>
            {result.safe && (
              <div className="item-stat-tile">
                <dt>Adjusted</dt>
                <dd>{result.adjustedDate}</dd>
              </div>
            )}
            {item.is_opened && (
              <div className="item-stat-tile">
                <dt>Opened</dt>
                <dd>{item.date_opened}</dd>
              </div>
            )}
          </dl>
        </>
      )}
    </AnimatedModal>
  )
}

// --- list ---------------------------------------------------------------

interface Props {
  items: Item[]
  loading: boolean
  onUpdate: (id: string, input: ItemInput) => Promise<{ error?: string }>
  onDelete: (id: string) => Promise<{ error?: string }>
}

type SortMode = 'status' | 'place'

export function ItemList({ items, loading, onUpdate, onDelete }: Props) {
  const [editingId, setEditingId] = useState<string | null>(null)
  const [edit, setEdit] = useState<EditState | null>(null)
  const [error, setError] = useState<string | null>(null)

  const [expandedId, setExpandedId] = useState<string | null>(null)
  const modal = useAnimatedModal()

  const [sortMode, setSortMode] = useState<SortMode>('status')
  const [storageFilter, setStorageFilter] = useState<StorageLocation | 'all'>('all')
  const [categoryFilter, setCategoryFilter] = useState<FoodCategory | 'all'>('all')
  const [statusFilter, setStatusFilter] = useState<BadgeStatus | 'all'>('all')
  const [search, setSearch] = useState('')

  // The one place getAdjustedExpiry's date math actually gets memoised —
  // only recomputes when the `items` array itself changes (a real
  // add/update/delete/refetch), not on every render while e.g. typing in
  // the edit form or toggling a filter.
  const itemsWithStatus: StatusEntry[] = useMemo(
    () => items.map(item => ({ item, ...computeStatusInfo(item) })),
    [items],
  )

  const visible = useMemo(() => {
    const term = search.trim().toLowerCase()
    return itemsWithStatus.filter(({ item, badgeStatus }) => {
      if (storageFilter !== 'all' && item.storage_location !== storageFilter) return false
      if (categoryFilter !== 'all' && item.category !== categoryFilter) return false
      if (statusFilter !== 'all' && badgeStatus !== statusFilter) return false
      if (term && !item.name.toLowerCase().includes(term)) return false
      return true
    })
  }, [itemsWithStatus, storageFilter, categoryFilter, statusFilter, search])

  // Warnings always float to the very top, above whichever grouping the
  // sort mode produces — a deliberate rule, not just a side effect of sort
  // order, per the standing "always keep unsafe items visible" request.
  const { warningEntries, groups } = useMemo(() => {
    const warnings = visible.filter(v => v.badgeStatus === 'warning')
    const safe = visible.filter(v => v.badgeStatus !== 'warning')

    const groups = sortMode === 'place'
      ? STORAGE_LOCATIONS.map(loc => ({
          key: loc as GroupKey,
          label: loc,
          entries: safe.filter(v => v.item.storage_location === loc),
        }))
      : STATUS_ORDER.map(status => ({
          key: status as GroupKey,
          label: STATUS_LABEL[status],
          entries: safe.filter(v => v.badgeStatus === status),
        }))

    return { warningEntries: warnings, groups: groups.filter(g => g.entries.length > 0) }
  }, [visible, sortMode])

  function openItem(item: Item, sourceEl: HTMLElement) {
    setExpandedId(item.id)
    modal.openFrom(sourceEl)
  }

  function closeItem() {
    modal.close()
    setEditingId(null)
    setEdit(null)
    setError(null)
  }

  function startEdit(item: Item) {
    setEditingId(item.id)
    setError(null)
    setEdit({
      name: item.name,
      category: item.category,
      storage_location: item.storage_location,
      expiry_date: item.expiry_date,
      quantity: String(item.quantity),
      is_opened: item.is_opened,
      date_opened: item.date_opened ?? '',
    })
  }

  function cancelEdit() {
    setEditingId(null)
    setEdit(null)
    setError(null)
  }

  async function saveEdit(id: string) {
    if (!edit) return

    const validationError = validateItemForm(edit)
    if (validationError) {
      setError(validationError)
      return
    }

    const { error: updateError } = await onUpdate(id, {
      name: edit.name.trim(),
      category: edit.category,
      storage_location: edit.storage_location,
      expiry_date: edit.expiry_date,
      quantity: Number(edit.quantity),
      is_opened: edit.is_opened,
      date_opened: edit.is_opened ? edit.date_opened : null,
    })

    if (updateError) {
      setError(updateError)
    } else {
      cancelEdit()
    }
  }

  async function handleDelete(id: string) {
    const { error: deleteError } = await onDelete(id)
    if (!deleteError && expandedId === id) {
      closeItem()
    }
    return deleteError
  }

  if (loading) return <p>Loading items...</p>
  if (items.length === 0) return <p className="empty">No items yet. Add one to get started!</p>

  const expandedItem = items.find(i => i.id === expandedId) ?? null

  return (
    <>
      <div className="item-toolbar">
        <input
          type="search"
          className="item-search"
          placeholder="Search by name..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          aria-label="Search items by name"
        />
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
          onChange={e => setStatusFilter(e.target.value as BadgeStatus | 'all')}
        >
          <option value="all">All statuses</option>
          <option value="fresh">Fresh</option>
          <option value="soon">Expiring soon</option>
          <option value="expired">Expired</option>
          <option value="warning">Unsafe</option>
        </select>
        <div className="sort-toggle" role="group" aria-label="Sort by">
          <button
            type="button"
            className={sortMode === 'status' ? 'active' : ''}
            onClick={() => setSortMode('status')}
          >
            By status
          </button>
          <button
            type="button"
            className={sortMode === 'place' ? 'active' : ''}
            onClick={() => setSortMode('place')}
          >
            By place
          </button>
        </div>
      </div>

      {visible.length === 0 ? (
        <p className="empty">No items match the current filters.</p>
      ) : (
        <div className="item-groups">
          {warningEntries.length > 0 && (
            <section className="item-group item-group-warning">
              <h2 className="item-group-title">
                <GroupIcon groupKey="warning" />
                Unsafe
              </h2>
              <ul className="item-list">
                {warningEntries.map(({ item, badgeStatus, countdownValue, countdownLabel }) => (
                  <ItemCard
                    key={item.id}
                    item={item}
                    badgeStatus={badgeStatus}
                    countdownValue={countdownValue}
                    countdownLabel={countdownLabel}
                    onOpen={openItem}
                  />
                ))}
              </ul>
            </section>
          )}
          {groups.map(group => (
            <section key={group.key} className="item-group">
              <h2 className="item-group-title">
                <GroupIcon groupKey={group.key} />
                {group.label}
              </h2>
              <ul className="item-list">
                {group.entries.map(({ item, badgeStatus, countdownValue, countdownLabel }) => (
                  <ItemCard
                    key={item.id}
                    item={item}
                    badgeStatus={badgeStatus}
                    countdownValue={countdownValue}
                    countdownLabel={countdownLabel}
                    onOpen={openItem}
                  />
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}

      {modal.open && expandedItem && (
        <ItemDetailModal
          item={expandedItem}
          visible={modal.visible}
          origin={modal.origin}
          isEditing={editingId === expandedItem.id}
          edit={edit}
          error={error}
          onClose={closeItem}
          onStartEdit={startEdit}
          onCancelEdit={cancelEdit}
          onSaveEdit={saveEdit}
          onDelete={handleDelete}
          setEdit={setEdit}
        />
      )}
    </>
  )
}
