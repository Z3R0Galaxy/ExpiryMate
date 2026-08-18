# Design Decisions

## Build Slice Structure (decided 2026-06-11, revised 2026-06-11)

*Note (18/8/26): this section originally also existed as a standalone `docs/04-slice-structure.md`. That file has been retired — its content was a duplicate of what's below, and the assessment's mandated repo layout reserves `04` for `data-model.md`. This section is the single source of truth for the slice plan going forward.*

We follow a vertical-slice approach: each slice produces a shippable increment that runs in the browser. Slices are ordered by dependency — later slices build on earlier ones.

| # | Slice | Requirement coverage |
|---|---|---|
| 1 | **App Shell** | Auth (sign up, sign in, sign out, per-user data isolation) |
| 2 | **Full Schema Forms** | Item name, category, printed expiry date, quantity, storage location, opened status, date opened — add / edit / delete all fields |
| 3 | **Adjusted Expiry + Status Display** | Adjusted expiry date calculation, safety warnings for unsafe combos, days-remaining count, Fresh / Expiring Soon / Expired status badges (all using adjusted date) |
| 4 | **Styling** | Clean, usable UI on any browser — no UI library |
| 5 | **Expiry Notifications** | Notify user when any item is within 7 days of its adjusted expiry date (browser Notification API on load; optionally Supabase Edge Function for email) |
| 6 | **Nice-to-Haves** | Recipe suggestions (AI-powered), multi-user household sharing, auto-category suggestion from item name, default date field to today — descoped until Slices 1–5 are complete |

### Slice details

**Slice 1 — App Shell**
- `App.tsx`: call `supabase.auth.getSession()` on mount; subscribe to `onAuthStateChange`
- Unauthenticated: render `<Auth />`
- Authenticated: render `<AddItemForm userId={...} onAdded={...} />` + `<ItemList userId={...} refresh={...} />` + Sign Out button
- Requirement: each user sees only their own rows (enforced by existing RLS policy)
- Security enhancement (added 18/8/26, see "Marking-alignment review" below): split the single `for all` RLS policy on `items` into four per-operation policies (select/insert/update/delete), each still enforcing `auth.uid() = user_id`. Same protection, but reads as a range of distinct, deliberate security features rather than one broad rule — worth naming explicitly in Part B, Section 3.

**Slice 2 — Full Schema Forms**
- `AddItemForm`: add `category` dropdown (Dairy / Meat / Seafood / Produce / Bakery / Frozen / Beverages / Condiments / Snacks / Leftovers), `storage_location` dropdown (Fridge / Freezer / Pantry), `quantity` number input (1–999), `is_opened` checkbox, `date_opened` date picker (shown only when `is_opened` is checked)
- `ItemList`: fetch and display all columns; inline edit must expose all fields (including the new ones); delete unchanged
- Extract a `useItems(userId)` custom hook: owns the `SELECT` query, `insert`, `update`, `delete` calls so neither component manages Supabase directly
- Requirement: all Must Have fields captured and persisted
- Also covers the client-side input validation gap noted in `05-security-review.md`
- Performance enhancement (added 18/8/26): add a migration for a composite index on `items(user_id, expiry_date)`. Every query the app runs filters by `user_id` and orders by `expiry_date` (see `useItems`), so this is the one query pattern that actually matters for performance — a real, easily justified backend engineering decision for Part B, Section 2, rather than a token gesture.

**Slice 3 — Adjusted Expiry + Status Display**
- Create `src/lib/adjustedExpiry.ts`: pure function `getAdjustedExpiry(item) → { adjustedDate: string } | { unsafe: true }`; implements all category/storage/opened rules from the algorithm section of this file
- `ItemList` row displays: printed expiry date, adjusted expiry date (or ⚠ unsafe warning), days remaining count (integer, derived from adjusted date), status badge
- Status thresholds (per requirements): **Fresh** > 7 days, **Expiring Soon** 0–7 days, **Expired** < 0 days
- Status and days-remaining both derive from the adjusted date, not the printed date
- Requirement: adjusted expiry calculation, safety warnings, days remaining, status display
- Performance enhancement (added 18/8/26): memoise `getAdjustedExpiry(item)` per item (`useMemo`, keyed on the fields it actually depends on) so `ItemList` doesn't recompute every item's adjusted date on every re-render — a small but concrete, explainable performance choice for the walk-through.

