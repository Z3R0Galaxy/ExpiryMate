import { useEffect, useMemo, useRef } from 'react'
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
 * re-implemented here) and fires a single batched browser Notification
 * once per page load.
 *
 * It originally surfaced that list two ways, the second being an
 * always-visible in-app banner for when notifications are denied or
 * blocked. The banner was removed on 25/8/26 (the dashboard's own "Needs
 * attention" card already covers the same ground) and its component was
 * retired from src/ on 27/8/26. This hook is now called purely for the
 * notification side effect; the returned list is kept only so a future
 * caller has it.
 *
 * Deliberately excludes "warning" (unsafe/not-recommended) items — those
 * have no adjusted expiry date to be within 7 days of, so they're a
 * different kind of alert (food safety, not a countdown) and are already
 * always surfaced at the top of the dashboard (Slice 4).
 */
export function useExpiryNotifications(items: Item[], loading: boolean) {
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

      // Kept deliberately short (UI feedback pass eight, 21/8/26) - this
      // used to spell out every expiring item's name (comma-separated, via
      // a lib/formatNameList.ts helper, since retired) in the notification
      // body, which read as "too much text" for a system popup. The
      // dashboard's own "Needs attention" card is where the full,
      // scrollable list already lives; this notification's job is just to
      // say "something needs a look"
      const title = 'ExpiryMate'
      const body = expiringItems.length === 1
        ? `${expiringItems[0].name} needs your attention.`
        : `${expiringItems.length} items need your attention.`

      new Notification(title, { body })
    }

    notify()
  }, [loading, expiringItems])

  return { expiringItems }
}
