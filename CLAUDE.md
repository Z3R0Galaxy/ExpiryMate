# ExpiryMate — Project Memory

## Standing Instructions
- **Always update `docs/ai-use-log.md` at the end of every session.** Add a dated entry (DD/M/YY format) summarising what was discussed or built. If multiple things happened, use a short paragraph or bullet points. Do this without being asked.
- **Always update `docs/decisions.md` whenever a design or architectural decision is made.** Record what was decided and why. Do this without being asked.
- **Commit and push to GitHub after every milestone.** A milestone means a completed slice, or anything finer-grained that's a coherent, working unit (e.g. one component wired up, one migration applied, one doc written). Each commit should have a message describing what that specific unit of work was — not a generic "updates" message. Push immediately after committing, don't batch multiple milestones into one push.

## What This Is
A **React + TypeScript + Vite** web app that helps household members track food expiry dates, reducing waste. Users can add items with expiry dates, get status indicators (fresh / expiring soon / expired), edit items, and delete them. Authentication is handled via Supabase Auth.

Built for Year 12 Software Engineering, Assessment Task 3 (Software Engineering Project) — due 8:00am Monday 24 August 2026. Full assessment requirements are reconciled against the repo in `docs/decisions.md` (see "Repository structure alignment" and "Marking-alignment review", both 18/8/26).

## Tech Stack
| Layer | Technology |
|---|---|
| Frontend | React 19, TypeScript 6, Vite 8 |
| Backend / DB | Supabase (Postgres + Auth + RLS) |
| Hosting | Vercel — live at https://expiry-mate.vercel.app, auto-deploys from `main` |
| Styling | Plain CSS (no UI library) |
| Build/Lint | ESLint, TSC |

## Environment Variables (`.env.local`)
```
VITE_SUPABASE_URL=https://xsvzsghbmqrhwvjkbqka.supabase.co
VITE_SUPABASE_ANON_KEY=sb_publishable_TTty4_mGdp_FQStC5ZmFpA_1MCPsAwo
```
Not committed (git-ignored). This project is submitted as a zip to a teacher rather than cloned by other developers, so there's deliberately no `.env.local.example` — see `docs/ai-use-log.md`, 18/8/26.