**Slice 4 — Styling**
- Components already carry class names (`auth-container`, `item-row`, `status-badge`, `status-expired`, `status-soon`, `status-fresh`, etc.)
- Write `index.css`: CSS reset, base typography, colour variables
- Write `App.css`: centred layout, form layout, item card grid or list, badge colours (green / amber / red), responsive at mobile widths
- Requirement: accessible, usable on any device with a browser

**Slice 5 — Expiry Notifications**
- On app load (after session confirmed), fetch items where adjusted expiry ≤ today + 7 days
- Request browser `Notification` permission; fire one notification listing affected items
- Threshold: **7 days** (matches requirements — not 3)
- Optional stretch: Supabase Edge Function sends a daily email digest via Resend/SendGrid
- Requirement: notify users when an item is within 7 days of its adjusted expiry date
- Performance note (added 18/8/26): firing exactly one batched notification per load (not one per matching item, not re-checking on every render) is a deliberate performance/UX decision, not just how it happened to be built — call it out explicitly as such in Part B, Section 2.

---

## Marking-alignment review (decided 18/8/26)

**Context:** asked directly whether the six-slice plan was tuned for full marks, not just functional correctness. Went back through the Part A rubric specifically rather than assuming "covers the requirements" and "scores highest" are the same thing.

**Finding:** performance is graded at every band of Part A, from 1–4 ("attempts... optimisation") through to 17–20 ("effectively and efficiently optimised"), and the original slice plan had no performance work anywhere in it. Security was a related but separate gap: the security floor (`05-security-review.md`) is explicitly described in the assessment as "the floor, not full marks," while the top band wants "a range of highly effective security features" — plural. The original plan delivered the floor and stopped there.

**Decision:** fold small, concrete additions into the existing slices now, before building, rather than either ignoring the gap or bolting extras on afterward:
- Slice 1: split the single RLS policy into per-operation policies (see Slice 1 detail above).
- Slice 2: add a composite index on `items(user_id, expiry_date)` (see Slice 2 detail above).
- Slice 3: memoise the adjusted-expiry calculation per item (see Slice 3 detail above).
- Slice 5: explicitly frame the single-batched-notification behaviour as a performance/UX choice in the report, not just an implementation detail.

**Why fold in now rather than defer:** each addition is small (a SQL policy split, one migration, one `useMemo`, one framing choice) and is much cheaper to build in from the start than to retrofit after Slices 1–3 are "done." Deferring them risked either running out of time before circling back, or forgetting they existed as report material for Section 2/3.

---

## Adjusted Expiry Date Algorithm

### Overview

When a user adds or edits a food item, the app calculates an **adjusted expiry date** based on four inputs: the printed expiry date (from the label), the food category, the storage location, and whether the item has been opened. For opened items, the date the item was opened is also used.

The adjusted expiry date is derived at runtime and is never stored in the database. The printed expiry date is always retained so users can see both values.

Where a storage location is considered unsafe for a given category (e.g. raw meat left in the pantry), the algorithm does not produce an adjusted date. Instead, the app displays a safety warning.

### Source

All storage duration values are sourced from the **USDA FoodSafety.gov Cold Food Storage Chart**, last reviewed September 2023.
https://www.foodsafety.gov/food-safety-charts/cold-food-storage-charts

---

### Algorithm Rules by Category

The adjustments below are expressed relative to the printed expiry date (for unopened items) or the date opened (for opened items), whichever applies.

#### Dairy
| Storage | Opened | Adjusted Expiry Date |
|---|---|---|
| Fridge | No | Printed expiry date (no change) |
| Fridge | Yes | Earlier of: printed expiry date, or date opened + 7 days |
| Freezer | No | Printed expiry date + 60 days |
| Freezer | Yes | Date opened + 30 days |
| Pantry | Either | ⚠ Unsafe — display warning |

