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

**Built 18/8/26, as Slice 6:** `src/lib/guessCategory.ts` implements the agreed approach exactly — a `CategoryRule[]` keyword table checked in a deliberate order (Frozen first, so "frozen chicken" reads as Frozen rather than Meat), whole-word matching via a regex boundary for single-word keywords (so "Ham" matches but "Shampoo" doesn't) and a plain substring check for multi-word keywords like "ice cream" (a word-boundary regex doesn't apply cleanly to a phrase). `AddItemForm` calls it from a new `handleNameChange`, which only updates `category` when there's an actual match and only while a new `categoryTouched` flag is still `false`; picking a category manually (`handleCategoryChange`) sets that flag so the guess can never fight a real user choice again for the rest of that form session. Hand-verified 18 cases (one per category, several ambiguous-looking names, the empty-string case, and the "Ham" vs. "Shampoo" word-boundary edge case) via a throwaway script before wiring it in — all 18 matched.

---

## Default the date field to today (decided 18/8/26)

**Context:** raised after confirming Slice 3 worked — for almost every item, the year typed into the expiry/date-prepared field is the current year, so making the user type it every single time is friction for no real benefit.

**Decision:** deferred to Slice 6 (Nice-to-Haves), not built now, same reasoning as the auto-category suggestion above — genuinely good UX, not a Must Have, and Slices 4–5 take priority with the deadline close.

**Technical constraint checked before agreeing an approach:** `<input type="date">` can't hold a partial value — it's a complete ISO date or nothing, there's no way to pre-fill just the year and leave month/day blank. So "pre-fill the year" in practice means defaulting the whole field to today's date.

**Approach agreed for when it's built:** default `AddItemForm`'s date field to today's date (not blank) when the form loads or resets after a successful add, instead of requiring the user to type all three parts every time. The user can still change any part of it — this is only the starting value, not a lock. Applies to the add form only; the inline edit form in `ItemList` already defaults to the item's existing date, which is correct as-is and shouldn't change.

**Built 18/8/26, as Slice 6:** `AddItemForm`'s `expiryDate` state now initialises to `today()` (via a lazy `useState(() => today())` rather than calling it on every render) instead of an empty string, and resets to `today()` again — not `''` — after a successful add. Exactly as agreed: applies only to the add form, still fully editable, and the inline edit form in `ItemList` is untouched.

---

## Slice 6 scope: quick wins now, recipe suggestions and household sharing deferred (decided 18/8/26)

**Context:** asked directly which of the four Slice 6 nice-to-haves (auto-category suggestion, default date to today, AI recipe suggestions, multi-user household sharing) to build now that Slices 1–5 are complete, given six days left before the deadline. The first two already had an agreed approach recorded above and are small; the other two are meaningfully bigger — recipe suggestions needs a real AI/LLM API call (cost, an API key, a new failure mode to handle), and household sharing needs an actual data-model and RLS change (shared access to another user's rows, not just per-user isolation).

**Decision:** build the two quick wins now (both recorded above as "Built 18/8/26"). Recipe suggestions and household sharing are deferred, not dropped — the user asked to come back to them later if time allows once the report and tests are further along, rather than committing to them now. Recorded here as a deliberate, revisitable scope decision rather than either quietly building scope-creep or quietly dropping documented nice-to-haves.

**Verified:** `tsc -b --force` and `eslint` both pass clean on `guessCategory.ts` and `AddItemForm.tsx`. **Not yet verified:** as with the rest of this project in this environment, the actual typing/guessing experience and the date field's default value haven't been seen in a real browser yet.

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

## Slice 4 implementation notes (decided 18/8/26)

**Split kept as planned:** `src/index.css` holds the reset, base typography, and colour variables (`:root` custom properties); `src/App.css` holds layout for the auth screen, the signed-in app shell, the add-item form, and the item list/cards. Component markup wasn't touched — every class name styled here already existed in the JSX from Slices 1–3, per the plan in the "Build Slice Structure" section above.

**Real bug caught before it shipped:** `App.css` existed as an empty file since the very start of the project, but nothing ever actually imported it — `main.tsx` only imports `index.css`. Writing the layout styles into `App.css` would have silently done nothing without also adding `import './App.css'` to `App.tsx`, which this slice added. Worth noting because it's exactly the kind of gap that's invisible until someone actually looks at the rendered page.

**Four distinct hues for the status badge, not a 3-colour scale plus grey:** Fresh/Soon/Expired are a green/amber/red time-based scale, but the Slice 3 "unsafe/not-recommended" warning state isn't a point on that scale — it's a different kind of message (food safety or storage advice, not "how much time is left"). Gave it its own colour (plum/violet) rather than reusing grey or red, so a warning badge doesn't get misread as "just a more severe Expired."

**No external fonts or UI library:** matches the tech stack constraint already in `CLAUDE.md` ("Plain CSS, no UI library") — typography uses the system font stack (`-apple-system`, Segoe UI, Roboto, etc.), so there's no extra network request for a web font and no dependency on a CSS framework loading correctly.

**Accessibility touches worth naming in Part B:** visible `:focus-visible` outlines on every interactive element (inputs, selects, buttons, links) rather than relying on the browser default, which some browsers suppress by default on click but this preserves for keyboard navigation; and a single mobile breakpoint (560px) that collapses the two-column add/edit forms to one column and lets the item-name/badge row wrap, rather than assuming a desktop-width screen.

**Not yet verified:** hasn't been opened in a real browser yet — checking that the layout, colours, and mobile breakpoint actually look right (not just that the CSS parses and the class names line up) is a real browser check, not something `tsc`/`eslint` can confirm. Logged as open in `09-iteration-log.md`.

---

## Slice 4 revision: minimal look, dark mode, full-width desktop layout (decided 18/8/26)

**Context:** feedback on the first pass of Slice 4 — the UI felt cluttered, the colour palette wasn't distinctive, there was no dark mode, and the layout stayed a narrow centred column even on a wide desktop screen. Asked directly whether this would get addressed in a later slice: no, neither Slice 5 (notifications, backend/functional) nor Slice 6 (nice-to-haves, none of which touch visual design) cover this, so it was treated as a revision of Slice 4 rather than deferred.

**Decluttering:** the item card's view mode was genuinely busy — eight sibling elements (badge, name, five separate pill-styled fields, two buttons) all in one flex row with equal visual weight. Restructured (a small, deliberate JSX change to `ItemList.tsx`'s view-mode block, not a CSS-only fix) into two rows: a top row (status badge, name, Edit/Delete as low-emphasis outlined buttons instead of solid green) and a meta row (category, storage, dates, quantity) rendered as plain muted text joined by middle-dot separators instead of individual pill/chip backgrounds. Same data, far fewer competing shapes and colours.

