# Test Plan

## Test layers

| Layer | Location | Tool | What it covers |
|---|---|---|---|
| Unit | `tests/unit/` | Vitest | Pure logic with no I/O: `getAdjustedExpiry`, the fresh/soon/expired classification, `weeksNote` and `computeStatusInfo`, form validation and the storage-safety check, category guessing, and the dashboard's sorting and counting helpers. These are the algorithmic core of the app and the easiest to get subtly wrong. |
| Integration | `tests/integration/` | Postgres replay (Vitest + a Supabase test project is the intended automation) | Behaviour that cannot be proved without the database: whether the migrations apply cleanly in order, whether RLS actually blocks reading and writing another user's row, and whether the check constraints reject bad input. |
| Smoke | `tests/smoke/` | Manual checklist | End-to-end sanity check against the deployed Vercel URL after each deploy: sign up, confirm, sign in, add an item, see it, sign out. Catches "the deploy is broken" before a marker or a user finds it. |

## Why this split

Unit tests are cheap and fast, so the adjusted-expiry algorithm, which has a large rule table and a real chance of off-by-one date bugs, gets the most granular coverage. Integration tests are slower and need a real Postgres instance, so they are reserved for the things unit tests genuinely cannot prove: a unit test mocking the Supabase client would not demonstrate that RLS works, because the mock is not enforcing anything. Smoke tests stay manual for now, since the project's size does not yet justify a Playwright suite wired against a live deployment.

One principle runs through all three layers, learned the hard way. Expected results are written out by hand from the documented rules, not generated from the code under test. A test derived from the implementation only proves the implementation is self-consistent with itself, which is exactly the property that fails to catch a rule being implemented wrongly in the first place.

## Coverage priorities (in order)

1. `getAdjustedExpiry`, at least one case per category, storage location and opened status. **Done**: all 72 combinations are covered, with expectations transcribed by hand from the rule tables in `decisions.md` and `02-requirements.md`, plus an assertion that every unsafe message names the storage location the item belongs in.
2. `getExpiryStatus` boundary cases, since the requirements specify inclusive and exclusive boundaries (Fresh above 7 days, Expiring Soon 0 to 7 days, Expired below 0). **Done**: -30, -1, 0, 1, 6, 7, 8 and 365 days are all asserted, with 0 explicitly checked to read as Expiring Soon rather than Expired.
3. Timezone behaviour. **Done**, and added after the 27/8/26 sweep found two separate bugs in exactly this area. The relevant tests set `process.env.TZ` to `Australia/Sydney` and use `vi.setSystemTime` to sit inside the 00:00 to 10:00 window where the local calendar date and the UTC date disagree. A suite running in UTC would have passed while both bugs were present, which is the whole reason these tests pin the timezone explicitly.
4. RLS, signing in as user A, inserting an item, then confirming as user B that the item is neither visible nor editable. **Done manually, not yet automated.** Verified on 27/8/26 against a clean local Postgres: user B sees zero of A's rows, B's `UPDATE` and `DELETE` affect zero rows, and B inserting a row owned by A is refused outright. See `tests/integration/README.md` for the full result.
5. Form validation, confirming invalid input is rejected before it reaches Supabase and that the database constraints are the real backstop. **Done** for the client half in `tests/unit/validateItem.test.ts`; the constraint half is covered by the same manual Postgres replay as item 4.

## Status

The unit layer is real: 161 tests across five files, run with `npm test`. It covers the adjusted-expiry algorithm, status and countdown formatting, validation, category guessing, and the dashboard helpers. Three of those tests are explicit regressions for bugs found in the 27/8/26 sweep and fail against the code as it stood before each fix.

The integration layer is not automated. What exists instead is a documented manual replay of all eight migrations into a clean Postgres instance, with the RLS and constraint results written up in `tests/integration/README.md`. Automating it needs a Postgres service in CI plus stubs for the `auth` schema and `auth.uid()` that Supabase provides, which is the reason it is not in `npm test` today.

The smoke layer is a written manual checklist in `tests/smoke/README.md`, run against the deployed URL. A disposable local Playwright harness has been used repeatedly during development for visual checks at desktop and phone widths in both themes, but it has never been committed.

The honest gap, stated plainly: for most of this project the verification standard was `tsc` and `eslint` passing plus manual browser checking, and no automated tests existed at all despite this plan calling for them since before Slice 3. That gap was closed on 27/8/26. Anything added from here should arrive with its tests, and each testing session continues to be tracked in `09-iteration-log.md`.