#### Meat & Poultry (raw)
| Storage | Opened | Adjusted Expiry Date |
|---|---|---|
| Fridge | No | Printed expiry date (no change) |
| Fridge | Yes | Printed expiry date (no change — fridge rules apply regardless of seal) |
| Freezer | No | Date of freezing + 270 days (9 months; USDA: whole poultry 1 year, pieces 9 months, ground 3–4 months) |
| Freezer | Yes | Date of freezing + 120 days |
| Pantry | Either | ⚠ Unsafe — display warning |

#### Seafood
| Storage | Opened | Adjusted Expiry Date |
|---|---|---|
| Fridge | No | Printed expiry date (no change) |
| Fridge | Yes | Printed expiry date (no change) |
| Freezer | No | Date of freezing + 180 days (USDA: fatty fish 2–3 months, lean fish 6–8 months, shellfish 3–4 months) |
| Freezer | Yes | Date of freezing + 90 days |
| Pantry | Either | ⚠ Unsafe — display warning |

#### Eggs
| Storage | Opened | Adjusted Expiry Date |
|---|---|---|
| Fridge | No | Printed expiry date (USDA: raw eggs in shell 3–5 weeks) |
| Fridge | Yes (cracked/separated) | Date opened + 4 days (USDA: raw egg whites/yolks 2–4 days) |
| Freezer | No | ⚠ Unsafe — eggs cannot be frozen in shell |
| Freezer | Yes | ⚠ Unsafe — display warning |
| Pantry | No | Printed expiry date − 14 days (room temperature significantly shortens shelf life) |
| Pantry | Yes | ⚠ Unsafe — display warning |

#### Fruit & Vegetables
| Storage | Opened | Adjusted Expiry Date |
|---|---|---|
| Fridge | Either | Printed expiry date (no change) |
| Freezer | Either | Printed expiry date + 180 days (most vegetables freeze well; 6 months used as a conservative estimate) |
| Pantry | Either | Printed expiry date (no change; suitable for root vegetables, apples, etc.) |

#### Cooked Meals / Leftovers
*Note: for this category, the user enters the date prepared rather than a printed expiry date.*
| Storage | Opened | Adjusted Expiry Date |
|---|---|---|
| Fridge | Either | Date prepared + 4 days (USDA: cooked meat/poultry 3–4 days; soups/stews 3–4 days) |
| Freezer | Either | Date prepared + 90 days (USDA: cooked meat 2–6 months; soups/stews 2–3 months) |
| Pantry | Either | ⚠ Unsafe — display warning |

#### Beverages
| Storage | Opened | Adjusted Expiry Date |
|---|---|---|
| Fridge | No | Printed expiry date (no change) |
| Fridge | Yes | Date opened + 7 days |
| Pantry | No | Printed expiry date (no change) |
| Pantry | Yes | Date opened + 3 days |
| Freezer | Either | Not applicable — freezer not recommended for most beverages |

#### Condiments & Sauces
| Storage | Opened | Adjusted Expiry Date |
|---|---|---|
| Fridge | No | Printed expiry date (no change) |
| Fridge | Yes | Date opened + 30 days |
| Pantry | No | Printed expiry date (no change) |
| Pantry | Yes | Date opened + 14 days |
| Freezer | Either | Not applicable — freezer not suitable for most condiments |

#### Dry Goods (pasta, rice, flour, cereals)
| Storage | Opened | Adjusted Expiry Date |
|---|---|---|
| Pantry | No | Printed expiry date (no change) |
| Pantry | Yes | Printed expiry date − 30 days (exposure to air reduces shelf life) |
| Fridge | Either | Printed expiry date (no change) |
| Freezer | Either | Printed expiry date + 180 days (flour, nuts, and grains last significantly longer when frozen) |

#### Bakery (bread, cakes, pastries)
| Storage | Opened | Adjusted Expiry Date |
|---|---|---|
| Pantry | No | Printed expiry date (no change) |
| Pantry | Yes | Printed expiry date − 2 days |
| Fridge | Either | Printed expiry date + 3 days |
| Freezer | Either | Date of freezing + 90 days |

