import { useMemo } from 'react'
import type { Item } from './useItems'
import { computeStatusInfo } from '../lib/itemStatus'
import type { ItemWithStatus } from '../lib/dashboardStats'

/**
 * The one place computeStatusInfo's per-item date math actually gets
 * memoised for a whole list — only recomputes when the `items` array
 * itself changes (a real add/update/delete/refetch), not on every render.
 * Shared by Dashboard, PlaceDashboard, and ItemList so all three agree on
 * the same computed status for the same item, and none of them duplicate
 * the mapping logic (previously only ItemList had this, inline).
 */
export function useItemsWithStatus(items: Item[]): ItemWithStatus[] {
  return useMemo(
    () => items.map(item => ({ item, ...computeStatusInfo(item) })),
    [items],
  )
}
