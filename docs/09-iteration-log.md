# Iteration Log

Chronological record of testing feedback, deployment events, and what changed as a result. Unlike `decisions.md` (which records *what was decided and why*) and `ai-use-log.md` (which records *AI interactions*), this file records *what happened when the app met real use or a real deploy* — UAT sessions, bug reports, and iteration off the back of them.

## Format

Each entry: date, what happened (test session / deploy / feedback received), what it revealed, what changed (or will change) as a result.

---

## 18/8/26

Repository audit against the assessment's mandated structure (this session). No app-usage iteration yet — this entry exists to mark the point the repo structure was brought into line with `docs/`, `supabase/functions/`, and `tests/{unit,integration,smoke}/` as required, and to note that an existing Vercel deployment is in place and needs to be kept in sync as Slices 1–5 land. Future entries here should be actual UAT/deploy feedback, not structural housekeeping — that belongs in `decisions.md`.

## 18/8/26 (Slice 1 — App Shell)

`App.tsx` rewritten to wire `Auth`, `AddItemForm`, and `ItemList` together with real Supabase session management (`getSession` on mount, `onAuthStateChange` subscription, Sign Out button). Migration `20260818000000_split_items_rls_policies.sql` written to replace the single broad RLS policy with four per-operation ones. Verified `tsc -b --force` compiles clean with no type errors. **Not yet verified (at time of writing):** the actual sign-in/sign-out/add-item flow in a real browser, and the RLS migration hadn't been run against the live Supabase project yet.

## 18/8/26 (Slice 1 — verified end-to-end)

Ran `npm run dev` and tested the real flow. Hit three separate issues along the way, each diagnosed and fixed rather than worked around:

1. **Sign-up threw "Failed to fetch."** Checked the Supabase project dashboard — status showed "Unhealthy," which looked alarming, but the breakdown showed Database/PostgREST/Auth all Healthy; only Edge Functions was unhealthy, and the app doesn't use Edge Functions. Turned out to be transient/environmental, not a real project issue — retried and the request went through.
2. **Sign-up "succeeded" but no confirmation email arrived.** Checked Authentication → Users in the Supabase dashboard and found the email used was an already-registered, already-confirmed account from May — Supabase silently no-ops re-sending confirmation for an existing confirmed email (by design, to avoid leaking account existence), so there was nothing wrong, just a stale test email being reused. Fixed by testing with a fresh email via `+` addressing.
3. **Confirmation link opened on phone redirected to `localhost:5173`, which doesn't load on a phone.** This one was a genuine misconfiguration, not just a testing artifact: Supabase's Auth "Site URL" was set to `localhost:5173`, meaning the exact same broken redirect would happen to a real user signing up on the deployed Vercel app. Fixed in Supabase dashboard → Authentication → URL Configuration: Site URL set to `https://expiry-mate.vercel.app`, with `http://localhost:5173/**` added as an additional redirect URL so local dev still works.

After the URL fix: signed up, confirmed via email, signed in, added a food item, saw it appear in the list. **Slice 1 is genuinely done** — not just "compiles," the whole auth + CRUD loop works end-to-end against the live Supabase project.

## 18/8/26 (Slice 1 — RLS migration run)

Ran `20260818000000_split_items_rls_policies.sql` in the Supabase SQL Editor. Confirmed in the dashboard's policy list: `items` now shows four separate policies (view/insert/update/delete) instead of the original single "Users can manage their own items." **Slice 1 is fully closed out** — code, live verification, and the security enhancement are all done.

## 18/8/26 (Slice 2 — Full Schema Forms, code complete)

`AddItemForm` now collects category, storage location, quantity, opened status, and date opened alongside name and expiry date; `ItemList`'s inline edit exposes the same full set. Both now go through `useItems` and `validateItemForm` instead of talking to Supabase directly. `tsc -b --force` and `eslint` both pass clean. **Not yet verified:** the actual add/edit flow with the full field set hasn't been tested in a real browser, and the `(user_id, expiry_date)` index migration (`20260818010000_add_items_index.sql`) hasn't been run against the live project yet.

## 18/8/26 (Leftovers date field relabelling)

Raised while reviewing Slice 2: for a Leftovers item there's no printed expiry date to read off a label, since it's homemade food. Fixed `AddItemForm.tsx` and `ItemList.tsx` to relabel the date field to "Date prepared" (with a `max` of today) when category is Leftovers, and to display "prepared {date}" instead of "expires {date}" in the item row. `tsc -b --force` and `eslint` both pass clean. **Known, tracked limitation — not a bug:** the status badge (`getStatus`) still evaluates the date as if it were a future expiry date, so a freshly-added Leftovers item will show "Expiring soon" or "Expired" until Slice 3 replaces `getStatus` with `getAdjustedExpiry`. **Not yet verified:** the relabelling hasn't been exercised in a real browser — need to confirm "Date prepared" actually appears for Leftovers in both the add form and inline edit.

## 18/8/26 (Slice 3 — Adjusted Expiry Logic, code complete)

