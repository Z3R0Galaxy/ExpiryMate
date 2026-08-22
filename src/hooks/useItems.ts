import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

export type FoodCategory =
  | 'Dairy'
  | 'Eggs'
  | 'Meat'
  | 'Seafood'
  | 'Produce'
  | 'Bakery'
  | 'Frozen'
  | 'Microwave Meals'
  | 'Beverages'
  | 'Condiments'
  | 'Snacks'
  | 'Leftovers'

export type StorageLocation = 'Fridge' | 'Freezer' | 'Pantry'

export interface Item {
  id: string
  name: string
  category: FoodCategory
  storage_location: StorageLocation
  expiry_date: string
  quantity: number
  is_opened: boolean
  date_opened: string | null
}

export interface ItemInput {
  name: string
  category: FoodCategory
  storage_location: StorageLocation
  expiry_date: string
  quantity: number
  is_opened: boolean
  date_opened: string | null
}

const ITEM_COLUMNS = 'id, name, category, storage_location, expiry_date, quantity, is_opened, date_opened'

/**
 * Centralises all Supabase reads/writes for the items table so AddItemForm
 * and ItemList don't each own their own copy of the query shape (they used
 * to, which is how AddItemForm ended up only inserting name + expiry_date
 * while the table required the full schema — see decisions.md, Slice 2).
 */
export function useItems(userId: string) {
  const [items, setItems] = useState<Item[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchItems = useCallback(async () => {
    // Deliberately no setLoading(true) here — `loading` already starts true
    // (see useState above), and calling setState synchronously before the
    // first `await` in an effect-invoked function triggers cascading
    // renders (react-hooks/set-state-in-effect). Refetches after
    // add/update/delete simply don't re-show the loading state, which
    // avoids an unnecessary flicker anyway.
    const { data, error: fetchError } = await supabase
      .from('items')
      .select(ITEM_COLUMNS)
      .eq('user_id', userId)
      .order('expiry_date', { ascending: true })

    if (fetchError) {
      setError(fetchError.message)
    } else {
      setItems((data ?? []) as unknown as Item[])
      setError(null)
    }
    setLoading(false)
  }, [userId])

  useEffect(() => {
    // react-hooks/set-state-in-effect flags this regardless of where the
    // setState calls sit inside fetchItems (even after the await) — it
    // flags any effect that transitively results in a setState call at
    // all, not specifically synchronous ones. That would rule out the
    // standard "define an async fetch function, call it from a mount
    // effect, call it again after mutations" pattern entirely, which is
    // exactly what's needed here (addItem/updateItem/deleteItem all need
    // to trigger the same refetch). Disabling deliberately rather than
    // restructuring around an overly strict experimental rule.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchItems()
  }, [fetchItems])

  async function addItem(input: ItemInput): Promise<{ error?: string }> {
    const { error: insertError } = await supabase
      .from('items')
      .insert({ user_id: userId, ...input })

    if (insertError) return { error: insertError.message }
    await fetchItems()
    return {}
  }

  async function updateItem(id: string, input: ItemInput): Promise<{ error?: string }> {
    const { error: updateError } = await supabase
      .from('items')
      .update(input)
      .eq('id', id)

    if (updateError) return { error: updateError.message }
    await fetchItems()
    return {}
  }

  async function deleteItem(id: string): Promise<{ error?: string }> {
    const { error: deleteError } = await supabase
      .from('items')
      .delete()
      .eq('id', id)

    if (deleteError) return { error: deleteError.message }
    setItems(prev => prev.filter(item => item.id !== id))
    return {}
  }

  return { items, loading, error, addItem, updateItem, deleteItem, refetch: fetchItems }
}