## Project Structure
```
docs/
  01-problem-statement.md
  02-requirements.md
  03-architecture.md
  04-data-model.md
  05-security-review.md
  06-front-end-architecture.md
  07-evaluation.md            — skeleton, fill in once Slices 1-3 are usable
  08-test-plan.md             — skeleton, fill in as tests/ gets populated
  09-iteration-log.md         — skeleton, log UAT/deploy feedback here as it happens
  10-feedback-sprint.md       — Feedback Sprint (teacher UX review, 21/8/26): feedback, discussion, plan of attack, status
  wireframes/
    feedback-sprint-dashboard-wireframe.html — rough, clickable, self-contained mockup (mock 112-item dataset); not wired to Supabase, agree structure before real build
  decisions.md                — slice plan, algorithm spec, all major decisions
  ai-use-log.md               — every substantive AI interaction, prompt/response/accepted-or-not
src/
  App.tsx               — session-managed shell: Auth vs. AuthenticatedApp, imports App.css
  main.tsx              — React entry point, imports index.css
  index.css             — reset, base typography, colour variables (Slice 4)
  App.css               — layout for auth screen, app shell, forms, item list/cards (Slice 4)
  hooks/
    useItems.ts         — centralises all Supabase reads/writes for items
    useTheme.ts          — manual light/dark toggle, persisted to localStorage (Slice 4)
    useAnimatedModal.ts — shared "grows from where you clicked" open/close/animation state (Slice 4)
    useExpiryNotifications.ts — finds items within 7 days of adjusted expiry, fires one batched browser Notification per load (Slice 5)
  lib/
    supabase.ts         — Supabase client initialisation (anon key only)
    validateItem.ts     — shared client-side validation for add + edit forms
    adjustedExpiry.ts   — getAdjustedExpiry (Slice 3 algorithm), getDaysRemaining, getExpiryStatus
    itemStatus.ts       — computeStatusInfo/BadgeStatus/STATUS_LABEL/STATUS_CLASS, shared by ItemList and useExpiryNotifications (Slice 5)
    guessCategory.ts    — keyword-based category guess from item name, no AI/network call (Slice 6)
  components/
    Auth.tsx            — Email/password sign-up & sign-in form
    AddItemForm.tsx     — full item schema, category/storage/quantity/opened/date-opened, opens from App.tsx's "+" button (Slice 4)
    AnimatedModal.tsx   — shared portal/backdrop/escape/scroll-lock modal shell, used by both the add-item and item-detail flows (Slice 4)
    ItemList.tsx        — full item schema, adjusted-expiry status badges/countdown, toolbar (search/filter/sort), grouped sections
    ExpiryBanner.tsx    — always-visible in-app fallback for Slice 5's notification (browser Notification can be denied/blocked/missed)
supabase/
  migrations/
    20260507000000_create_items.sql              — items table + RLS policy
    20260601000000_add_item_fields.sql           — adds category, storage_location, quantity, is_opened, date_opened
    20260818000000_split_items_rls_policies.sql  — RLS: one broad policy -> four per-operation policies
    20260818010000_add_items_index.sql           — composite index on (user_id, expiry_date)
    20260818020000_add_eggs_category.sql         — adds Eggs to the food_category enum
  functions/           — empty; Slice 5's optional email-digest stretch was deliberately not built (needs an external email-provider API key + scheduling — see decisions.md, "Slice 5: Expiry Notifications")
  seed/
    seed.sql           — ~20 representative household items for local testing; moved out of migrations/ (18/8/26) so a migration-runner never replays it against production — see decisions.md, "GitHub deploy integration: migration history reconciliation"
    feedback-sprint-seed.sql — 135 items across every category/storage/status (Feedback Sprint, 21/8/26), generated by inverting the adjusted-expiry algorithm per row and verified forward before writing — see decisions.md, "Feedback Sprint database seed". Not yet run.
tests/
  unit/                — empty, reserved — adjustedExpiry.ts is written pure/testable, tests not yet written
  integration/         — empty, reserved for RLS/constraint tests
  smoke/               — empty, reserved for post-deploy manual checklist
```

## Database Schema
```sql
items (
  id               uuid PK   default gen_random_uuid(),
  user_id          uuid FK   → auth.users(id) ON DELETE CASCADE,
  name             text      NOT NULL,
  category         food_category NOT NULL,  -- Dairy|Eggs|Meat|Seafood|Produce|Bakery|Frozen|Beverages|Condiments|Snacks|Leftovers
                                             -- Eggs added 18/8/26 (migration 20260818020000, run against the live project and confirmed)
  storage_location storage_location NOT NULL,  -- Fridge|Freezer|Pantry
  expiry_date      date      NOT NULL,
  quantity         integer   NOT NULL check (quantity between 1 and 999),
  is_opened        boolean   NOT NULL default false,
  date_opened      date,     -- required when is_opened = true
  created_at       timestamptz default now()
)
-- RLS: users can only see/manage their own rows. The original broad "for all"
-- policy was split into four per-operation policies
-- (20260818000000_split_items_rls_policies.sql), run against the live project
-- and confirmed 18/8/26 (four separate policies now visible in the dashboard).
```

**Migration application status (as of 18/8/26):** `20260507000000`, `20260601000000`, `20260818000000` (RLS split), and `20260818020000` (Eggs) have all been run by hand in the Supabase SQL Editor and are live. `20260818010000` (the `(user_id, expiry_date)` index) has **not** been run yet — it's the one outstanding migration. All 5 were applied outside the Supabase CLI/GitHub integration, which matters if that integration ever gets connected: see `decisions.md`, "GitHub deploy integration: migration history reconciliation," for why its own migration-history table needs a manual `supabase migration repair` for the 4 already-applied ones before it's safe to connect.
Full schema detail and ERD: `docs/04-data-model.md`.

## Key Components

### `Auth.tsx`
- Toggle between Sign In / Sign Up
- Uses `supabase.auth.signInWithPassword` and `supabase.auth.signUp`
- Shows confirmation message after sign-up (email verification is confirmed ON in the Supabase project as of 18/8/26)

