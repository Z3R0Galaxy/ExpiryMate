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
