# Test Plan

## Test layers

| Layer | Location | Tool | What it covers |
|---|---|---|---|
| Unit | `tests/unit/` | Vitest | Pure logic with no I/O — primarily `getAdjustedExpiry` (Slice 3) and the `getStatus` classification (fresh/soon/expired), since these are the algorithmic core of the app and the easiest to get subtly wrong. |
| Integration | `tests/integration/` | Vitest + a Supabase test project (or local Supabase via the CLI) | CRUD operations against the real `items` table and schema: does inserting an item without `category` fail as expected, does RLS actually block reading another user's row, does the `date_opened_required_when_opened` constraint reject bad input. |
| Smoke | `tests/smoke/` | Manual checklist (Playwright is a possible future upgrade, not committed to yet) | End-to-end sanity check against the deployed Vercel URL after each deploy: sign up, sign in, add an item, see it in the list, sign out. Catches "the deploy is broken" before a marker or user finds it. |

## Why this split

Unit tests are cheap and fast, so the adjusted-expiry algorithm — which has a large rule table and a real chance of off-by-one date bugs — gets the most granular coverage. Integration tests are slower and need a real (or locally-run) Supabase instance, so they're reserved for things that can't be verified without the database: RLS behaviour and constraint enforcement are the main candidates, because unit tests mocking the Supabase client wouldn't actually prove RLS works. Smoke tests are intentionally manual for now rather than automated, since the project's size doesn't yet justify the setup cost of a Playwright suite against a live deployment — this is a candidate to revisit if time allows.

## Coverage priorities (in order)

1. `getAdjustedExpiry` — at least one test case per category × storage × opened-status combination that has a distinct rule in `decisions.md`, plus the unsafe-combination cases.
2. `getStatus` — boundary cases at exactly 0 days and exactly 7 days, since the requirements specify inclusive/exclusive boundaries ("Fresh" > 7 days, "Expiring Soon" 0–7 days, "Expired" < 0 days).
3. RLS — a test that signs in as user A, inserts an item, then signs in as user B and confirms the item is neither visible nor editable.
4. Form validation — once client-side validation is added (see `05-security-review.md`), confirm invalid input is rejected before hitting Supabase, and that DB-level constraints are the actual backstop if it isn't.

## Status

`tests/unit/`, `tests/integration/`, and `tests/smoke/` exist as directories but are currently empty — no tests have been written yet, because the code they'd test (the adjusted-expiry function, the wired-up app) doesn't exist yet either. This is deliberate ordering, not an oversight: writing tests against Slice 3's logic before Slice 3 exists would just mean rewriting them. Tests will be added as each slice lands, tracked in `09-iteration-log.md`.