**Dark mode — manual toggle, asked and confirmed rather than assumed:** given the choice between a manual toggle (remembered across visits) and simply following the OS setting with no toggle, chose the manual toggle — also a concrete feature to point to in the report/walk-through. Implementation:
- `src/hooks/useTheme.ts` — reads a stored preference or falls back to `prefers-color-scheme`, applies it via a `data-theme` attribute on `<html>`, persists the choice to `localStorage`. Deliberately a one-time-read default rather than continuing to live-follow the OS setting — a user who explicitly picked dark shouldn't get flipped back to light just because their OS switches at sunset.
- A small inline script in `index.html`'s `<head>` sets the same attribute before React mounts, to avoid a flash of the wrong theme on load — kept deliberately in sync with the hook's own fallback logic (documented in both places).
- Colour variables in `index.css` are redefined under `[data-theme='dark']`; the toggle button itself sits inline in the authenticated header (next to Sign Out) and in the corner of the auth screen, not fixed/floating, so it can't overlap other controls at any screen width.

**Full-width desktop layout, still fits a phone:** `.app-header` is now a full-bleed sticky bar (`width: 100%`, no max-width) so it visually reaches both edges of the screen on a desktop, like a real app rather than a document; the content area (`.app-main`) keeps a generous max-width (1400px, centred) so text and cards don't stretch to unreadable line lengths on an ultrawide monitor. `.item-list` changed from a single-column stack to `grid-template-columns: repeat(auto-fill, minmax(300px, 1fr))`, so a wide screen shows several item cards side by side using the available space, and the same rule naturally collapses to one column once the viewport can't fit a 300px card plus gap — no separate mobile-only grid rule needed for that part, though the existing breakpoints were kept for the forms, which do need to explicitly drop from 2–3 columns to 1.

**Dark-mode-specific layout tweak:** box-shadows barely read against a dark background, so cards (`auth-container`, `add-item-form`, `item-row`) get a hairline border under `[data-theme='dark']` instead, to stay visually separated from the page without relying on a shadow that wouldn't be visible.

**Verified:** `tsc -b --force` and `eslint` both pass clean on every changed file. **Not yet verified:** hasn't been opened in a real browser — need to check both themes, the toggle persisting across a reload, the desktop-width grid actually showing multiple columns, and the mobile layout at a genuinely narrow width. Logged as open in `09-iteration-log.md`.

---

## Slice 4 second revision: item card meta as a label/value grid (decided 18/8/26)

**Context:** a screenshot of the real, rendered card showed the actual problem with the meta row's inline middle-dot layout — when the line wrapped, the `::before` separator on the wrapped item wrapped with it, landing as a stray leading "·" at the start of the second line. Asked what exactly should change; the answer wasn't about removing information, it was "why have all that text at the bottom unformatted? make it all look good and together" — i.e. the run-on wrapped sentence read as unformatted regardless of the stray dot, not that any specific field needed to go.

**Decision:** replaced the inline middle-dot-separated line with a small `<dl>` label/value grid — each fact (Category, Storage, Expires/Prepared, Adjusted, Qty, Opened) gets its own row with a muted label and a right-aligned value, laid out via `grid-template-columns: repeat(auto-fit, minmax(130px, 1fr))` so it reads as a tidy block of facts rather than a sentence that happens to wrap. The unsafe/not-recommended warning message is a full sentence rather than a short value, so it gets its own full-width row instead of being squeezed into the value column. A hairline top border separates this fact grid from the name/actions row above it, reinforcing that it's one cohesive card rather than stacked, disconnected pieces.

**Verified:** `tsc -b --force` and `eslint` both pass clean. Still pending a real browser check of the new layout, same as the rest of this slice.

---

## Slice 4 third revision: raise the item card's visual polish (decided 18/8/26)

**Context:** "make the ui of each card look way better" — a general polish request, not tied to a specific complaint, since the structural/decluttering fixes above were already accepted. Treated as a design pass Claude has license to make its own calls on, rather than something needing a clarifying question first, since there was no genuine fork to resolve — just "make it look more finished."