`src/lib/adjustedExpiry.ts` implements `getAdjustedExpiry` for all 11 categories (Eggs newly added, see `decisions.md` "Category/algorithm reconciliation"), plus `getDaysRemaining`/`getExpiryStatus`. `ItemList.tsx` refactored to extract a memoised `ItemRow` component per the marking-alignment review's performance note, replacing the old printed-date-only `getStatus` with the adjusted-date logic; rows now show the adjusted date, days remaining, and either the Fresh/Soon/Expired badge or a warning message for unsafe/not-recommended combinations. Migration `20260818020000_add_eggs_category.sql` adds Eggs to the DB enum. `tsc -b --force` and `eslint` both pass clean; also hand-verified 11 representative cases (one per category, covering unsafe paths and an exact day-0 boundary) via a throwaway script — all matched expected output. **Not yet verified:** the actual browser flow (picking Eggs/Frozen, toggling storage/opened, watching the badge and warning text update) hasn't been tested live yet.

## 18/8/26 (Eggs migration run)

Ran `20260818020000_add_eggs_category.sql` in the Supabase SQL Editor — confirmed working. `Eggs` is now a real, selectable category on the live project. The browser test of the actual add/edit flow (Eggs, Frozen, storage/opened toggles) is still outstanding.

## 18/8/26 (Slice 3 browser test)

Confirmed working: Eggs and Frozen categories, storage/opened toggles, adjusted date + badge/warning text all update correctly in a real browser. Slice 3 is fully closed out — code, migration, and live verification all done.

## 18/8/26 (Slice 4 — Styling, code complete)

`src/index.css` and `src/App.css` written per the plan (reset/typography/variables in the former, layout in the latter). Found and fixed a real gap: `App.css` was never imported anywhere, so the new styles would have done nothing without adding `import './App.css'` to `App.tsx`. `tsc -b --force` and `eslint` both pass clean. **Not yet verified:** hasn't been opened in a real browser — need to check the auth screen, the item list/cards, the status badge colours (including the new warning colour), and the mobile breakpoint (560px) actually render as intended.

## 18/8/26 (Slice 4 revision — minimal look, dark mode, full-width desktop)

Feedback on the first pass: cluttered UI, wanted a nicer palette with dark mode, wanted the layout to use the full desktop screen while still fitting a phone. Reworked the item card into a cleaner two-row layout, added `useTheme.ts` (manual light/dark toggle, persisted, avoids a flash-of-wrong-theme via a small inline script in `index.html`), and changed `.app-header` to a full-bleed sticky bar with `.item-list` as a responsive grid (multiple columns on wide screens, one column on narrow). `tsc -b --force` and `eslint` both pass clean. **Not yet verified:** hasn't been opened in a real browser — need to check both themes, the toggle persisting across a reload, the grid at desktop width, and the mobile layout at a genuinely narrow width.

## 18/8/26 (Slice 4 second revision — meta grid)

Screenshot showed the middle-dot meta line wrapping with a stray leading dot on the second line. Replaced it with a small label/value grid (one row per fact) instead of a wrapped inline sentence; the warning message gets its own full-width row. `tsc -b --force` and `eslint` both pass clean. Still needs a real browser check.

## 18/8/26 (Slice 4 third revision — card polish)

General "make each card look better" pass: rounded status accent bar (via `::before` + `overflow:hidden` instead of a plain border), icon-only circular Edit/Delete buttons matching the theme toggle's style, a small dot on the status badge, uppercase micro-labels in the meta grid, and a subtle hover lift. `tsc -b --force` and `eslint` both pass clean. **Genuinely not yet verified visually** — this environment can't render the app in a browser, so this is a design judgement call, not something checked before delivery. A real screenshot is the next step.

## 18/8/26 (Slice 4 fourth revision — click-to-expand cards)

Bigger restructure: cards collapsed to countdown/status/name only, clicking one opens a centred modal (via `createPortal`) with a "grows from where you clicked" transform animation, every other fact as a stat tile, and Edit/Delete moved into the modal. `tsc -b --force` and `eslint` both pass clean. **Not yet verified in a real browser** — this is the most interaction-heavy change so far (click targets, animated transform, portal, focus/scroll handling), so it's the most likely of the Slice 4 work to need a real fix-up round once actually clicked through, including on a phone-sized viewport.

## 18/8/26 (Slice 4 fifth revision — add button, sort/filter, labelled edit fields)

