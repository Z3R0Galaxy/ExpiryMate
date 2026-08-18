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
  App.tsx               — Bare placeholder (renders a personal message, not the app) — Slice 1 not started
  main.tsx              — React entry point
  index.css             — Global styles (currently empty) — Slice 4
  App.css               — App-level styles (currently empty) — Slice 4
  lib/
    supabase.ts         — Supabase client initialisation (anon key only)
  components/
    Auth.tsx            — Email/password sign-up & sign-in form
    AddItemForm.tsx     — Only handles name + expiry_date so far — needs full schema (Slice 2)
    ItemList.tsx        — Only handles name + expiry_date so far — needs full schema (Slice 2)
supabase/
  migrations/
    20260507000000_create_items.sql     — items table + RLS policy
    20260601000000_add_item_fields.sql  — adds category, storage_location, quantity, is_opened, date_opened
  functions/           — empty, reserved for Slice 5 email digest
tests/
  unit/                — empty, reserved for Slice 3 (adjustedExpiry, getStatus)
  integration/         — empty, reserved for RLS/constraint tests
  smoke/               — empty, reserved for post-deploy manual checklist
```

## Database Schema
```sql
items (
  id               uuid PK   default gen_random_uuid(),
  user_id          uuid FK   → auth.users(id) ON DELETE CASCADE,
  name             text      NOT NULL,
  category         food_category NOT NULL,  -- Dairy|Meat|Seafood|Produce|Bakery|Frozen|Beverages|Condiments|Snacks|Leftovers
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

### `AddItemForm.tsx`
- Props: `userId: string`, `onAdded: () => void`
- Inserts into `items` table via Supabase client
- Currently only collects `name` + `expiry_date` — inserts will fail against the live schema until Slice 2 adds the required fields

### `ItemList.tsx`
- Props: `userId: string`, `refresh: number` (increment to force re-fetch)
- Fetches user's items ordered by `expiry_date ASC`
- Status logic: `expired` (< 0 days), `soon` (0–7 days), `fresh` (> 7 days) — currently based on the printed date; Slice 3 switches this to the adjusted date
- Inline edit mode for name + date; optimistic UI update on save

## Current State (as of 18/8/26)
- **Slice 1 (App Shell) is done and verified.** Full sign-up → email confirmation → sign-in → add item → see it in the list works end-to-end against the live Supabase project. Along the way, also fixed a real bug: Auth's Site URL was pointed at `localhost:5173`, which would have broken confirmation emails for anyone other than the developer's own machine — now points at `https://expiry-mate.vercel.app` (see `decisions.md`, "Auth redirect URL fix"). Still outstanding from Slice 1: the RLS-split migration (`20260818000000_split_items_rls_policies.sql`) hasn't been run against the live project yet. What's live on Vercel is still the old placeholder until this work gets pushed and Vercel redeploys.
- `AddItemForm`/`ItemList` only handle `name` + `expiry_date`, not the full schema — Slice 2.
- No CSS styles written yet — Slice 4.
- `src/lib/adjustedExpiry.ts` doesn't exist yet — Slice 3.
- `tests/{unit,integration,smoke}` exist as folders but are empty — tests get written as each slice's logic lands, not upfront.
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
1. ~~Slice 1 — App Shell~~ Done and verified 18/8/26. Still need to run the RLS-split migration in the Supabase SQL Editor.
2. Slice 2 — Full Schema Forms: collect and persist all required fields, extract a `useItems` hook, add the `(user_id, expiry_date)` index, strengthen client-side validation.
3. Slice 3 — Adjusted Expiry Logic: build `getAdjustedExpiry`, memoise it per item, switch status display to the adjusted date.
4. Slice 4 — Styling.
5. Slice 5 — Expiry Notifications, framed explicitly as a performance/UX decision in the report.
6. Write the Part B report and prep the walk-through — these are separate from the slices and don't happen automatically just by finishing them.
