/**
 * Shared by ExpiryBanner (the always-visible on-page fallback) and
 * useExpiryNotifications (the browser Notification body) so both cap a
 * potentially long list of item names the same way, rather than each
 * re-implementing the same truncation rule.
 *
 * Introduced 21/8/26: with the Feedback Sprint's 135-item seed, the banner
 * was inlining every single expiring item's name with no limit, which is
 * exactly what made it "too crowded and huge" once there were more than a
 * handful of items due — see docs/decisions.md.
 */
export function formatNameList(names: string[], max = 5): string {
  if (names.length <= max) return names.join(', ')
  return `${names.slice(0, max).join(', ')}, and ${names.length - max} more`
}
