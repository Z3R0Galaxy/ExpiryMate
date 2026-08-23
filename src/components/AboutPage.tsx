/**
 * Reached by clicking the sidebar's logo/wordmark (Feedback Sprint 3,
 * 23/8/26) — previously the brand mark was purely decorative. Static
 * content only: a short explanation of what ExpiryMate does and the one
 * behaviour (blocking an unsafe adjusted-expiry save rather than silently
 * calculating one) that most needs a plain-language explanation, since it's
 * the app's one hard "no" to the user. See docs/02-requirements.md and
 * docs/decisions.md, "Feedback Sprint 2."
 */
export function AboutPage() {
  return (
    <div className="about-page">
      <div className="about-card">
        <span className="about-brand-mark" aria-hidden="true">
          <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M6 20c-2-6 1-14 9-16 2 6-1 14-9 16Z" />
            <path d="M7 19c3-4 5-8 8-14" />
          </svg>
        </span>
        <h1>About ExpiryMate</h1>
        <p>
          ExpiryMate helps you keep track of what's in your fridge, freezer,
          and pantry, so food gets used before it goes off rather than
          forgotten at the back of a shelf. Add an item once with its
          storage location and expiry date, and ExpiryMate keeps a running
          view of what's fresh, what's expiring soon, and what's already
          gone.
        </p>
        <p>
          Moving an item to a different storage location can shift how long
          it safely keeps — the dashboard offers an adjusted expiry date for
          that new location, but if the adjusted date would put an already
          unsafe or expired item back into "fresh" or "expiring soon", the
          save is blocked rather than accepted. That's deliberate: an
          adjusted date is a helpful estimate, not a substitute for your own
          judgement about food safety.
        </p>
        <p className="about-meta">Built with React, TypeScript, and Supabase.</p>
      </div>
    </div>
  )
}