**Decision — several small changes together, aimed at one cohesive result:**
- **Status accent moved off a plain `border-left` onto an absolutely-positioned `::before` bar** (with the card set to `overflow: hidden`), so the coloured accent strip sits flush with the card's rounded corners at any radius, rather than a border that doesn't necessarily clip the same way.
- **Edit/Delete became icon-only circular buttons** (pencil / trash outline icons, `aria-label` + `title` kept for accessibility) using the same shape language as the dark-mode toggle button, so every small utility control in the app now reads as one consistent family rather than mismatched button styles.
- **Status badge gets a small solid dot** before the text (`currentColor`, so it always matches the badge's own colour) — a small, standard "traffic-light" visual cue reinforcing the colour coding.
- **Meta grid labels restyled as small uppercase micro-labels** (Category, Storage, etc.) with the value in normal-weight text beside/below it — reads more like a considered dashboard than plain paired text.
- **Subtle hover lift** on each card (`translateY(-2px)` plus a slightly stronger shadow) for a bit of tactile feedback on desktop; harmless on touch devices since `:hover` simply doesn't fire there.
- Card radius increased slightly (14px) and padding increased for more breathing room, in keeping with the earlier "minimal, not cluttered" feedback.

**A real limitation, stated plainly:** Claude can verify this compiles and lints cleanly, but cannot currently render the app in a real browser to check how it actually looks — the sandboxed environment's browser tooling has been unreliable this session (see the general session context), and the live app depends on a real Supabase connection this sandbox doesn't have. This pass is a best-effort design judgement call, not something visually verified before delivery — a screenshot after pushing is genuinely the fastest way to catch anything that reads worse in practice than intended, same as it caught the wrapped-meta-line issue.

**Verified:** `tsc -b --force` and `eslint` both pass clean. Not yet browser-tested.

---

## Slice 4 fourth revision: click-to-expand cards with a central countdown (decided 18/8/26)

**Context:** a bigger UX idea, not a tweak — make the days-remaining countdown the central focal point of each card, and rethink the "list of facts" layout entirely: "make each card clickable to show all information. when the card is not clicked it simply shows: countdown, whether it is exp, close, or fresh, and its name. when the user clicks on it, make it come to the centre with a cool animation and all the rest of the information." Two genuine forks were checked before building rather than assumed: what a collapsed card shows for an item with no numeric countdown (an unsafe/not-recommended combination has no adjusted date to count down to), and whether Edit/Delete stay on the collapsed card or move into the expanded view now that the collapsed view is meant to be minimal. Both were confirmed (show the warning label in the countdown's place; move both actions into the expanded view only) before any code was written.

**Decision — collapsed card:** `ItemCard` (`ItemList.tsx`) is now a clickable card showing only three things: a small status badge, a large countdown number with a "days left"/"days ago" label underneath (the single biggest thing on the card, as asked), and the item name. No Edit/Delete, no other fields — genuinely minimal. For the no-countdown case (unsafe/not-recommended), the space where the number would sit instead shows the same short label the badge already carries ("Unsafe"), not a blank or a placeholder dash.

**Decision — expanded view:** clicking a card opens a centred modal (`ItemDetailModal`, rendered via `createPortal` into `document.body` so it isn't affected by the grid's own layout/overflow) showing the same hero countdown larger, the item name as a heading, every remaining fact as its own small tile in a 2-column grid (Category, Storage, Expires/Prepared, Qty, Adjusted, Opened — the unsafe/not-recommended message gets the full sentence here, where there's room for it), and Edit/Delete as icon buttons in the modal header. Edit switches the modal's content to the existing inline-edit form in place, rather than closing the modal and reopening something else. Closes via a Close (×) button, clicking the backdrop, or Escape — page scroll is locked while it's open and restored on close.

**The animation — "grows from where you clicked," not a generic fade-in:** at click time, the collapsed card's on-screen position (`getBoundingClientRect()`) is captured and stored as the "origin" point. The modal is rendered with an inline transform that places it at that origin, scaled down, before flipping a `visible` flag a frame later — CSS transitions on `transform`/`opacity` then animate it from the origin point up to full size, centred. Closing reverses this: the same origin is reapplied (so it animates back toward the card it came from, not just disappearing), and the actual unmount is delayed via `setTimeout` to match the CSS transition duration. This is a lightweight approximation of a FLIP animation using only plain browser APIs (`getBoundingClientRect`, CSS transforms) and React state — no animation library was added, keeping to the existing "no UI library" tech-stack decision.

**Stat grid, not a plain list:** each fact in the expanded view is its own tinted tile (`.item-stat-tile`, `var(--color-surface-alt)` background) rather than a row of plain text — a small, deliberate step up from the label/value grid used in the previous revision, closer to a compact dashboard than a form-like list.

**A real limitation, restated:** as with the previous revision, this was built and verified by compiling/linting cleanly, not by seeing it run — this environment still can't render the app in a real browser. This is a meaningfully more complex interaction (click targets, an animated transform, a portal, focus/scroll handling) than the earlier CSS-only passes, so it's more likely than those were to need a real round of fixes once actually seen and clicked through. `tsc -b --force` and `eslint` both pass clean; a real browser check — including clicking through on a phone-sized viewport, since the animation and modal sizing were reasoned about but not measured on one — is the next step.

## Leftovers date field relabelling (decided 18/8/26)

**Context:** raised directly — if an item's category is Leftovers, there's no printed expiry date to read off a label, since it's homemade food. The algorithm in this file already anticipated this (the Leftovers section notes "the user enters the date prepared rather than a printed expiry date"), but the form itself never reflected that: it always showed a single date field labelled "Printed expiry date" regardless of category, which would confuse anyone trying to log a home-cooked meal.

**Decision:** reuse the same `expiry_date` column (no schema change) but have `AddItemForm` and `ItemList`'s inline edit relabel that field to "Date prepared" when category is Leftovers, both visually and via `aria-label`. Also cap it at today's date for Leftovers specifically, since a meal can't be prepared in the future, while every other category keeps the field open to past *or* future dates (a printed expiry date legitimately can be either).

**Known limitation this doesn't fix (deliberately, until Slice 3):** the status badge (`getStatus` in `ItemList.tsx`) still treats `expiry_date` as a literal expiry date for every category, including Leftovers. For a Leftovers item, "date prepared" is a date in the past or today, not a future expiry date — so the naive printed-date status logic will show a Leftovers item as "Expiring soon" or "Expired" immediately after adding it, which is wrong. This is expected and already tracked: `getStatus` is explicitly interim until Slice 3 replaces it with `getAdjustedExpiry`, which correctly computes prepared-date + 4 days (fridge) / + 90 days (freezer) / unsafe (pantry) per the algorithm. Labelling was worth fixing now since it's a data-entry clarity issue independent of Slice 3; the status badge's Leftovers behaviour is not worth a special-case fix that Slice 3 will replace wholesale in a few days anyway.

## Slice 4 fifth revision: add-item behind a "+" button, sortable/filterable groups, labelled edit fields (decided 18/8/26)

**Context:** a bundled request covering the last remaining structural complaints about the dashboard: "i want the dashboard to just have the cards (no add section), instead, lets move the add section under a button with a plus on it... also on the dashboard lets make it so the cards can be sorted and filterd... make it so each bit has its own title the same way the 'printed expiry date' bit is formated... sorted by place... or sorted by expiry date... also always make sure warnings are at the top." Two genuine forks were checked before building: which filter dimensions to offer (storage/category/status/search), and how to present the sort groupings visually. Both confirmed — all four filter dimensions, and grouped sections with an icon per section header, going beyond the "grouped with headers" option Claude had marked as its own recommendation.

**Decision — add button:** `AddItemForm` no longer sits inline on the dashboard. `App.tsx` now renders a fixed-position circular "+" button (`.fab`, bottom-right, matching the icon-button shape language used elsewhere) that opens `AddItemForm` inside the same shared `AnimatedModal` used for the item detail view, reusing the "grows from where you clicked" animation rather than a second bespoke modal. A successful add closes the modal automatically; a validation or Supabase error leaves it open with the error visible, same behaviour as when the form lived inline.

**Shared modal extraction:** the open/visible/origin state machine and the portal/backdrop/escape/scroll-lock shell were pulled out of `ItemList.tsx` into a new `useAnimatedModal` hook (`src/hooks/`) and `AnimatedModal` component (`src/components/`), since the add-item flow needed the exact same behaviour rather than a second copy of it. `ItemList.tsx`'s item-detail modal was refactored to use these shared pieces instead of its own inline version.

**Decision — sort/filter/grouping:** `ItemList` now has a toolbar above the cards: a search box (matches on name), three filter dropdowns (storage location, category, status — each independently "all or one"), and a two-way sort-mode toggle restricted to exactly the two groupings asked for — by place (Fridge/Freezer/Pantry) or by status (Expired/Expiring soon/Fresh). All filters apply together (AND), then the remaining items are split into sections: unsafe/warning items always get their own section at the very top regardless of sort mode (implemented by carving them out of the list before grouping, not by trying to inject warning-priority into a sort comparator), followed by one section per non-empty group in the chosen sort mode, each with an icon (hand-drawn inline SVGs, no icon library) and label as its heading.

**Decision — labelled edit fields:** every field in the inline edit form (inside `ItemDetailModal`) now gets the same visible `field-label` title treatment the date field already had, matching `AddItemForm`. Caught a real HTML validity issue while doing this: the first draft wrapped the "Opened?" checkbox's own `<label className="checkbox-label">` inside an outer `<label className="field-label">`, which is invalid — a label can't nest another label. Fixed by making the outer "Opened?" wrapper a plain `<div className="field-label">` instead, since the inner `checkbox-label` already provides the real accessible label for the checkbox. Applied identically in `AddItemForm.tsx` and `ItemList.tsx`'s edit form.

**A CSS inheritance concern, addressed defensively:** `.field-label` itself is small and muted (it's a title, not a value), and the base `input, select { font: inherit; color: inherit; }` rule in `index.css` would otherwise let that styling cascade into the field's actual value. The existing date field didn't visibly show this problem, likely because a native `<input type="date">`'s shadow-DOM internals don't fully inherit an ancestor's font-size the same way plain text does — but a plain text input or `<select>` would. Added `.field-label input, .field-label select { font-size: 1rem; color: var(--color-text); font-weight: 400; }` so every field's value reads at normal size/colour regardless of input type, rather than relying on the date field's apparent (but unexplained) immunity.

**Verified:** `tsc -b --force` and `eslint` both pass clean on every changed/new file (`ItemList.tsx`, `AddItemForm.tsx`, `App.tsx`, `App.css`, the new `AnimatedModal.tsx`/`useAnimatedModal.ts`). **Not yet verified:** as with every Slice 4 pass so far, none of this has been seen in a real browser — the add button/modal, the sort toggle, each filter, search, the warnings-always-on-top rule, and the field labels all still need an actual click-through, ideally including a phone-sized viewport given the toolbar now has five controls competing for space.

## Slice 4 sixth revision: delete confirmation (decided 18/8/26)

**Context:** asked directly to make delete ask for confirmation first — previously the Delete icon in the item-detail modal called `onDelete` immediately, with no way back if clicked by mistake.

**Decision:** rather than a native `window.confirm()` (which would look and feel out of place against the app's own custom modal styling, and can't be styled to match dark mode), clicking Delete now swaps the modal's content in place for a small confirmation step — a warning icon, "Delete `<name>`? This can't be undone.", and Cancel/Delete buttons — instead of opening a second modal on top of the first. Cancel returns to the normal view with nothing changed; Delete actually calls through to the existing delete logic. The Edit/Delete icons in the header are hidden while this confirmation is showing, so there's no way to trigger a second, conflicting action mid-confirmation.

**A real gap fixed along the way:** the existing `handleDelete` in `ItemList.tsx` silently swallowed any Supabase delete error — it closed the modal on success but gave no feedback at all on failure. Since the new confirmation step needed somewhere to show a failure (staying in the confirm view with no explanation would be worse than the old silent behaviour), `handleDelete` now returns the error string instead of discarding it, and the modal displays it under the confirmation text if the delete fails.

**Verified:** `tsc -b --force` and `eslint` both pass clean. **Not yet verified:** the confirm/cancel flow itself, and the failure-message path (hard to trigger without a real network/RLS error), still need a real browser check.

## Slice 5: Expiry Notifications (decided 18/8/26)

**Context:** the last remaining Must Have requirement — notify the user when any item is within 7 days of its adjusted expiry date. The slice spec (see the table/detail above) calls for a browser `Notification` fired once per load, plus notes an *optional* stretch of a daily email digest via a Supabase Edge Function. Two genuine forks were checked before building rather than assumed: whether to build the optional email digest now given the Monday deadline, and whether to add an in-app fallback banner alongside the strict browser-Notification requirement. Both confirmed — skip the email digest for now (documented here as a stated, deliberate limitation rather than an oversight), and add the in-app banner, since a `Notification` can be silently denied/blocked and a demo/walk-through shouldn't depend on it firing.

**Decision — what counts as "needs attention":** reused the existing status logic rather than writing a separate 7-day check. An item counts if its `badgeStatus` (from the shared `computeStatusInfo`, now in `src/lib/itemStatus.ts`) is `soon` (0–7 days remaining, adjusted date) or `expired` (already past it) — which is exactly the set of items within 7 days of, or past, their adjusted expiry date. `warning` (unsafe/not-recommended combinations) items are deliberately excluded: they have no adjusted date to be "within 7 days" of at all, they're a food-safety alert rather than a countdown, and they're already always surfaced at the top of the dashboard (Slice 4's warnings-first grouping) — folding them into the same notification would conflate two different kinds of alert.

**Shared status logic extracted:** `computeStatusInfo`, `BadgeStatus`, `STATUS_LABEL`, and `STATUS_CLASS` moved out of `ItemList.tsx` into a new `src/lib/itemStatus.ts`, since the new notification hook needed the exact same status computation `ItemList` already had — duplicating it would risk the two drifting out of sync on what counts as "soon" or "expired." `ItemList.tsx` now imports from there instead of defining its own copy.

**Decision — the notification itself:** `useExpiryNotifications(items, loading)` (`src/hooks/`) computes the expiring/expired set via `useMemo`, then a `useEffect` guarded by a `useRef` flag fires **one** batched `Notification` the first time `loading` becomes `false` — never again on subsequent renders, even if items change later (e.g. after an edit or delete), per the slice spec's explicit "one batched notification, not one per item, not on every render" performance note. If `Notification.permission` is `'default'`, it's requested; if the result (or an already-stored `'denied'`) isn't `'granted'`, the function returns without throwing or retrying. The notification body lists up to 5 item names, with a "and N more" suffix beyond that so a long list doesn't produce an unreadable notification.

**Decision — the in-app banner:** `ExpiryBanner` (`src/components/`) renders directly on the dashboard (above the item groups) whenever `expiringItems` is non-empty, listing the same names the notification would, with a dismiss button. Unlike the notification, this recomputes reactively as `items` changes (no once-only guard) since it's just rendering current state, not "notifying" about a change — the once-only behaviour is specifically about not spamming actual OS-level notifications. `dismissed` is separate per-session state so dismissing it doesn't require the underlying data to change.

**The optional email digest — deliberately not built:** `supabase/functions/` remains empty, as already noted when the folder was created (Slice 1). This needs an actual email-provider account and API key (Resend/SendGrid) that isn't available in this session, plus a scheduled trigger to run the function daily — real setup work, not just code, and explicitly framed in the assessment as an optional stretch rather than a Must Have. Recorded here as a deliberate scope decision for the report, not a gap that was simply missed.

**Verified:** `tsc -b --force` and `eslint` both pass clean on every changed/new file (`itemStatus.ts`, `useExpiryNotifications.ts`, `ExpiryBanner.tsx`, `ItemList.tsx`, `App.tsx`, `App.css`). **Not yet verified:** as with the rest of this project in this environment, none of this has been seen in a real browser — whether the permission prompt actually appears, whether the notification fires correctly, and whether the banner renders/dismisses as expected all still need a real check. The permission prompt in particular only shows once per origin per browser, so testing it may need a fresh browser profile or the permission reset manually between checks.

---

## Slice 4 seventh revision: food-category icons on cards (decided 18/8/26)

**Context:** asked directly to add icons to the cards showing the food type. Category had never been visible anywhere on the collapsed card (only inside the expanded modal's stat grid as plain text) — this closes that gap with a purely visual cue rather than adding more text to an intentionally minimal card.

**Decision:** added `CategoryIcon` (`ItemList.tsx`) — 11 hand-drawn inline SVGs, one per `FoodCategory`, in the same "no icon library, plain shapes" style as every other icon already in the app (`GroupIcon`, the theme toggle, the edit/delete icons). Kept deliberately simple — mostly a single recognisable silhouette (a carton, an egg, a bottle, a loaf, a cup) rather than a detailed illustration — both to read clearly at a small size and because these can't be visually proofed in this environment before delivery, so simpler shapes are lower-risk than an elaborate one that might not actually look like what it's meant to. Frozen reuses the exact same snowflake glyph as the existing Freezer storage-location icon, deliberately, rather than inventing a second "frozen" symbol.

**Decision — placement:** the icon sits directly beside the item name at the bottom of the collapsed card (`.item-card-footer`), the same "icon + label" pattern already used for the section-group headings, rather than a corner badge that would compete with the status accent bar. It's `aria-hidden`, since the visible name text already gives the card its accessible name and the icon is a purely visual addition, not new information a screen reader needs read aloud. For consistency, the same icon was also added next to the item name in the expanded modal's heading, and next to the "Category" value in the modal's stat grid — so the same visual cue appears everywhere the category does, not just on the card.

**Verified:** `tsc -b --force` and `eslint` both pass clean. **Not yet verified:** whether each icon is actually recognisable at card size is a real open question this environment can't answer — a screenshot after pushing is the only way to confirm any of the 11 read as intended rather than as an ambiguous blob, same caveat as every other Slice 4 visual pass.

---

## GitHub deploy integration: migration history reconciliation (decided 18/8/26)

**Context:** the user shared a screenshot of Supabase's Settings → Integrations → GitHub page, mid-setup of the "Deploy to production" integration (working directory `.`, production branch `main`), and asked for help. Before confirming the settings looked right, checked what this integration actually does and cross-referenced it against how this project's migrations have really been applied so far — every migration to date was run by hand in the Supabase SQL Editor (see the ai-use-log entries for 3/6/26, the RLS-split migration, and the Eggs migration), never through the Supabase CLI or this GitHub integration.

**The risk found:** Supabase's GitHub integration tracks which migrations it has applied in its own bookkeeping table (`supabase_migrations.schema_migrations`), populated only by migrations it has itself run. Migrations applied by hand in the SQL Editor were never recorded there. Connecting the integration and merging to `main` would therefore make Supabase believe **none** of the 5 real migrations had ever been applied, and it would try to replay all 5 from scratch — starting with `create table items (...)` in `20260507000000_create_items.sql`. None of the early migrations are written idempotently (no `IF NOT EXISTS` guards on the table/column/policy DDL), so the very first statement would fail against the live database with something like `relation "items" already exists`, and the deploy would show as broken from the first push.

**A second, separate risk found in the same check:** `supabase/migrations/seed.sql` was sitting in the migrations folder alongside the real schema migrations. A migration-runner (this integration, or the Supabase CLI) has no way to distinguish a seed script from a schema migration by folder location alone — if picked up and replayed, it would insert ~20 fake household items, tied to one hardcoded `user_id`, directly into the **production** database on every deploy that includes it. Not something that should ever run automatically against production.

**Decision — reconcile before connecting, don't just connect and hope:**
1. **Moved `seed.sql` out of `supabase/migrations/` into a new `supabase/seed/` folder**, so no migration tooling can ever mistake it for a real migration again, regardless of how it's invoked in future. Updated the reference in `docs/04-data-model.md` accordingly.
2. **Prepared exact `supabase migration repair` commands** (given directly to the user, not run from this session — the Supabase CLI needs to be linked to the live project with the user's own credentials, which this sandboxed environment doesn't have) to mark the 4 migrations that were genuinely already applied by hand — `20260507000000`, `20260601000000`, `20260818000000`, and `20260818020000` (Eggs) — as `applied` in Supabase's bookkeeping table, without re-running their SQL. This is a bookkeeping correction, not a schema change: it tells the integration "these already happened," rather than executing them again.
3. **Deliberately did *not* include `20260818010000` (the `user_id, expiry_date` index migration)** in the repair list — per `CLAUDE.md`'s current status, that's the one migration that genuinely hasn't been run against the live project yet. Marking it "applied" without it actually running would leave the index permanently missing from production while Supabase's own tracking wrongly believed it was there, and no future deploy would ever fix that silently-wrong state. Leaving it unrepaired means the next real deploy through this integration applies it for real — which is also a reasonable first live test that the pipeline itself works, since that migration already uses `create index if not exists` and is safe to run.

**Not yet done:** the repair commands were handed to the user to run themselves (this session has no Supabase CLI auth), and the actual `supabase/migrations/seed.sql` → `supabase/seed/seed.sql` move plus the doc update were committed to the repo, but the live Supabase migration-history table itself hasn't been touched yet — that step depends on the user running the CLI commands locally.

**Update, same day — repair completed, integration connected:** the user ran the prepared `supabase migration repair --status applied` command locally. Two real blockers came up along the way, both resolved before the repair actually succeeded: first, `SUPABASE_DB_PASSWORD` wasn't set (the CLI's temp-role login just hung on "Initialising login role..." until it timed out with a clear error asking for it); second, once the password was set, the connection itself timed out against the pooler host on the network the user was on at the time (confirmed with a raw `nc -zv` port check against both 5432 and 6543, both timing out) — switching to a different network resolved it, consistent with a firewall blocking outbound Postgres ports rather than anything wrong with Supabase or the credentials. `supabase migration list` afterwards showed exactly the intended end state: `20260507000000`, `20260601000000`, `20260818000000`, and `20260818020000` all matched between Local and Remote (repaired, not re-run), and `20260818010000` (the index migration) correctly still blank on the Remote side, i.e. genuinely still pending. The user then finished connecting Supabase's GitHub "Deploy to production" integration (repository, working directory `.`, production branch `main`), which is now live — the next merge to `main` will apply only the one genuinely-outstanding migration instead of trying to replay the four that are already in place.

**A security note worth preserving:** the user's real database password was pasted directly into the chat at one point while troubleshooting. This was flagged back to them immediately as semi-exposed (sitting in plaintext in the conversation transcript), and a `read -s SUPABASE_DB_PASSWORD` / `export SUPABASE_DB_PASSWORD` pattern was given for the actual terminal command specifically so it wouldn't also land in shell history — but the recommendation to rotate the password via Settings → Database still stands and hasn't been confirmed as done.

## Card hover contrast bug + mobile search box sizing (fixed 18/8/26)

**Context:** two bugs reported directly against the live app: hovering a card on desktop turned it "a really bright color that makes it hard to read," and the mobile layout "looks great on a laptop but not on a phone." Both were tracked down to a specific root cause rather than patched by guesswork, verified with real screenshots before delivery — the first time in this project a change was actually visually confirmed rather than only compiled/linted, using a disposable local preview (see "Verified" below for how, given this sandbox has no access to the live Supabase-backed app or a real phone).

**Bug 1 — hover colour:** `.item-card` is rendered as a `<button>`, and a global `button:hover { background-color: var(--color-primary-hover) }` rule in `index.css` (written for actual buttons like "Add Item") was winning the cascade on hover, because `.item-card:hover` itself never declared its own `background-color` — only `.item-card` did, at its base state. Since `button:hover` (specificity 0,1,1) beats a plain class rule with no `:hover` of its own contributing to that property, hovering any card swapped its background to a bright teal (`#0b6e5b` in light mode, a near-neon `#4fdab6` in dark mode) that the card's status colours and text were never designed to sit on. **Fix:** `.item-card:hover` now explicitly sets `background-color: var(--color-surface-alt)` — the same subtle-tint pattern already used for hover elsewhere in the app (`.icon-button:hover`, `.sort-toggle button:hover`) — so the existing lift-and-shadow animation does the "you're hovering this" signalling instead of a jarring colour swap.

**Bug 2 — mobile search box:** `.item-search`'s base rule is `flex: 1 1 200px`, written for the desktop toolbar where `.item-toolbar` is `flex-direction: row` and `200px` is a sensible minimum *width*. Below 560px, `.item-toolbar` switches to `flex-direction: column` (already true before this fix) — and the same `flex-basis: 200px` then governs the *main axis*, which is now vertical, so the search input stretched into a roughly 200px-tall empty box instead of a normal single-line field. **Fix:** added `.item-search { flex-basis: auto; }` inside the existing `@media (max-width: 560px)` block, so it sizes to its content's height again; `align-items: stretch` (already set on `.item-toolbar` for mobile) keeps it full-width regardless.

**Verified:** rather than reasoning about these blind, built a throwaway local Vite preview (`/tmp/em-test`, a fresh clone of the actual repo, never delivered or committed) that renders the real `ItemList`/`AddItemForm`/`ExpiryBanner` components with fake in-memory items — no Supabase call, since this sandbox can't log into the live project. Used Playwright (already available in this environment) to screenshot it at both a desktop (1440px) and phone (375px) viewport, in both light and dark mode, and to programmatically hover a card and click the filters/add/detail affordances. This reproduced both bugs exactly as reported before any fix, confirmed both fixes visually afterward, and confirmed the desktop layout was pixel-identical before/after (no regression from either change). `tsc -b --force` and `eslint` both pass clean on the real `App.css`. **A real limitation, still true:** this confirms the components render and behave correctly against fake data in a Chromium instance — it does not replace the user actually opening the live, Supabase-connected app on a real phone, which is still worth doing once pushed.

## Mobile filters collapsed behind a disclosure button (decided 18/8/26)

**Context:** asked directly, with a phone screenshot showing the toolbar's 3 filter selects ("All storage" / "All categories" / "All statuses") and the "By status / By place" sort toggle each stacked as full-width rows beneath the search box — four rows of controls, all visible at once, before a single item card came into view. Asked to fold them into one tab that can be opened to show all of them, aimed at cleaning up the UI.

**Decision:** rather than a JS resize listener or duplicating the toolbar markup per breakpoint, the three selects and the sort-toggle are now wrapped in a single `<div className="item-toolbar-filters">`, preceded by a `.filters-toggle` disclosure button (filter icon, "Filters" label, an active-filter-count badge, a chevron that flips on open). The split between desktop and mobile is pure CSS, no React logic needs to know the viewport: `.filters-toggle { display: none; }` and `.item-toolbar-filters { display: contents; }` are the *base* rules, meaning on desktop the wrapper is invisible to layout (its children lay out as if they were still direct children of `.item-toolbar`, so the row looks pixel-identical to before this change) and the toggle button never renders at all. Inside the existing `@media (max-width: 560px)` block, `.filters-toggle` becomes `display: flex` and `.item-toolbar-filters` becomes `display: none` (or `display: flex; flex-direction: column` once `.is-open` is toggled on) — only there does it actually behave as a collapsible panel. The search box stays outside the wrapper, always visible, since it's the single most-used control and folding it away too would cost more than it saves.

**The badge:** counts only the 3 selects (`storageFilter`/`categoryFilter`/`statusFilter` that aren't `'all'`) — not the sort-mode toggle, since sort mode never hides items, it only reorders/regroups them, so including it in an "active filters" count would be misleading.

**Verified:** using the same disposable Playwright preview described in the hover/mobile-search fix above — screenshotted the panel closed (default), opened (chevron flipped, all four controls visible, stacked), and with one filter set and the panel re-collapsed (badge showing "1", filtered results correct), in both light and dark mode, plus a fresh desktop screenshot confirmed pixel-identical to before this change. `tsc -b --force` and `eslint` both pass clean.

---

## Feedback Sprint: scope and plan of attack (decided 21/8/26)

**Context:** the teacher reviewed the live app and gave direct feedback — full detail in `docs/10-feedback-sprint.md`, which is the primary reference for this sprint since the user specifically wants the process documented clearly for marking. This entry exists so the decision trail stays in the same place as every other decision in this file, but doesn't repeat that doc's full content.

**Naming:** called the "Feedback Sprint," deliberately not "Sprint 7" — it's a reaction to real review of the finished Slices 1–6, not part of the originally planned six-slice structure, and the name should make that distinction obvious to anyone reading the project history later. The due date was extended to next Friday at the same time this feedback was given, which is why this sprint plans and agrees a design before writing code, rather than patching the UI directly under time pressure.

**Decision — sequencing:** wireframe first (with a realistic ~100-item mock dataset built directly into the mockup, so "does this scale" is answered by the wireframe itself), then seed the live database once the wireframe's structure is agreed, then build the real UI, then verify against the real seeded data. Considered seeding first (literally what the teacher suggested) but concluded a static wireframe can simulate "100 items" just as well without needing a live seeded database yet — seeding earns its keep afterward, confirming the built UI holds up against real data rather than just a mockup.

**Decision — wireframe format:** a real, self-contained, clickable HTML/CSS/JS mockup rather than a static image, specifically so the navigation flow and the card/list toggle can be clicked through, not just looked at. First pass is deliberately low-fidelity (grayscale, boxes-and-labels) at the user's request, to keep the discussion on structure before any visual polish is invested.

**Decision — dashboard content:** stat tiles (total/expiring-soon/expired/unsafe counts), a "needs attention" list of the actual soonest-expiring items, quick-nav tiles to Fridge/Freezer/Pantry, and two donut charts — one for status breakdown (Fresh/Soon/Expired/Unsafe, reusing the app's existing status colours) and one for storage-location breakdown (Fridge/Freezer/Pantry). Deliberately excluded a by-category donut: 11 categories is too many slices for a donut to stay legible (per the dataviz skill's series-count guidance — donuts/pies aren't even the recommended default form for part-to-whole data in the first place, a stacked or horizontal bar reads more precisely; the user specifically wants donuts for their visual appeal, which is a reasonable ask on its own for a school project's polish, but 11 slices is where that stops being honest regardless of the form chosen).

**Decision — visual style:** a blend, not a rebrand. The app's existing colours/typography/icons stay; only the information architecture gets denser and more dashboard-like (stat tiles, charts, quick-nav) in the way the teacher's reference screenshots were, rather than adopting those screenshots' own colour scheme or sidebar chrome.

**Decision — everything else:** navigation structure is Claude's first proposal for the user to reshape rather than a settled decision; the list view shows every stat in the first pass and gets trimmed only if genuinely too crowded once actually built; search/filter/sort must behave identically in card and list view; seeding targets ~100–150 items on the user's real account with a deliberate spread across every status/storage/category, not an accidental skew.

**Not yet done:** the wireframe itself, seeding, and the real build are all still ahead — see `docs/10-feedback-sprint.md`'s status checklist, kept current as each step lands.

---

## Feedback Sprint wireframe: default urgency sort, place-dashboards, mobile column collapse (decided 21/8/26)

**Context:** the first wireframe pass (dashboard + full item list, card/list toggle) was reviewed and agreed as a good starting structure. Follow-up feedback asked for four specific refinements before the wireframe is treated as settled: a consistent default sort order everywhere; less shown by default when drilling into a place; a lighter mobile list view; and the wireframe committed into the repo so the design process is visible to the marker. Full write-up of what changed and why lives in `docs/10-feedback-sprint.md` under "Wireframe" — this entry is the decision-trail pointer, same convention as the rest of this file.

**Decision — default sort by urgency:** both card and list view now apply `sortByUrgency()` to the filtered item set before rendering — unsafe items pinned first (a food-safety alert, not a countdown, so they don't get slotted in by a `days` value they don't really have), then everything else ascending by `days`, which reads as "how close to expiring" on one scale. Replaces the previous unsorted (raw array) order.

**Decision — place-dashboards instead of jumping straight to a full list:** clicking Fridge/Freezer/Pantry from the main dashboard now opens a new, smaller "place dashboard" (stat tiles + a needs-attention list, both scoped to that place) rather than the full item list directly — applying the same "don't show more than needed by default" rule one level down, per the explicit design principle raised in this round of feedback ("we never want to overload the UI so the user would have to actually choose to see everything"). "All items" and "View all expiring" still go straight to the full list, since those are already an explicit "show me everything" choice with no useful intermediate summary. The breadcrumb gained a third level to reflect this (`Dashboard › Fridge › All Fridge items`).

**Decision — mobile list view shows only Name/Days left/Status by default:** on phone-width screens, the list/table view now hides Category, Storage, Expiry date, Quantity, and Opened by default; tapping a row expands an inline detail row showing them. Desktop is unchanged (all 8 columns, rows aren't clickable). A real layout bug was caught and fixed while building this: the table's desktop `min-width: 720px` was still forcing the mobile table to lay out at 720px width with the 3 visible columns stretched across it, pushing the Status column off-screen to the right instead of fitting the phone's actual width — fixed with a mobile override (`min-width: 0; width: 100%; table-layout: fixed`) plus explicit percentage widths for the 3 visible columns, so they actually fill the viewport instead of a phantom desktop-sized table.

**Verified:** extended the disposable Playwright harness (`/tmp/wireframe/shot2.mjs`) to check the actual first-row values after sorting (confirming unsafe-first and ascending-days ordering), the 3-level breadcrumb text, the place-dashboard screenshots (desktop + phone), and the mobile row-expand/collapse interaction (screenshotted collapsed, expanded, and re-collapsed) — zero console errors across both the original and extended screenshot suites. The min-width bug above was actually caught this way: the first screenshot showed only 2 columns fitting on screen instead of 3, which led to inspecting the table's real rendered width via a script (720px instead of the phone's ~375px) before fixing it.

---

## Feedback Sprint database seed (decided 21/8/26)

**Context:** with the wireframe reviewed and agreed, the plan of attack's next step is seeding the live database with a realistic volume of data — the actual point being to answer "does this UI hold up at ~100+ items" against real Supabase data, not just the wireframe's baked-in mock dataset. The existing `supabase/seed/seed.sql` (from Slice 1) only has ~20 items, nowhere near enough, and wasn't built with a deliberate status/category/storage spread in mind.

**Decision — generate, don't hand-write:** wrote a throwaway Python generator (`/tmp/seedgen/generate_seed.py`, not committed) rather than typing ~135 SQL rows by hand, since the actual hard part isn't the row count — it's making sure the resulting data, once run through the app's real Adjusted Expiry Date Algorithm, lands in a deliberately chosen spread of statuses rather than an accidental one. For each row, the generator picks a target *adjusted-status bucket* first (fresh / soon / expired / unsafe, weighted roughly 65/13/13/9 to stay realistic — most food in a real kitchen is fine — while still guaranteeing every bucket, every category, and every storage location is represented), then *inverts* that category's real rule from `decisions.md`'s algorithm to solve for the printed expiry date (or date opened, or date prepared for Leftovers) that produces exactly that adjusted result.

**A real correctness risk, and how it was caught:** an inverted rule is easy to get subtly wrong — e.g. solving for a `date_opened` that ends up in the future (violates the `date_opened <= current_date` constraint), or a rule that doesn't actually depend on `is_opened` at all (several categories' Fridge/Pantry rules ignore it) getting a `date_opened` value that was accidentally still derived from the target anyway. Caught this by writing a second, independent *forward* function that re-implements the same real algorithm from scratch and checking every generated row through it before writing the SQL — not trusting the inverse math on its own. This caught and fixed several real bugs before any SQL was written: three "opened doesn't affect this rule" categories (Meat/Seafood/Produce/Bakery/Snacks Fridge/Pantry branches) were accidentally still tying their `date_opened` value to the target bucket, which could push it into the future; a sign error in the forward-check itself for Dairy's Freezer-unopened rule (`printed − 60` instead of the real `printed + 60`) was also caught this way; Leftovers rows were being generated with `is_opened = true` even though the "opened" concept doesn't apply to a prepared meal, which violated the "opened requires a date_opened" constraint since the Leftovers rule never sets one; and a handful of Leftovers "fresh" targets (up to 250 days) had no feasible combination (Leftovers can only reach ~90 days out, via the freezer rule) and were silently falling back to a raw, unadjusted date — which would have produced a nonsensical *future* "date prepared." All four were fixed in the generator, and the final 135-row set was re-verified at zero mismatches and zero constraint violations before being written to `supabase/seed/feedback-sprint-seed.sql`.

**Decision — same real account, not a throwaway one:** seeded against the same real `auth.users` UUID already used in the existing `seed.sql` (`0b3816cf-2946-4363-9490-313fd82f865a`), per the plan of attack's "seed against the user's own real account" decision — so it shows up in actual use, not a separate account nobody looks at.

**Decision — leave the old seed in place, don't delete it:** `supabase/seed/seed.sql` (the 20-item Slice 1 seed) stays as a historical record; the new file is a separate, additional script rather than an edit to the old one, consistent with how migrations are never edited after the fact on this project (`decisions.md`, "Repository structure alignment"). The new seed's header includes an optional, commented-out `delete from items where user_id = ...` line for anyone who wants to clear old test data first for a clean ~135-item dataset, rather than this landing on top of whatever's already in the account.

**Not yet done:** like every other migration/seed on this project, this needs to be run by hand in the Supabase SQL Editor — this sandboxed session has no Supabase CLI credentials to run it directly. Not yet run as of writing this entry.
