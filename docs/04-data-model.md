# Data Model

## Overview

ExpiryMate has a single application table, `items`, owned per-user via a foreign key to Supabase's built-in `auth.users` table. There is no separate `users` or `profiles` table: Supabase Auth is the source of truth for identity, and every row in `items` is scoped to exactly one `auth.users.id`.

Two Postgres enums constrain the categorical fields (`food_category`, `storage_location`) so invalid values are rejected at the database level rather than relying on the front end alone.

## Entity Relationship Diagram

```mermaid
erDiagram
    USERS ||--o{ ITEMS : owns
    USERS {
        uuid id PK
        text email
    }
    ITEMS {
        uuid id PK
        uuid user_id FK
        text name
        food_category category
        storage_location storage_location
        date expiry_date
        integer quantity
        boolean is_opened
        date date_opened
        timestamptz created_at
    }
```

`USERS` is Supabase's managed `auth.users` table; ExpiryMate never writes to it directly. `ITEMS` is the one table this project owns.

## Table: `items`

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `id` | `uuid` | PK, `default gen_random_uuid()` | Surrogate key |
| `user_id` | `uuid` | FK → `auth.users(id)`, `on delete cascade`, `not null` | Row ownership; deleting a user removes their items |
| `name` | `text` | `not null` | Free-text item name (e.g. "Milk") |
| `category` | `food_category` (enum) | `not null`, default `'Produce'` | Dairy / Eggs / Meat / Seafood / Produce / Bakery / Frozen / Microwave Meals / Beverages / Condiments / Snacks / Leftovers |
| `storage_location` | `storage_location` (enum) | `not null`, default `'Fridge'` | Fridge / Freezer / Pantry |
| `expiry_date` | `date` | `not null` | Printed expiry date from the label |
| `quantity` | `integer` | `not null`, `check (quantity between 1 and 999)` | Defaults to 1 |
| `is_opened` | `boolean` | `not null`, default `false` | Whether the item has been opened |
| `date_opened` | `date` | `check (date_opened <= current_date)` | Required when `is_opened = true` (enforced by a separate table-level check constraint) |
| `created_at` | `timestamptz` | default `now()` | Row creation timestamp |

### Constraints beyond column-level checks

- `date_opened_required_when_opened`: `check (is_opened = false or date_opened is not null)`. This means a row can't claim to be opened without recording when — the adjusted-expiry algorithm (see `decisions.md`) depends on this being true.
- `quantity` is bounded to 1–999 to keep the field meaningful (a quantity of 0 or a negative number isn't a real inventory state).

### Why one table, not several

Category and storage location were modelled as Postgres enums on the `items` row rather than as separate lookup tables (e.g. `categories`, `storage_locations`) because the value sets are small, fixed by the requirements document, and don't carry their own attributes beyond a label. A lookup table would add a join for no real benefit at this scale. If the "nice to have" household-sharing feature is ever built, that would introduce a `households` table and a join table between `households` and `auth.users` — deliberately deferred until Slices 1–5 are solid (see `04-slice-structure` content folded into `decisions.md`).

## Relationships

- `items.user_id → auth.users.id`, one-to-many: one user has many items, each item belongs to exactly one user.
- No item-to-item relationships exist yet. The adjusted expiry date is computed at read time from an item's own columns (see `05-security-review.md` and `decisions.md` for why it isn't persisted).

## Migrations

| File | Purpose |
|---|---|
| `supabase/migrations/20260507000000_create_items.sql` | Creates `items` with `id`, `user_id`, `name`, `expiry_date`, `created_at`, enables RLS, adds the base ownership policy |
| `supabase/migrations/20260601000000_add_item_fields.sql` | Adds the `food_category` and `storage_location` enums, and the `category`, `storage_location`, `quantity`, `is_opened`, `date_opened` columns with their constraints |
| `supabase/migrations/20260818020000_add_eggs_category.sql` | Adds `'Eggs'` to the `food_category` enum (11th value) — see `decisions.md`, "Category/algorithm reconciliation" |
| `supabase/migrations/20260822000000_add_frozen_meals_category.sql` | Adds `'Frozen Meals'` to the `food_category` enum (12th value) — Feedback Sprint 2 asked for a dedicated category for frozen/microwavable ready meals, distinct from the general `'Frozen'` rules; see `decisions.md`, "Feedback Sprint 2" |
| `supabase/migrations/20260822010000_rename_frozen_meals_to_microwave_meals.sql` | Renames the `'Frozen Meals'` enum value to `'Microwave Meals'` (`alter type ... rename value`, not a second `add value`) — run right after the value above went live, per a same-day follow-up request; see `decisions.md`, "Rename 'Frozen Meals' to 'Microwave Meals'" |
| `supabase/seed/seed.sql` | Original ~20-item seed from Slice 1-era testing. Superseded for Feedback Sprint purposes by the larger seed below, but left in place as a historical record rather than deleted. Moved out of `migrations/` (18/8/26) so a migration-runner tool never mistakes it for a real schema migration and replays it against production — see `decisions.md`, "GitHub deploy integration: migration history reconciliation" |
| `supabase/seed/feedback-sprint-seed.sql` | Feedback Sprint seed (21/8/26): ~135 items across every category, storage location, and status (including deliberately unsafe combinations), generated by inverting the Adjusted Expiry Date Algorithm so the resulting adjusted dates land in a chosen spread rather than being random — see `decisions.md`, "Feedback Sprint database seed" |

Future schema changes (e.g. a `households` table) will be added as new timestamped migration files rather than editing existing ones, so the migration history stays a reliable audit trail of how the schema evolved.
