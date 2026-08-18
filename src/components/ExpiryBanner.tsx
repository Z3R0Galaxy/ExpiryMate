import type { ExpiringItem } from '../hooks/useExpiryNotifications'

interface Props {
  items: ExpiringItem[]
  onDismiss: () => void
}

/**
 * The always-visible fallback for Slice 5's notification: a browser
 * Notification can be denied, blocked, or simply missed, so this renders
 * the same "what needs attention" information directly on the page,
 * dismissible per session. Doesn't duplicate any status logic itself — it
 * just lists whatever useExpiryNotifications already computed.
 */
export function ExpiryBanner({ items, onDismiss }: Props) {
  if (items.length === 0) return null

  const names = items.map(i => i.name)

  return (
    <div className="expiry-banner" role="status">
      <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="expiry-banner-icon">
        <circle cx="12" cy="12" r="10" />
        <path d="M12 6v6l4 2" />
      </svg>
      <p className="expiry-banner-text">
        <strong>{items.length}</strong> item{items.length === 1 ? '' : 's'} need{items.length === 1 ? 's' : ''} attention: {names.join(', ')}
      </p>
      <button type="button" className="icon-button" onClick={onDismiss} aria-label="Dismiss">
        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M18 6 6 18M6 6l12 12" />
        </svg>
      </button>
    </div>
  )
}
