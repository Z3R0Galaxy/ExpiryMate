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
  decisions.md                — slice plan, algorithm spec, all major decisions
  ai-use-log.md               — every substantive AI interaction, prompt/response/accepted-or-not
src/
  App.tsx               — session-managed shell: Auth vs. AuthenticatedApp, imports App.css
  main.tsx              — React entry point, imports index.css
  index.css             — reset, base typography, colour variables (Slice 4)
  App.css               — layout for auth screen, app shell, forms, item list/cards (Slice 4)
  hooks/
    useItems.ts         — centralises all Supabase reads/writes for items
  lib/
    supabase.ts         — Supabase client initialisation (anon key only)
    validateItem.ts     — shared client-side validation for add + edit forms
    adjustedExpiry.ts   — getAdjustedExpiry (Slice 3 algorithm), getDaysRemaining, getExpiryStatus
  components/
    Auth.tsx            — Email/password sign-up & sign-in form
    AddItemForm.tsx     — full item schema, category/storage/quantity/opened/date-opened
    ItemList.tsx        — full item schema, adjusted-expiry status badges, memoised per row
supabase/
  migrations/
    20260507000000_create_items.sql              — items table + RLS policy
    20260601000000_add_item_fields.sql           — adds category, storage_location, quantity, is_opened, date_opened
    20260818000000_split_items_rls_policies.sql  — RLS: one broad policy -> four per-operation policies
    20260818010000_add_items_index.sql           — composite index on (user_id, expiry_date)
    20260818020000_add_eggs_category.sql         — adds Eggs to the food_category enum
  functions/           — empty, reserved for Slice 5 email digest
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
                                             -- Eggs added 18/8/26 (migration 20260818020000, not yet run against live project)
  storage_location storage_location NOT NULL,  -- Fridge|Freezer|Pantry
  expiry_date      date      NOT NULL,
  quantity         integer   NOT NULL check (quantity between 1 and 999),
  is_opened        boolean   NOT NULL default false,
  date_opened      date,     -- required when is_opened = true
  created_at       timestamptz default now()
)
-- RLS: users can only see/manage their own rows. Migration to split the original
-- broad "for all" policy into per-operation policies is written
-- (20260818000000_split_items_rls_policies.sql) but not yet run against the live project.
```
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
- Collects all required fields: name, category, storage location, printed expiry date, quantity, opened status, date opened (conditionally)

### `adjustedExpiry.ts` (`src/lib/`)
- `getAdjustedExpiry(item)` — pure function implementing the full Adjusted Expiry Date Algorithm (`decisions.md`) for all 11 categories, returns `{ safe: true, adjustedDate }` or `{ safe: false, message }` for unsafe/not-recommended combinations
- `getDaysRemaining(adjustedDate)`, `getExpiryStatus(days)` — derive the Fresh/Soon/Expired status from the adjusted date, not the printed one

### `ItemList.tsx`
- Props: `items`, `loading`, `onUpdate`, `onDelete` (all from `useItems`, passed down via `App.tsx`)
- Renders each item via a memoised `ItemRow` subcomponent (`useMemo` keyed on the fields `getAdjustedExpiry` actually depends on) so switching one row into edit mode doesn't recompute every other row's adjusted date
- Status badge and days-remaining now derive from `getAdjustedExpiry`'s adjusted date; unsafe/not-recommended combinations show a warning message instead of a Fresh/Soon/Expired badge
- Inline edit mode exposes the full field set, same validation as the add form

## Current State (as of 18/8/26)
- **Slice 1 (App Shell) is fully done and verified.** Full sign-up → email confirmation → sign-in → add item → see it in the list works end-to-end against the live Supabase project. Also fixed a real bug: Auth's Site URL was pointed at `localhost:5173` — now points at `https://expiry-mate.vercel.app` (see `decisions.md`, "Auth redirect URL fix"). RLS-split migration run and confirmed.
- **Slice 2 (Full Schema Forms) is code-complete, not yet browser-tested.** `tsc -b --force` and `eslint` both pass clean. The `(user_id, expiry_date)` index migration hasn't been run against the live project yet. Also includes the Leftovers date-field relabelling fix (18/8/26). See `docs/09-iteration-log.md`.
- **Slice 3 (Adjusted Expiry Logic) is fully done and verified.** `src/lib/adjustedExpiry.ts` implements all 11 categories (Eggs newly added — see `decisions.md`, "Category/algorithm reconciliation"); `ItemList` shows the adjusted date, days remaining, and status badge/warning derived from it, memoised per row. Eggs migration run against the live project; browser-tested (Eggs, Frozen, storage/opened toggles all confirmed working).
- **Slice 4 (Styling) is code-complete, not yet browser-tested.** `src/index.css` (reset/typography/variables) and `src/App.css` (layout) written; a real gap was caught and fixed along the way — `App.css` was never actually imported, so `App.tsx` now imports it. `tsc -b --force` and `eslint` both pass clean.
- What's live on Vercel is still the old placeholder until this work gets pushed and Vercel redeploys.
- `tests/{unit,integration,smoke}` exist as folders but are empty — tests get written as each slice's logic lands, not upfront. `adjustedExpiry.ts` is written as a pure function specifically so it's easy to unit test once that starts.
- Repo structure, security floor, and the slice plan itself have all been reconciled against the actual assessment brief (see `docs/decisions.md`) — the plan below reflects that review, including the performance/security additions folded into Slices 1, 2, 3, and 5.

## Requirements Summary
### Must Have
- Track food item name + expiry date
- Add / edit / delete items
- Track quantity, category, storage location, opened status (schema exists, forms don't collect it yet — Slice 2)
- Notify users when items are about to expire (not yet implemented — Slice 5)
- User auth + per-user database storage ✅

### Nice to Have
- AI-powered recipe suggestions based on expiring ingredients
- Multi-user household sharing / shared pantry

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
4. Slice 4 — Styling: code-complete 18/8/26 (`index.css` + `App.css`, plus the missing `App.css` import fix). Still need to browser-test.
5. Slice 5 — Expiry Notifications, framed explicitly as a performance/UX decision in the report.
6. Write the Part B report and prep the walk-through — these are separate from the slices and don't happen automatically just by finishing them.
7. Slice 6 (Nice-to-Haves) now also includes auto-category suggestion from the item name (keyword-matching, no network call, always overridable) — see `decisions.md`, 18/8/26.
8. Slice 6 also includes defaulting `AddItemForm`'s date field to today's date instead of blank (still fully changeable) — see `decisions.md`, 18/8/26.