---

## Repository structure alignment (decided 18/8/26)

**Context:** the assessment brief (Assessment Task 3 — Software Engineering Project) mandates a fixed repository layout so a marker can find source, migrations, tests, and folio without hunting. The repo predates having seen that brief in detail, so it had drifted: `docs/04` was `slice-structure.md` instead of `data-model.md`, `docs/05`–`09` didn't exist, there was no `supabase/functions/`, and there was an empty `test/` folder instead of `tests/{unit,integration,smoke}/`.

**Decision:** bring the repo into line with the mandated layout now, before resuming feature slices, rather than restructuring later once more files exist and the diff gets messier. Specifically:
- `docs/04-slice-structure.md` retired; its content was already duplicated in this file's "Build Slice Structure" section, so nothing was lost.
- Added `docs/04-data-model.md`, `05-security-review.md`, `06-front-end-architecture.md`, `07-evaluation.md`, `08-test-plan.md`, `09-iteration-log.md`. The last three (evaluation, test plan, iteration log) are written as living skeletons rather than backfilled with invented results, since the app isn't wired up end-to-end yet — Slice 1 is still outstanding.
- Added `supabase/functions/` (empty, reserved for the Slice 5 email-digest edge function) and `tests/{unit,integration,smoke}/` (empty, reserved for Slice 3 onward).
- Rewrote `README.md` from the default Vite template into a real project README with the live Vercel URL, structure overview, and setup steps.

**Why now:** the assessment is due 8am Monday 24 August 2026. Structural cleanup competes directly with time that could go into Slices 1–5, so it's worth doing exactly once, thoroughly, rather than piecemeal alongside feature work.

---

## Auth redirect URL fix (decided 18/8/26)

**Context:** testing Slice 1's sign-up flow surfaced a real misconfiguration, not just a testing inconvenience. Supabase's Auth "Site URL" was set to `http://localhost:5173` — the confirmation email link worked fine when opened on the same laptop running the dev server, but would silently redirect anyone else (a phone, another device, or a marker signing up against the deployed app) to an unreachable localhost address after confirming.

**Decision:** set Site URL to the live deployment, `https://expiry-mate.vercel.app`, in Supabase dashboard → Authentication → URL Configuration, and add `http://localhost:5173/**` as an additional redirect URL so local dev keeps working alongside the production flow. This is the correct permanent setting, not a temporary one — it should stay this way even after Slices 2–5 are done, since the deployed app is what actually gets marked.

**Why it matters beyond just fixing a bug:** this is exactly the kind of thing that's easy to miss if the app is only ever tested by the one person developing it on their own machine, and worth a line in the Part B report (Section 2, testing methods) as a genuine example of what testing against a real device/deploy surfaces that local-only testing wouldn't.

---

## Slice 2 implementation notes (decided 18/8/26)

**`useItems` hook:** lives at `src/hooks/useItems.ts`. Owns the `select`/`insert`/`update`/`delete` calls against `items`; `AddItemForm` and `ItemList` no longer talk to Supabase directly — they receive `addItem`/`updateItem`/`deleteItem` as props from `App.tsx`. This is the fix for the bug this same hook's docstring calls out: `AddItemForm` previously only inserted `name` + `expiry_date` because nothing forced the two components' Supabase calls to agree on shape.

**Shared validation:** `src/lib/validateItem.ts` holds one `validateItemForm` function used by both the add form and the inline edit form, rather than duplicating the same checks twice. Database constraints remain the actual enforcement (see `05-security-review.md`) — this is about surfacing a readable error before the user hits a raw Postgres constraint message.

**Lint rule disabled, deliberately, once:** `eslint-plugin-react-hooks`'s `react-hooks/set-state-in-effect` flags `useItems`' mount-time fetch (`useEffect(() => { fetchItems() }, [fetchItems])`) even though the actual `setState` calls inside `fetchItems` happen after an `await`, not synchronously. Investigated whether restructuring would satisfy the rule — it flags the pattern based on the function transitively calling a state setter at all, not specifically on synchronous timing, which would rule out the standard "shared fetch function reused for mount and for post-mutation refetch" pattern outright. Disabled with `eslint-disable-next-line` and an inline comment explaining why, rather than either silently ignoring the lint failure or contorting the code around an overly strict experimental rule. Worth a line in Section 2 of the report as an example of understanding *why* a lint rule fired before deciding whether to obey it.

