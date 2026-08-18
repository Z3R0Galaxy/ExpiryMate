import { useEffect, useMemo, useRef, useState } from 'react'
import type { Item } from './useItems'
import { computeStatusInfo } from '../lib/itemStatus'

export interface ExpiringItem {
  id: string
  name: string
  badgeStatus: 'soon' | 'expired'
}

/**
 * Slice 5 — Expiry Notifications. Finds every item within 7 days of its
 * adjusted expiry date (or already past it — "soon"/"expired" per the
 * existing status thresholds in itemStatus.ts, not a separate 7-day check
 * re-implemented here) and surfaces it two ways: as data for an in-app
 * banner that always renders regardless of permission, and as a single
 * batched browser Notification fired once per page load.
 *
 * Deliberately excludes "warning" (unsafe/not-recommended) items — those
 * have no adjusted expiry date to be within 7 days of, so they're a
 * different kind of alert (food safety, not a countdown) and are already
 * always surfaced at the top of the dashboard (Slice 4).
 */
export function useExpiryNotifications(items: Item[], loading: boolean) {
  const [dismissed, setDismissed] = useState(false)
  // Guards the actual Notification call so it only ever fires once per
  // page load — re-checking (and re-notifying) on every items change would
  // spam the user every time they add/edit/delete anything, which is
  // exactly the "one batched notification, not one per render" performance
  // choice called out in decisions.md.
  const hasNotifiedRef = useRef(false)

  const expiringItems = useMemo<ExpiringItem[]>(() => {
    return items
      .map(item => ({ item, ...computeStatusInfo(item) }))
      .filter(({ badgeStatus }) => badgeStatus === 'soon' || badgeStatus === 'expired')
      .map(({ item, badgeStatus }) => ({
        id: item.id,
        name: item.name,
        badgeStatus: badgeStatus as 'soon' | 'expired',
      }))
  }, [items])

  useEffect(() => {
    // Wait for the real first load to finish rather than firing on the
    // empty array useItems starts with before its fetch resolves.
    if (loading || hasNotifiedRef.current) return
    hasNotifiedRef.current = true

    if (expiringItems.length === 0) return
    if (typeof Notification === 'undefined') return // unsupported browser/environment

    async function notify() {
      let permission = Notification.permission
      if (permission === 'default') {
        permission = await Notification.requestPermission()
      }
      if (permission !== 'granted') return

      const names = expiringItems.map(i => i.name)
      const title = expiringItems.length === 1
        ? '1 item needs attention — ExpiryMate'
        : `${expiringItems.length} items need attention — ExpiryMate`
      const body = names.length <= 5
        ? names.join(', ')
        : `${names.slice(0, 5).join(', ')} and ${names.length - 5} more`

      new Notification(title, { body })
    }

    notify()
  }, [loading, expiringItems])

  return { expiringItems, dismissed, dismiss: () => setDismissed(true) }
}
