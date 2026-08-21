import { getAdjustedExpiry, getDaysRemaining, getExpiryStatus } from './adjustedExpiry'
import type { AdjustedExpiryResult, ExpiryStatus } from './adjustedExpiry'
import type { Item } from '../hooks/useItems'

// Pulled out of ItemList.tsx (Slice 4) so Slice 5's notification hook can
// reuse the exact same "what status/countdown does this item have" logic
// instead of re-implementing it — the status thresholds only need to be
// defined in one place.

export type BadgeStatus = ExpiryStatus | 'warning'

export const STATUS_LABEL: Record<BadgeStatus, string> = {
  expired: 'Expired',
  soon: 'Expiring soon',
  fresh: 'Fresh',
  warning: 'Unsafe',
}

export const STATUS_CLASS: Record<BadgeStatus, string> = {
  expired: 'status-expired',
  soon: 'status-soon',
  fresh: 'status-fresh',
  warning: 'status-warning',
}

export interface StatusInfo {
  result: AdjustedExpiryResult
  badgeStatus: BadgeStatus
  /** Signed days remaining (negative = past due), or null for a 'warning'
   * item that has no adjusted date at all. countdownValue below is the
   * unsigned display version of this — daysRemaining is what sorting/
   * ranking logic (see ../lib/dashboardStats.ts) actually needs, since it
   * has to distinguish "3 days left" from "3 days ago" rather than treat
   * both as the same magnitude. */
  daysRemaining: number | null
  countdownValue: number | null
  countdownLabel: string | null
}

/** Plain function, not a hook — cheap enough to call per item; callers that
 * need it for a whole list should memoise the mapped array themselves,
 * keyed on the `items` reference (see ../hooks/useItemsWithStatus.ts). */
export function computeStatusInfo(item: Item): StatusInfo {
  const result = getAdjustedExpiry({
    category: item.category,
    storage_location: item.storage_location,
    expiry_date: item.expiry_date,
    is_opened: item.is_opened,
    date_opened: item.date_opened,
  })

  const badgeStatus: BadgeStatus = result.safe ? getExpiryStatus(getDaysRemaining(result.adjustedDate)) : 'warning'
  const daysRemaining = result.safe ? getDaysRemaining(result.adjustedDate) : null
  const isPast = daysRemaining !== null && daysRemaining < 0
  const countdownValue = daysRemaining === null ? null : Math.abs(daysRemaining)
  const countdownLabel = daysRemaining === null
    ? null
    : `day${countdownValue === 1 ? '' : 's'} ${isPast ? 'ago' : 'left'}`

  return { result, badgeStatus, daysRemaining, countdownValue, countdownLabel }
}
