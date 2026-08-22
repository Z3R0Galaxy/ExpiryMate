import { useState } from 'react'
import type { Item, ItemInput } from './useItems'
import { useAnimatedModal } from './useAnimatedModal'
import { validateItemForm, checkStorageSafety } from '../lib/validateItem'
import type { EditState } from '../components/ItemDetailModal'

// Pulled out of ItemList.tsx (UI feedback pass four, 21/8/26) so the same
// open/edit/delete state machine backs `ItemDetailModal` from more than one
// place — previously only ItemList's cards/table rows could open an item's
// expanded view; now AttentionPanel's rows (Dashboard/PlaceDashboard) do
// too, without duplicating this logic a second time. See docs/decisions.md.

export function useItemDetail(
  onUpdate: (id: string, input: ItemInput) => Promise<{ error?: string }>,
  onDelete: (id: string) => Promise<{ error?: string }>,
) {
  const [editingId, setEditingId] = useState<string | null>(null)
  const [edit, setEdit] = useState<EditState | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const modal = useAnimatedModal()

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

    // Matches AddItemForm.tsx's add-time check (Feedback Sprint 2,
    // 22/8/26) — editing an item into an unsafe storage/category/opened
    // combination is blocked the same way adding one into it is.
    const safetyError = checkStorageSafety({
      category: edit.category,
      storage_location: edit.storage_location,
      expiry_date: edit.expiry_date,
      is_opened: edit.is_opened,
      date_opened: edit.is_opened ? edit.date_opened : null,
    })
    if (safetyError) {
      setError(safetyError)
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

  return {
    expandedId,
    editingId,
    edit,
    error,
    modal,
    openItem,
    closeItem,
    startEdit,
    cancelEdit,
    saveEdit,
    handleDelete,
    setEdit,
  }
}