### `useItems.ts` (`src/hooks/`)
- Owns all Supabase reads/writes for `items` — `AddItemForm` and `ItemList` no longer talk to Supabase directly
- Returns `{ items, loading, error, addItem, updateItem, deleteItem, refetch }`

### `validateItem.ts` (`src/lib/`)
- `validateItemForm(values)` — shared client-side validation used by both the add form and the inline edit form

### `AddItemForm.tsx`
- Props: `onAdd: (input: ItemInput) => Promise<{ error?: string }>`
- Collects all required fields: name, category, storage location, printed expiry date, quantity, opened status, date opened (conditionally) — every field has its own visible `field-label` title
- No longer rendered inline on the dashboard (Slice 4 fifth revision) — `App.tsx` opens it inside `AnimatedModal` from a fixed "+" button
- Category auto-guessed from the name as it's typed (`guessCategory`, Slice 6) until the user picks one themselves, tracked via a `categoryTouched` flag; date field defaults to today instead of blank (Slice 6), still fully editable

### `useAnimatedModal.ts` / `AnimatedModal.tsx`
- Shared open/visible/origin state machine + portal/backdrop/escape/scroll-lock shell, extracted once the add-item flow needed the same "grows from where you clicked" animation as the item-detail modal
- `useAnimatedModal()` returns `{ open, visible, origin, openFrom, close }`; `openFrom(sourceEl)` captures `sourceEl.getBoundingClientRect()` as the animation's origin point
- Used by both `App.tsx` (add-item modal) and `ItemList.tsx` (item-detail modal)

### `adjustedExpiry.ts` (`src/lib/`)
- `getAdjustedExpiry(item)` — pure function implementing the full Adjusted Expiry Date Algorithm (`decisions.md`) for all 11 categories, returns `{ safe: true, adjustedDate }` or `{ safe: false, message }` for unsafe/not-recommended combinations
- `getDaysRemaining(adjustedDate)`, `getExpiryStatus(days)` — derive the Fresh/Soon/Expired status from the adjusted date, not the printed one

### `itemStatus.ts` (`src/lib/`)
- `computeStatusInfo(item)` — combines `getAdjustedExpiry` + `getDaysRemaining`/`getExpiryStatus` into one `{ result, badgeStatus, countdownValue, countdownLabel }`, where `badgeStatus` is `'fresh' | 'soon' | 'expired' | 'warning'`
- Extracted from `ItemList.tsx` in Slice 5 so `useExpiryNotifications` uses the identical status logic rather than a second copy

### `useExpiryNotifications.ts` (`src/hooks/`)
- `useExpiryNotifications(items, loading)` — returns `{ expiringItems, dismissed, dismiss }`
- `expiringItems`: every item whose `badgeStatus` is `soon` or `expired` (i.e. within 7 days of, or past, its adjusted expiry date); `warning`/unsafe items are deliberately excluded (no adjusted date to be "within 7 days" of, and already always shown at the top of the dashboard)
- Fires exactly one batched browser `Notification` the first time `loading` becomes `false` (guarded by a ref so it never re-fires on later item changes), requesting permission if not yet granted/denied; listing up to 5 names with an "and N more" suffix beyond that
- The optional Slice 5 stretch (a Supabase Edge Function daily email digest) was deliberately not built — see `decisions.md`, "Slice 5: Expiry Notifications"

### `ExpiryBanner.tsx` (`src/components/`)
- Props: `items: ExpiringItem[]`, `onDismiss: () => void`
- Always-visible fallback rendered on the dashboard whenever `expiringItems` is non-empty, since a browser `Notification` can be silently denied/blocked/missed — lists the same item names, dismissible per session

### `guessCategory.ts` (`src/lib/`)
- `guessCategory(name)` — pure keyword lookup, no AI/network call; returns a `FoodCategory` or `null` if nothing matches
- Checked in a deliberate priority order (Frozen first, so "frozen chicken" reads as Frozen not Meat); whole-word regex matching for single-word keywords, plain substring matching for phrases like "ice cream"
- Used by `AddItemForm` to pre-fill `category` from the name, only while the user hasn't picked a category themselves

