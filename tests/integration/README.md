# Integration tests

Tests against a real Supabase schema: RLS enforcement, and the constraints the client-side validation mirrors.

No automated integration tests are committed yet. What has been done instead is a manual replay, most recently on 27/8/26 as part of the repository sweep: all eight migrations in `supabase/migrations/` were applied in order to a clean local Postgres 16 instance running in UTC, and the resulting schema was checked against `docs/04-data-model.md`. That run confirmed:

- All eight migrations apply in order with no errors
- The `items` table has the ten expected columns, and `food_category` holds exactly the twelve expected values
- All four per-operation RLS policies exist and check `auth.uid() = user_id`
- A second account sees none of the first account's rows, and its `UPDATE` and `DELETE` affect zero of them; inserting a row owned by another user is refused
- The composite index `items_user_id_expiry_date_idx` is used by the query shape `useItems` actually issues
- `quantity` outside 1 to 999 is refused, and `is_opened = true` with a null `date_opened` is refused
- After `20260827000000_widen_date_opened_check.sql`, a `date_opened` of "today in a UTC+10 timezone" is accepted while a genuinely future date two or more days ahead is still refused

Turning that replay into a committed, runnable script is the natural next step. It needs a Postgres instance in CI plus stubs for the `auth` schema and `auth.uid()` that Supabase provides, which is why it is not in `npm test` today.
