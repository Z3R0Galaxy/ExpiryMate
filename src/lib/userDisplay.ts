/**
 * Shared "derive a display name from the account's email" helpers
 * (Feedback Sprint 3, 23/8/26) — pulled out of Sidebar.tsx, where they were
 * defined inline, so ProfilePage.tsx can show the exact same name/initials
 * rather than a second, easily-drifting copy of the same logic. See
 * decisions.md, "Feedback Sprint 3."
 *
 * ExpiryMate's schema has no display-name/avatar field (only the Supabase
 * Auth email) — rather than leaving a profile block blank, this derives a
 * readable name and initials from the email's local part. A real name
 * field would be a good future addition; this is a deliberate stand-in,
 * not an oversight (see decisions.md, "Feedback Sprint: real UI build").
 */
export function nameFromEmail(email: string): string {
  const local = email.split('@')[0] || 'User'
  const words = local.split(/[._+-]+/).filter(Boolean)
  if (words.length === 0) return 'User'
  return words.map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
}

export function initialsFromName(name: string): string {
  const parts = name.split(' ').filter(Boolean)
  const first = parts[0]?.[0] ?? 'U'
  const second = parts[1]?.[0] ?? ''
  return (first + second).toUpperCase()
}