**Index migration:** `20260818010000_add_items_index.sql` adds `items(user_id, expiry_date)` per the marking-alignment review. Needs to be run in the Supabase SQL Editor same as every other migration — not yet done as of writing this entry.

---

## Auto-category suggestion from item name (decided 18/8/26)

**Context:** raised as an idea while testing Slice 2 — when a user types an item name (e.g. "Milk"), have the app guess the category automatically instead of making them pick it from the dropdown every time, while still letting them override the guess.

**Decision:** deferred to Slice 6 (Nice-to-Haves), not built now. It's genuinely good UX, but it's not a Must Have from the assessment brief, and Slices 3–5 (adjusted expiry, styling, notifications) are all required and still outstanding with the deadline six days out — those take priority.

**Approach agreed for when it's built:** a pure client-side function, e.g. `guessCategory(name: string): FoodCategory | null`, matching against a curated keyword list (e.g. "milk"/"cheese"/"yoghurt" → Dairy, "chicken"/"beef"/"mince" → Meat, "soup"/"stew"/"curry" → Leftovers). No network call, no LLM API — explicitly ruled out a "real AI" call as unnecessary cost, latency, and a new failure mode for what a keyword heuristic solves just as well. Wired into `AddItemForm` so it pre-fills `category` when the name changes, but stops overriding as soon as the user manually touches the category dropdown themselves — the guess never fights a user's explicit choice. Framed honestly in Part B as a UX heuristic, not "AI," since that's what it actually is.

---

## Default the date field to today (decided 18/8/26)

**Context:** raised after confirming Slice 3 worked — for almost every item, the year typed into the expiry/date-prepared field is the current year, so making the user type it every single time is friction for no real benefit.

**Decision:** deferred to Slice 6 (Nice-to-Haves), not built now, same reasoning as the auto-category suggestion above — genuinely good UX, not a Must Have, and Slices 4–5 take priority with the deadline close.

**Technical constraint checked before agreeing an approach:** `<input type="date">` can't hold a partial value — it's a complete ISO date or nothing, there's no way to pre-fill just the year and leave month/day blank. So "pre-fill the year" in practice means defaulting the whole field to today's date.

**Approach agreed for when it's built:** default `AddItemForm`'s date field to today's date (not blank) when the form loads or resets after a successful add, instead of requiring the user to type all three parts every time. The user can still change any part of it — this is only the starting value, not a lock. Applies to the add form only; the inline edit form in `ItemList` already defaults to the item's existing date, which is correct as-is and shouldn't change.

---

## Category/algorithm reconciliation (decided 18/8/26)

**Context:** starting Slice 3 (Adjusted Expiry Logic) surfaced a real mismatch, checked before writing any code rather than after: the `food_category` DB enum (10 values — Dairy, Meat, Seafood, Produce, Bakery, Frozen, Beverages, Condiments, Snacks, Leftovers) doesn't line up with the Adjusted Expiry Date Algorithm's category sections above (10 different values — Dairy, Meat & Poultry, Seafood, Eggs, Fruit & Vegetables, Cooked Meals/Leftovers, Beverages, Condiments & Sauces, Dry Goods, Bakery). Eight matched by naming only (Meat↔Meat & Poultry, Produce↔Fruit & Vegetables, Condiments↔Condiments & Sauces, Leftovers↔Cooked Meals/Leftovers). Two didn't overlap at all: the DB's Frozen and Snacks had no algorithm coverage, and the algorithm's Eggs and Dry Goods had no DB category to attach to. This would have meant either guessing at rules for a graded algorithm or silently mis-categorising real household items (eggs), so each gap was raised directly rather than resolved unilaterally.