### `ItemList.tsx`
- Props: `items`, `loading`, `onUpdate`, `onDelete` (all from `useItems`, passed down via `App.tsx`)
- Collapsed cards (`ItemCard`) are minimal and click-to-expand: status badge, a large countdown (days left/ago, or a warning label if the item has no safe adjusted date), a category icon (`CategoryIcon`, one hand-drawn SVG per `FoodCategory`, no icon library) beside the name, and the name — no Edit/Delete on the collapsed card. Same category icon also shown in the modal heading and next to the "Category" stat value, for consistency
- Clicking a card opens `ItemDetailModal` via the shared `AnimatedModal` (rendered via `createPortal` into `document.body`), centred, with a "grows from where you clicked" transform animation built from `getBoundingClientRect()` + CSS transitions (no animation library). Shows every remaining fact as its own stat tile, plus Edit/Delete as icon buttons; Edit swaps the modal's content to the inline-edit form in place, with every field now having its own visible `field-label` title. Delete arms an in-place confirmation step (Cancel/Delete, with any failure shown inline) rather than deleting immediately or using a native browser confirm
- Status/countdown derive from `getAdjustedExpiry`'s adjusted date via a plain `computeStatusInfo(item)` function, memoised once at the list level (`itemsWithStatus`), not per-card
- A toolbar above the cards offers a search box (matches name), three filter dropdowns (storage location, category, status), and a two-way sort toggle restricted to place (Fridge/Freezer/Pantry) or status (Expired/Soon/Fresh). Filtered items are split into sections: unsafe/warning items always form their own section at the top regardless of sort mode, followed by one section per non-empty group in the active sort mode, each headed by a small inline SVG icon. Below 560px, the three selects and the sort toggle collapse behind a single `.filters-toggle` disclosure button (search stays always visible) — a pure-CSS breakpoint split (`display: contents` on the wrapper at desktop, a real collapsible panel only inside the mobile media query), not a JS resize listener, so the desktop row layout is unaffected
- Inline edit mode (inside the modal) exposes the full field set, same validation as the add form

