# ExpiryMate — Project Memory

## What This Is
A **React + TypeScript + Vite** web app that helps household members track food expiry dates, reducing waste. Users can add items with expiry dates, get status indicators (fresh / expiring soon / expired), edit items, and delete them. Authentication is handled via Supabase Auth.

## Tech Stack
| Layer | Technology |
|---|---|
| Frontend | React 19, TypeScript 6, Vite 8 |
| Backend / DB | Supabase (Postgres + Auth + RLS) |
| Styling | Plain CSS (no UI library) |
| Build/Lint | ESLint, TSC |

## Environment Variables (`.env.local`)
```
VITE_SUPABASE_URL=https://xsvzsghbmqrhwvjkbqka.supabase.co
VITE_SUPABASE_ANON_KEY=sb_publishable_TTty4_mGdp_FQStC5ZmFpA_1MCPsAwo
```

## Project Structure
```
src/
  App.tsx               — Bare placeholder (just renders <h1>expiry mate</h1>)
  main.tsx              — React entry point
  index.css             — Global styles (currently empty)
  App.css               — App-level styles (currently empty)
  lib/
    supabase.ts         — Supabase client initialisation
  components/
    Auth.tsx            — Email/password sign-up & sign-in form
    AddItemForm.tsx     — Form to add a new food item (name + expiry date)
    ItemList.tsx        — List of items with status badges, inline edit, delete
supabase/
  migrations/
    20260507000000_create_items.sql  — items table + RLS policy
    20260601000000_add_item_fields.sql — adds category, storage_location, quantity, is_opened, date_opened
docs/
  01-problem-statement.md
  02-requirements.md
  decisions.md          — (empty)
  ai-use-log.md         — (empty)
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
-- RLS: users can only see/manage their own rows
```

## Key Components

### `Auth.tsx`
- Toggle between Sign In / Sign Up
- Uses `supabase.auth.signInWithPassword` and `supabase.auth.signUp`
- Shows confirmation message after sign-up

### `AddItemForm.tsx`
- Props: `userId: string`, `onAdded: () => void`
- Inserts into `items` table via Supabase client

### `ItemList.tsx`
- Props: `userId: string`, `refresh: number` (increment to force re-fetch)
- Fetches user's items ordered by `expiry_date ASC`
- Status logic: `expired` (< 0 days), `soon` (0–7 days), `fresh` (> 7 days)
- Inline edit mode for name + date; optimistic UI update on save

## Current State (as of 2026-05-25)
- **`App.tsx` is a bare placeholder** — the Auth + ItemList + AddItemForm components exist and are functional but have NOT been wired into App.tsx yet. This is the most critical gap.
- No CSS styles are written yet (`index.css` and `App.css` are empty)
- `docs/decisions.md` and `docs/ai-use-log.md` are empty

## Requirements Summary
### Must Have
- Track food item name + expiry date
- Add / edit / delete items
- Track quantity (not yet implemented)
- Notify users when items are about to expire (not yet implemented)
- User auth + per-user database storage ✅

### Nice to Have
- AI-powered recipe suggestions based on expiring ingredients
- Multi-user household sharing / shared pantry

### Out of Scope
- Barcode / QR code scanning
- Nutritional information
- Image recognition

## Development Commands
```bash
npm run dev       # start Vite dev server
npm run build     # TypeScript check + Vite build
npm run lint      # ESLint
npm run preview   # preview production build
```

## Next Logical Steps
1. Wire `Auth.tsx`, `AddItemForm.tsx`, `ItemList.tsx` into `App.tsx` with session management (`supabase.auth.getSession`, `onAuthStateChange`)
2. Add quantity field to `items` table and `AddItemForm`
3. Write CSS styles
4. Implement expiry notifications (browser push or email via Supabase Edge Functions)