Add-item form moved off the dashboard behind a "+" FAB button (`App.tsx`), opening in the same shared `AnimatedModal` now used for both the add and detail flows (extracted into `useAnimatedModal.ts`/`AnimatedModal.tsx` so the animation logic isn't duplicated). `ItemList.tsx` gained a toolbar (search + storage/category/status filters + a place-vs-status sort toggle) and grouped-section rendering with warnings always carved out into their own top section regardless of sort mode, each section headed by a small inline SVG icon. Every edit-form field now has a visible title matching the existing date field's style, fixing an invalid nested-`<label>` bug along the way. `tsc -b --force` and `eslint` both pass clean. **Not yet verified in a real browser** — the add button/modal, sort toggle, each filter, search, warnings-on-top, and the new field labels all still need a real click-through, including a phone-sized check now that the toolbar has five controls.

## 18/8/26 (Slice 4 sixth revision — delete confirmation)

Delete no longer happens on a single click — the Delete icon now arms an in-place confirmation step inside the item-detail modal (warning icon, name, Cancel/Delete) rather than opening a native browser confirm or a second modal. Also fixed a real gap: a failed delete used to fail silently; now the error is surfaced under the confirmation. `tsc -b --force` and `eslint` both pass clean. **Not yet verified in a real browser.**

## 18/8/26 (Slice 5 — Expiry Notifications)

New `useExpiryNotifications` hook fires one batched browser `Notification` per page load listing items within 7 days of (or past) their adjusted expiry date, reusing status logic newly extracted into `src/lib/itemStatus.ts`. A new `ExpiryBanner` shows the same list directly on the dashboard as a dismissible, always-visible fallback, since notifications can be denied/blocked/missed. The optional email-digest stretch (Supabase Edge Function) was deliberately not built — needs an external email-provider API key and scheduling setup outside what's available before Monday; recorded as a scope decision in `decisions.md`, not a gap. `tsc -b --force` and `eslint` both pass clean. **Not yet verified in a real browser** — the permission prompt, the notification firing, and the banner all still need a real check. Slice 5 (Must Have requirements) is now code-complete.

## 18/8/26 (Slice 6 — auto-category suggestion + default date to today)

Built the two quick-win nice-to-haves already planned in `decisions.md`: `AddItemForm` now guesses the category from the item name as it's typed (`src/lib/guessCategory.ts`, a keyword lookup with no AI/network call), stopping as soon as the user picks a category themselves, and the add form's date field now defaults to today instead of blank. AI recipe suggestions and multi-user household sharing (the other two Slice 6 items) were deliberately deferred, not dropped — the user asked to revisit them later. `tsc -b --force` and `eslint` both pass clean; `guessCategory` was also hand-verified against 18 cases via a throwaway script before wiring it in. **Not yet verified in a real browser.**

## 18/8/26 (Slice 4 seventh revision — food-category icons on cards)

Added a hand-drawn icon per food category, shown beside the item name on the collapsed card, in the modal heading, and next to the "Category" stat value — category had never been visible on the card itself before this. No icon library, same plain-SVG style as the rest of the app. `tsc -b --force` and `eslint` both pass clean. **Not yet verified in a real browser** — whether each icon actually reads clearly at card size is a genuinely open question until it's actually seen.

## 18/8/26 (Supabase GitHub deploy integration — caught before connecting)

While helping set up Supabase's GitHub deploy integration, found that every migration so far was applied by hand in the SQL Editor rather than through Supabase's own tooling — meaning the integration would believe none of the 5 migrations had run and would try to replay all of them from scratch on the next merge, failing immediately since the early ones aren't idempotent. Also found `seed.sql` sitting inside `supabase/migrations/`, where it risked being replayed against production as if it were a real migration. Moved `seed.sql` to `supabase/seed/` and prepared `supabase migration repair` commands for the 4 already-applied migrations (deliberately excluding the still-outstanding index migration) for the user to run locally. Caught before the integration was actually connected, not after a broken deploy.

## 18/8/26 (Migration repair completed, GitHub integration connected)

The user ran the prepared repair command. Worked through two real blockers along the way — a missing `SUPABASE_DB_PASSWORD` (fixed via `read -s` so it wouldn't land in shell history), then a genuine network-level timeout to the pooler traced to the network the user was on at the time (confirmed with a raw port check, resolved by switching networks). `migration list` afterwards showed exactly the intended state: 4 migrations correctly marked applied, the index migration correctly still pending. The GitHub "Deploy to production" integration is now connected and live. **Outstanding:** the user's database password passed through this chat in plaintext during troubleshooting; rotating it via Settings → Database has been recommended more than once but not confirmed done.

## 18/8/26 (Card hover contrast + mobile search box sizing — fixed and visually verified)

Two reported bugs: cards turning a bright, low-contrast colour on hover, and the mobile layout not matching the desktop one. Root-caused both by reading the actual CSS cascade rather than guessing — a global `button:hover` rule overriding the card's own background on hover, and a flex-basis meant for width getting reinterpreted as height once the mobile toolbar switches to a column layout. Fixed both with small `App.css` additions. **First real methodology change:** rather than shipping on `tsc`/`eslint` passing alone, built a disposable local Vite + Playwright preview (never committed) rendering the actual components against fake data, and used it to screenshot both bugs reproduced, then both fixes confirmed, at desktop and phone widths, in both themes, before pushing. Desktop confirmed pixel-identical before/after.

## 18/8/26 (Mobile filters collapsed behind a disclosure button)

The three filter selects and the sort-mode toggle now collapse behind a single "Filters" button on phone-width screens (search stays always visible), fixing a layout that previously showed four full-width control rows before a single item card was visible. Implemented as a pure-CSS breakpoint split (`display: contents` on desktop, a real collapsible panel only inside the existing mobile media query) so no JS resize-awareness was needed. Verified with the same disposable screenshot preview: closed, open, and with an active-filter badge, in both themes; desktop confirmed unchanged.