## Current State (as of 18/8/26)
- **Slice 1 (App Shell) is fully done and verified.** Full sign-up → email confirmation → sign-in → add item → see it in the list works end-to-end against the live Supabase project. Also fixed a real bug: Auth's Site URL was pointed at `localhost:5173` — now points at `https://expiry-mate.vercel.app` (see `decisions.md`, "Auth redirect URL fix"). RLS-split migration run and confirmed.
- **Slice 2 (Full Schema Forms) is code-complete, not yet browser-tested.** `tsc -b --force` and `eslint` both pass clean. The `(user_id, expiry_date)` index migration hasn't been run against the live project yet. Also includes the Leftovers date-field relabelling fix (18/8/26). See `docs/09-iteration-log.md`.
- **Slice 3 (Adjusted Expiry Logic) is fully done and verified.** `src/lib/adjustedExpiry.ts` implements all 11 categories (Eggs newly added — see `decisions.md`, "Category/algorithm reconciliation"); `ItemList` shows the adjusted date, days remaining, and status badge/warning derived from it, memoised per row. Eggs migration run against the live project; browser-tested (Eggs, Frozen, storage/opened toggles all confirmed working).
- **Slice 4 (Styling) is code-complete, not yet browser-tested.** Revised several times based on feedback: minimal two-row item card became a click-to-expand card (countdown/status/name collapsed, everything else in a centred animated modal), a manual dark-mode toggle (`src/hooks/useTheme.ts`, persisted, flash-free via a small inline script in `index.html`), a full-bleed desktop layout (`.item-list` as a responsive grid, sticky full-width header) that still collapses to one column on a phone, the add-item form moved off the dashboard behind a "+" FAB button, a toolbar with search/filter/sort added to `ItemList.tsx` (warnings always pinned to their own top section), every form field (add + edit) now has a visible title, and deleting an item now requires an in-place confirmation step instead of happening immediately. A real gap was also caught and fixed along the way — `App.css` was never actually imported anywhere, so `App.tsx` now imports it. `tsc -b --force` and `eslint` both pass clean.
- **Slice 5 (Expiry Notifications) is code-complete, not yet browser-tested.** `useExpiryNotifications` fires one batched browser `Notification` per page load listing items within 7 days of (or past) their adjusted expiry date, reusing status logic newly extracted into `src/lib/itemStatus.ts`; `ExpiryBanner` shows the same list directly on the dashboard as an always-visible, dismissible fallback since notifications can be denied/blocked/missed. The optional email-digest stretch (Supabase Edge Function) was deliberately not built — needs an external email-provider API key and scheduling setup — and is recorded as a scope decision, not a gap, in `decisions.md`. `tsc -b --force` and `eslint` both pass clean. All Must Have requirements are now code-complete.
- **Slice 6 (Nice-to-Haves) is partially built.** Two of the four items are code-complete: auto-category suggestion from the item name (`src/lib/guessCategory.ts`, a keyword lookup with no AI/network call, hand-verified against 18 cases) and defaulting the add form's date field to today instead of blank. The other two (AI recipe suggestions, multi-user household sharing) were deliberately deferred at the user's request, not dropped — see `decisions.md`, "Slice 6 scope." Alongside these, two real UI bugs reported directly against the live app were found and fixed: cards turning a low-contrast bright colour on hover (a global `button:hover` rule winning the cascade over the card's own background), and the mobile layout not matching desktop (a flex-basis meant for width being reinterpreted as height once the mobile toolbar switches to a column layout). A follow-up request then collapsed the mobile toolbar's 3 filter selects + sort toggle behind a single "Filters" disclosure button, cleaning up a layout that previously showed 4 full-width control rows before a single card. All three were verified with real before/after screenshots via a disposable local Playwright preview (see `decisions.md`, "Card hover contrast + mobile search box sizing") — not just `tsc`/`eslint` passing, the first time this project's UI was actually visually confirmed rather than only compiled. `tsc -b --force` and `eslint` both pass clean.
- **Supabase's GitHub "Deploy to production" integration is now connected and live**, after reconciling the migration-history mismatch found before connecting it (see `decisions.md`, "GitHub deploy integration"). `supabase migration list` confirms the intended state: `20260507000000`, `20260601000000`, `20260818000000`, and `20260818020000` all correctly marked applied, `20260818010000` (the index migration) correctly still pending — the next merge to `main` will apply only that one migration for real. **Outstanding:** the user's database password passed through this chat in plaintext while troubleshooting the repair command; rotating it via Settings → Database has been recommended more than once but not confirmed done.
- **Feedback Sprint opened 21/8/26** — a separate, explicitly-not-a-slice piece of work, in response to direct teacher feedback on the live app (not planned nice-to-haves). Deadline extended to next Friday. Full detail, discussion, and plan of attack: `docs/10-feedback-sprint.md`. **Rough wireframe built, refined, and agreed (21/8/26):** a self-contained, clickable HTML mockup at `docs/wireframes/feedback-sprint-dashboard-wireframe.html` — dashboard (stat tiles, needs-attention list, status/storage donuts, place quick-nav), a scoped mini-dashboard per place (Fridge/Freezer/Pantry) rather than jumping straight to the full list, a card/list toggle with matching search/filter/sort, items sorted by default everywhere by how close they are to expiring, and a mobile list view that shows only name/days-left/status by default with a tap-to-expand detail row. Verified with a disposable Playwright screenshot harness (desktop + phone, zero console errors). **Database seed generated, not yet run (21/8/26):** `supabase/seed/feedback-sprint-seed.sql` — 135 items across every category/storage/status, each row's date computed by inverting the real adjusted-expiry algorithm for a chosen target status and then re-verified forward through the same algorithm (caught 4 real generator bugs before the file was finalised — see `decisions.md`). Needs to be run by hand in the Supabase SQL Editor, same as every other migration/seed on this project. Next: run the seed, then build the real, styled UI against the agreed wireframe structure.
- What's live on Vercel is still the old placeholder until this work gets pushed and Vercel redeploys.
- `tests/{unit,integration,smoke}` exist as folders but are empty — tests get written as each slice's logic lands, not upfront. `adjustedExpiry.ts` is written as a pure function specifically so it's easy to unit test once that starts.
- Repo structure, security floor, and the slice plan itself have all been reconciled against the actual assessment brief (see `docs/decisions.md`) — the plan below reflects that review, including the performance/security additions folded into Slices 1, 2, 3, and 5.

## Requirements Summary
### Must Have
- Track food item name + expiry date
- Add / edit / delete items
- Track quantity, category, storage location, opened status (schema exists, forms don't collect it yet — Slice 2)
- Notify users when items are about to expire (Slice 5 — code-complete, not yet browser-tested)
- User auth + per-user database storage ✅

### Nice to Have
- Auto-category suggestion from item name ✅ (Slice 6, 18/8/26)
- Default the add form's date field to today ✅ (Slice 6, 18/8/26)
- AI-powered recipe suggestions based on expiring ingredients (deferred — see `decisions.md`, "Slice 6 scope")
- Multi-user household sharing / shared pantry (deferred — see `decisions.md`, "Slice 6 scope")

### Out of Scope
- Barcode / QR code scanning
- Nutritional information
- Image recognition

Full detail: `docs/02-requirements.md`.

## Development Commands
```bash
npm run dev       # start Vite dev server
npm run build     # TypeScript check + Vite build
npm run lint      # ESLint
npm run preview   # preview production build
```

## Next Logical Steps
1. ~~Slice 1 — App Shell~~ Fully done and verified 18/8/26, including the RLS-split migration.
2. Slice 2 — Full Schema Forms: code-complete 18/8/26, plus the Leftovers relabelling fix. Still need to browser-test and run the `(user_id, expiry_date)` index migration.
3. ~~Slice 3 — Adjusted Expiry Logic~~ Fully done and verified 18/8/26, including the Eggs migration and browser test.
4. Slice 4 — Styling: code-complete 18/8/26 (`index.css` + `App.css`, plus the missing `App.css` import fix, sort/filter/add-button, and delete confirmation). Still need to browser-test.
5. Slice 5 — Expiry Notifications: code-complete 18/8/26. The single-batched-notification behaviour is framed explicitly as a performance/UX decision in the report; the optional email-digest stretch was deliberately scoped out (see `decisions.md`). Still need to browser-test.
6. Slice 6 — Nice-to-Haves: auto-category suggestion and default-date-to-today are code-complete 18/8/26 (see `decisions.md`, "Slice 6 scope"). AI recipe suggestions and multi-user household sharing are deferred at the user's request — revisit if time allows once the report and tests are further along. Two real UI bugs (card hover contrast, mobile layout not matching desktop) and a mobile toolbar cleanup (filters collapsed behind a disclosure button) were found/requested and fixed alongside this, visually verified via a disposable Playwright preview rather than only compiled/linted — see `decisions.md`.
7. Supabase's GitHub deploy integration is connected and live 18/8/26 — the migration-history reconciliation is done, `migration list` confirms the correct state. Still outstanding: rotate the database password that passed through this chat during troubleshooting (Settings → Database).
8. Write the Part B report and prep the walk-through — these are separate from the slices and don't happen automatically just by finishing them.
9. `tests/{unit,integration,smoke}` are still empty — worth starting now that all planned Must Have + partial Nice-to-Have code is in, especially unit tests for the pure functions (`adjustedExpiry.ts`, `itemStatus.ts`, `guessCategory.ts`, `validateItem.ts`) since none of them need a browser or Supabase to test.
10. The live app has still only been visually verified via a disposable fake-data preview, never the actual Supabase-connected app in a real browser on a real device — worth doing once there's a moment, especially the mobile filters panel and the card hover fix on an actual phone.
11. **Feedback Sprint (opened 21/8/26, deadline now next Friday):** direct teacher feedback — dashboard-as-landing-page with a summary/warnings, intuitive navigation to specific places (e.g. the fridge, what's expiring), a card-view/list-view toggle, and a concern that the current card+filter layout won't scale to a realistic item count. Full plan in `docs/10-feedback-sprint.md`. Wireframe built, refined, and agreed 21/8/26 (`docs/wireframes/feedback-sprint-dashboard-wireframe.html`). **Database seed generated 21/8/26** (`supabase/seed/feedback-sprint-seed.sql`, 135 items) but not yet run — needs to be run by hand in the Supabase SQL Editor. Next after that: build the real, styled UI against the agreed wireframe structure, then integrate and verify against the seeded data.
