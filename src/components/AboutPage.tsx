/**
 * Reached by clicking the sidebar's logo/wordmark (Feedback Sprint 3,
 * 23/8/26) — previously the brand mark was purely decorative. Static
 * content only: a short explanation of what ExpiryMate does and the one
 * behaviour (blocking a save whose category/storage/opened combination is
 * unsafe, rather than calculating a date for it) that most needs a
 * plain-language explanation, since it's the app's one hard "no" to the
 * user. See docs/02-requirements.md and docs/decisions.md, "Feedback
 * Sprint 2."
 *
 * Copy corrected 27/8/26 (see the sweep report, finding 4): this page
 * previously described the block as happening when "the adjusted date
 * would put an already unsafe or expired item back into 'fresh' or
 * 'expiring soon'", which is not the implemented rule at all. The real
 * rule is unconditional on status - checkStorageSafety() in
 * lib/validateItem.ts refuses the save whenever getAdjustedExpiry()
 * classifies the category/storage/opened combination itself as unsafe.
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
          Where you keep something changes how long it lasts, so ExpiryMate
          works out an adjusted expiry date for each item from its category,
          its storage place, and whether it has been opened. An unopened
          carton of milk in the fridge keeps to its printed date; the same
          carton, once opened, is good for about a week from the day you
          opened it.
        </p>
        <p>
          Some combinations are not safe at any date. Raw meat does not
          belong in the pantry, eggs cannot be frozen in their shells, and a
          reheated ready meal should not go back in the freezer. There is no
          sensible adjusted date to show for those, so ExpiryMate refuses to
          save the item and tells you where it actually belongs instead.
          That is deliberate: an adjusted date is a helpful estimate, not a
          substitute for your own judgement about food safety.
        </p>
        <p className="about-meta">Built with React, TypeScript, and Supabase.</p>
      </div>
    </div>
  )
}