**Decisions:**
- **Snacks** reuses the algorithm's Dry Goods rules verbatim (pantry unopened = no change, pantry opened = printed date − 30 days, fridge = no change, freezer = printed date + 180 days). No schema change — just documents that Snacks and Dry Goods are treated as the same shelf-life class.
- **Frozen** (pre-frozen, store-bought food — frozen pizza, ice cream, etc., distinct from a fresh item the user chooses to freeze themselves) gets a new rule set that didn't exist in the original algorithm doc: freezer storage keeps the printed date as-is, since it's already calibrated for freezer shelf life; opened-in-freezer shortens to the earlier of the printed date or date opened + 14 days; fridge or pantry storage is flagged unsafe, since store-bought frozen food left out will spoil quickly and the printed date no longer applies once it's off the calibrated storage path.
- **Eggs** added as an 11th `food_category` enum value (`supabase/migrations/20260818020000_add_eggs_category.sql`) so the algorithm's already-written Eggs rules (fridge/freezer/pantry × opened) are actually reachable. Previously an egg item had nowhere correct to go and would have been logged under Dairy or Produce, both using the wrong shelf-life rules.

**Secondary ambiguity resolved the same way:** several freezer rules (Meat, Seafood, Bakery) are written against "date of freezing," but the schema only ever collects the printed expiry date and, when opened, `date_opened` — there's no separate "date frozen" field, and adding one would be its own schema/form change for a marginal gain. Resolved by anchoring on `date_opened` when the item is opened and on the printed date when it isn't, which matches the anchor pattern the algorithm already uses unambiguously elsewhere (Dairy's freezer rows). Documented inline in `src/lib/adjustedExpiry.ts`'s file header rather than only here, so a marker reading the code finds the reasoning without needing to cross-reference this file.

**Verified before committing:** implemented `getAdjustedExpiry` in `src/lib/adjustedExpiry.ts` as a pure function (no React/Supabase dependency, so it's unit-testable in isolation later), then ran a hand-picked case per category — including the unsafe/warning paths, the "earlier of" paths (Dairy fridge-opened, Frozen freezer-opened), and a deliberate boundary case (Snacks pantry-opened landing on exactly 0 days remaining) — through a throwaway script before writing it into `ItemList`. All matched expected output, including the boundary case correctly reading as "Expiring soon" rather than "Expired," since Expired is strictly fewer than 0 days per the thresholds already fixed in this file. `tsc -b --force` and `eslint` both pass clean on every changed file.

---

## Leftovers date field relabelling (decided 18/8/26)

**Context:** raised directly — if an item's category is Leftovers, there's no printed expiry date to read off a label, since it's homemade food. The algorithm in this file already anticipated this (the Leftovers section notes "the user enters the date prepared rather than a printed expiry date"), but the form itself never reflected that: it always showed a single date field labelled "Printed expiry date" regardless of category, which would confuse anyone trying to log a home-cooked meal.

**Decision:** reuse the same `expiry_date` column (no schema change) but have `AddItemForm` and `ItemList`'s inline edit relabel that field to "Date prepared" when category is Leftovers, both visually and via `aria-label`. Also cap it at today's date for Leftovers specifically, since a meal can't be prepared in the future, while every other category keeps the field open to past *or* future dates (a printed expiry date legitimately can be either).

**Known limitation this doesn't fix (deliberately, until Slice 3):** the status badge (`getStatus` in `ItemList.tsx`) still treats `expiry_date` as a literal expiry date for every category, including Leftovers. For a Leftovers item, "date prepared" is a date in the past or today, not a future expiry date — so the naive printed-date status logic will show a Leftovers item as "Expiring soon" or "Expired" immediately after adding it, which is wrong. This is expected and already tracked: `getStatus` is explicitly interim until Slice 3 replaces it with `getAdjustedExpiry`, which correctly computes prepared-date + 4 days (fridge) / + 90 days (freezer) / unsafe (pantry) per the algorithm. Labelling was worth fixing now since it's a data-entry clarity issue independent of Slice 3; the status badge's Leftovers behaviour is not worth a special-case fix that Slice 3 will replace wholesale in a few days anyway.
