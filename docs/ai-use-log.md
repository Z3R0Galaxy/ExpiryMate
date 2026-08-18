# AI Use Log

**Format (per the assessment's AI use requirements):** each substantive entry records the prompt/ask, a summary of Claude's response, and what was done with it — accepted, modified, or rejected, and why. Trivial autocomplete doesn't need logging; architecture suggestions, generated components, and non-trivial debugging do. Entries below before 18/8/26 predate this stricter format being adopted and are left as originally written rather than rewritten after the fact — see the 18/8/26 entry for why.

## 27/5/26
Consulted Claude on increasing project complexity. Decided to add food category (10 types: Dairy, Meat, Seafood, Produce, Bakery, Frozen, Beverages, Condiments, Snacks, Leftovers), storage location (Fridge, Freezer, Pantry), opened/unopened status, and date opened. Claude updated `02-requirements.md` and the data dictionary to reflect the new fields, and first-populated `decisions.md` with the full adjusted expiry date algorithm, citing the USDA Cold Food Storage Chart.

## 1/6/26
Discussed database structure with Claude using the data dictionary as a reference. Claude produced two SQL migration files: one to create the base `items` table with RLS, and one to add the new fields (`category`, `storage_location`, `quantity`, `is_opened`, `date_opened`).

## 3/6/26
Ran the migration SQL in the Supabase SQL Editor to apply the schema. Claude generated a seed script with 20 items representing a typical Australian household (Vegemite, Tim Tams, Barramundi, lamb chops, etc.) covering all 10 categories, with one expired item to test the status badge logic. Seed was run after clearing old test data.

## 8/6/26
Attempted to create a data flow diagram for the app. Explored connecting to Figma via the Claude in Chrome extension, but the extension was not installed. Session ended without completing the diagram.

## 11/6/26
Planned the build slice structure with Claude. Decided on six vertical slices ordered by dependency: (1) App Shell, (2) Full Schema Forms, (3) Adjusted Expiry Logic, (4) Styling, (5) Expiry Notifications, (6) Nice-to-Haves. Claude recorded the plan in `decisions.md`.

## 18/8/26
**Gap:** no entries between 11/6/26 and today — roughly nine weeks with no logged AI interaction, coinciding with several "testing" commits to `main` (placeholder content, no feature work) rather than genuine progress. Reason: trial examinations took priority over this project through that period, leaving no time to divert to it. Recorded here honestly rather than backfilling invented sessions.

**Prompt:** asked Claude where the project currently stood, then uploaded the Canvas assessment page (Assessment Task 3 — Software Engineering Project) and asked it to read the requirements carefully and reconcile the repo against them before resuming feature slices.

**Response:** Claude read the assessment page directly (due 8am Mon 24 Aug 2026, marked out of 30 across a working solution + report + folio + walk-through) and compared it against the existing repo. It found: the mandated `docs/` folder layout wasn't followed (04 was "slice-structure" instead of "data-model"; 05–09 didn't exist), `supabase/functions/` and the `tests/{unit,integration,smoke}` layout didn't exist, the security floor had two open items (email verification status unknown, client-side input validation minimal), and the live Vercel deployment (`expiry-mate.vercel.app`) was serving placeholder content rather than the app, because that's what's on `main`.

**Accepted:** the repo restructure (new `docs/04-data-model.md` through `09-iteration-log.md`, `supabase/functions/`, `tests/{unit,integration,smoke}/`, a rewritten `README.md`, this log-format change) — reviewed each generated doc against what's actually true of the codebase before accepting, rather than taking Claude's drafts as fact. Confirmed the Vercel URL and asked for the Supabase email-verification setting directly rather than letting Claude guess at it.

**Modified/pending:** the old `04-slice-structure.md` content — its substance was already duplicated in `decisions.md`, so it's being retired rather than kept as a separate numbered file; the physical file removal is a manual step since Claude's tooling can't delete files on this machine directly.

**Follow-up (same day):** Claude had drafted `.env.local.example` as a template for anyone else setting up the project locally. Asked Claude to explain what it was for, since it wasn't obvious. **Rejected** — this repo is only being submitted to a teacher via zip, not cloned by other developers, so the template file serves no purpose here. Instead of just dropping it, checked the rest of the repo for references to it and found `README.md`'s setup instructions told a reader to `cp .env.local.example .env.local`, which would now point at a file that doesn't exist. Had Claude fix that line so the README stays accurate rather than leaving a dangling reference for whoever reads it (marker included).

**Follow-up (same day):** asked Claude directly whether the logs were actually being kept current and whether the six-slice plan is tuned for full marks, not just "it works." First question exposed exactly the gap this entry is closing — the log hadn't caught up with the last few exchanges, which is itself a useful data point about how easy it is to let this slip mid-session rather than only at the end. Second question is addressed as a new entry in `decisions.md` (marking-alignment review) rather than here, since it's a scope decision, not an AI-interaction record.

**Follow-up (same day):** asked Claude to also add a standing instruction to commit and push after every milestone, with a matching commit message each time — recorded in `CLAUDE.md`. First attempt to actually do this exposed a real limitation: Claude's tooling can commit directly against the local repo, but has no real network access to push to GitHub (a proxy blocks it). Accepted the split — Claude commits, I push — rather than handing Claude a GitHub token to work around it, since a single `git push` per milestone is a low enough cost to not bother with the workaround.

## 18/8/26 (Slice 1 — App Shell)

**Prompt:** "lets do it!" — go-ahead to start building Slice 1 per the plan in `decisions.md`.

**Response:** Claude rewrote `App.tsx` from the placeholder into the real session-managed shell (`getSession` on mount, `onAuthStateChange` subscription, conditional render of `Auth` vs. the authenticated view, Sign Out button), and wrote the RLS-policy-split migration planned in the marking-alignment review. Ran `tsc -b --force` to confirm the new `App.tsx` type-checks cleanly before calling it done — `vite build` itself couldn't be verified in this sandbox (a native-binding mismatch unrelated to the code), so that check is deferred to running `npm run dev`/`npm run build` locally.

**Accepted:** the `App.tsx` rewrite and the migration file, after checking the component wiring matches the actual prop signatures already in `Auth.tsx`, `AddItemForm.tsx`, and `ItemList.tsx` (no changes needed there for this slice) rather than assuming Claude got the interface right.

**Pending, not yet accepted as "working":** the actual sign-in/sign-out/add-item flow hasn't been exercised in a real browser, and the RLS migration hasn't been run against the live Supabase project. Both are logged as open in `09-iteration-log.md` rather than assumed complete just because the code compiles.

## 18/8/26 (Slice 1 — debugging the live test)

**Prompt:** ran `npm run dev` and tested sign-up for real. Hit three separate failures in sequence and asked Claude to diagnose each rather than guessing myself: a "Failed to fetch" error on sign-up, then a "succeeded" sign-up with no confirmation email, then a confirmation link that redirected to `localhost` and wouldn't load on a phone.

**Response:** Claude walked through each one by directing me to specific places in the Supabase dashboard rather than guessing blind — the project health breakdown (which showed the "Unhealthy" top-level badge was actually just Edge Functions, unused by this app, and a red herring), the Users list (which revealed I was re-using an already-confirmed test account from May, so no new email was ever going to be sent), and finally Authentication → URL Configuration, which had the actual bug: Site URL pointed at `localhost:5173` instead of the deployed app.

**Accepted:** all three diagnoses were verified against what the dashboard actually showed before acting on them, not taken on faith — e.g. checked the health breakdown to confirm Auth/DB/PostgREST were genuinely healthy before ruling out "project is down" as the cause. Fixed the Site URL in Supabase to point at `https://expiry-mate.vercel.app` with `localhost:5173/**` as an additional redirect, per Claude's suggestion, which is now the permanent setting, not a workaround — recorded in `decisions.md`.

**Result:** full sign-up → email confirmation → sign-in → add item → see it in the list, working end-to-end against the live Supabase project. Slice 1 is genuinely verified now, not just "compiles."

## 18/8/26 (Slice 2 — Full Schema Forms)

**Prompt:** "lets move onto slice 2" — go-ahead to build the full-schema forms per `decisions.md`.

**Response:** Claude created `src/hooks/useItems.ts` to centralise the Supabase calls, `src/lib/validateItem.ts` for shared client-side validation, and rewrote `AddItemForm.tsx`, `ItemList.tsx`, and `App.tsx` to use both. Also wrote the `(user_id, expiry_date)` index migration planned in the marking-alignment review.

**Verified before accepting:** ran `tsc -b --force` (clean) and `eslint` on the changed files, which caught a real issue — `react-hooks/set-state-in-effect` flagged the mount-time fetch in `useItems`. Rather than accepting Claude's first fix or silently ignoring the lint failure, asked it to explain why the rule fired; it turned out the rule flags the pattern based on the fetch function transitively calling a state setter at all, not on synchronous timing specifically, which would rule out the "shared fetch function for mount + refetch" pattern outright. Accepted Claude's disable-with-explanation as the right call rather than contorting the code, recorded in `decisions.md`.

**Not yet verified:** the actual add/edit item flow with the full field set hasn't been exercised in a real browser yet, and the index migration hasn't been run against the live project. Both logged as open in `09-iteration-log.md`.

## 18/8/26 (Leftovers date field relabelling)

**Prompt:** while testing, raised a real design gap unprompted: "one thing im wondering, if the item is left overs, the user wouldnt know what the exp date is" — Leftovers are homemade, so there's no printed date to read off a label.

**Response:** Claude pointed out the algorithm in `decisions.md` had already anticipated this (Leftovers use "date prepared," not a printed expiry date) but the form never actually reflected it — it always showed "Printed expiry date" regardless of category. Fixed `AddItemForm.tsx` and `ItemList.tsx`'s inline edit to relabel the same `expiry_date` field to "Date prepared" (visually and via `aria-label`) when category is Leftovers, and capped that field at today's date for Leftovers only, since a meal can't be prepared in the future. Display row changed from always "expires {date}" to "prepared {date}" for Leftovers. No schema change — same column, reused.

**Accepted:** the relabelling, after checking it didn't silently paper over the deeper issue — asked Claude directly whether the status badge would still make sense for Leftovers. It flagged that `getStatus` will show a fresh Leftovers item as "Expiring soon" or "Expired" immediately, since it still treats the date as a future expiry date rather than a past prepared date. Accepted this as a known, tracked limitation rather than a bug to patch now, since Slice 3's `getAdjustedExpiry` replaces `getStatus` wholesale in a few days anyway and a special-case fix here would just be thrown away. Recorded in `decisions.md`.

**Verified before accepting:** ran `tsc -b --force` and `eslint` on both changed files — clean.

**Not yet verified:** the relabelling hasn't been exercised in a real browser yet (confirm "Date prepared" actually shows when Leftovers is selected, in both the add form and inline edit). Logged as open in `09-iteration-log.md`.

## 18/8/26 (Auto-category suggestion — planning only)

**Prompt:** proposed a new idea — have the app read the item name as it's typed and automatically suggest the category, while still letting the user override it if the guess is wrong.

**Response:** Claude confirmed it's a good, cheap-to-build feature (a pure keyword-matching function, no network call or LLM needed), but flagged the honest trade-off directly rather than just agreeing: it's not a Must Have, and Slices 3–5 are required, outstanding, and due in six days, so building it now competes with that time. Asked two direct questions before doing anything: when to build it (now vs. deferred to Slice 6), and whether a simple keyword-matching heuristic was acceptable versus a "real" AI/LLM call.

**Accepted:** deferred to Slice 6, keyword-matching approach confirmed (explicitly rejected a real LLM call — added cost, latency, an API key to manage, and a new failure mode for no real benefit over a good keyword list). Recorded as a decision in `decisions.md` and folded into Slice 6's scope in `CLAUDE.md`. No code written yet — this entry is planning only.

## 18/8/26 (Slice 3 — Adjusted Expiry Logic)

**Prompt:** "slice three lets do it!" — go-ahead to build Slice 3 per the plan in `decisions.md`.

**Response:** before writing `getAdjustedExpiry`, Claude checked the `food_category` DB enum against the algorithm's category sections and found they didn't actually line up — the DB's Frozen and Snacks had no algorithm rules, and the algorithm's Eggs and Dry Goods had no matching DB category. Rather than guess at a graded algorithm, Claude raised all three gaps directly and proposed a recommended resolution for each before writing any code.

**Accepted:** Snacks reuses the Dry Goods rules; Frozen gets a new rule set (printed date holds in the freezer, unsafe outside it); Eggs added as an 11th DB category with a small migration, since the algorithm's Eggs rules already existed but had nowhere to attach. All three recorded in `decisions.md` ("Category/algorithm reconciliation") before implementation, not after.

**Verified before accepting:** Claude built `src/lib/adjustedExpiry.ts` as a pure function, wired it into a memoised `ItemRow` inside `ItemList.tsx` (per the marking-alignment review's performance note), and ran a hand-picked test case per category — including the unsafe-warning paths and an exact day-0 boundary case — through a throwaway script before treating any of it as done. `tsc -b --force` and `eslint` both pass clean. Checked the boundary case output by hand against the Fresh/Soon/Expired thresholds already fixed in `decisions.md` rather than trusting the script's output blindly.

**Not yet verified:** the actual add/edit flow — picking Eggs or Frozen as a category, toggling storage location and opened status, and seeing the adjusted date/status badge/warning text update correctly — hasn't been exercised in a real browser yet, and the Eggs migration hasn't been run against the live project. Both logged as open in `09-iteration-log.md`.

## 18/8/26 (Eggs migration run + a Slice 6 idea)

**Prompt:** ran `20260818020000_add_eggs_category.sql` in Supabase and confirmed it worked. Asked Claude to explain what the migration was actually for and why it was needed, then raised a new idea: pre-fill the current year in the date fields, since it's almost always right, while keeping it changeable.

**Response:** Claude explained the migration in plain terms (Eggs' algorithm rules existed but had nowhere to attach as a real category, so eggs were being logged under the wrong rules until this ran). For the date-field idea, Claude checked a real technical constraint before agreeing an approach: `<input type="date">` can't hold a partial value, so "pre-fill just the year" isn't achievable — the practical version is defaulting the whole field to today's date, which the user can still fully edit.

**Accepted:** deferred to Slice 6 (same reasoning as the auto-category suggestion — good UX, not a Must Have, required slices take priority). Agreed approach: default `AddItemForm`'s date field to today's date instead of blank; leave `ItemList`'s inline edit form as-is since it already correctly defaults to the item's existing date. Recorded in `decisions.md` and `CLAUDE.md`. No code written yet — planning only.

## 18/8/26 (Slice 4 — Styling)

**Prompt:** "lets do slice 4" — go-ahead to build Slice 4 per the plan in `decisions.md`.

**Response:** Claude wrote `src/index.css` (reset, base typography, colour variables) and `src/App.css` (layout for the auth screen, app shell, add-item form, and item list/cards), styling the class names already present in the JSX from Slices 1–3 without touching any component markup, except one necessary line.

**Real issue caught:** while writing the layout styles, Claude found `App.css` had never actually been imported anywhere — `main.tsx` only imports `index.css` — so the new styles would have silently done nothing. Added `import './App.css'` to `App.tsx` to fix it, and flagged this directly rather than writing CSS into a file that wasn't wired up.

**Accepted:** the four-hue status badge approach (giving the Slice 3 "unsafe/not-recommended" warning its own colour rather than reusing red or grey, so it doesn't read as a more severe "Expired"), the system-font-stack choice (no external font load, matches the "no UI library" tech-stack decision), and the accessibility touches (visible focus outlines, one mobile breakpoint). Recorded as implementation notes in `decisions.md`.

**Verified before accepting:** `tsc -b --force` and `eslint` both pass clean.

**Not yet verified:** hasn't been opened in a real browser — CSS parsing clean isn't the same as the layout actually looking right. Logged as open in `09-iteration-log.md`.

## 18/8/26 (Slice 4 revision — minimal, dark mode, full-width desktop)

**Prompt:** feedback after seeing Slice 4 rendered: the UI felt cluttered, wanted a nicer colour palette with a dark mode, and wanted the site to use the full screen on a desktop ("landscape") while still fitting a phone. Asked directly whether this would be handled in a later slice.

**Response:** Claude answered honestly rather than deferring — neither Slice 5 (notifications) nor Slice 6 (nice-to-haves) touch visual design at all, so this needed to happen now as a revision of Slice 4. Before building the dark mode piece, Claude asked one direct question: manual toggle button vs. automatically following the OS setting with no button.

**Accepted:** manual toggle, remembered across visits via `localStorage`, implemented as `src/hooks/useTheme.ts` plus a small inline script in `index.html` to avoid a flash of the wrong theme on load. Also accepted: restructuring the item card's view mode (a genuine JSX change, not just CSS) into a cleaner two-row layout with muted middle-dot-separated meta text instead of individual pill badges for every field; a four-colour palette with dark-mode variants; and a full-bleed sticky header with a wide, grid-based item list so a desktop screen shows multiple item cards side by side instead of one narrow centred column.

**Verified before accepting:** `tsc -b --force` and `eslint` both pass clean on every changed file.

**Not yet verified:** hasn't been opened in a real browser — need to check both light and dark themes, the toggle persisting across a reload, the grid actually showing multiple columns on a wide screen, and the mobile layout at a genuinely narrow width. Logged as open in `09-iteration-log.md`.

## 18/8/26 (Slice 4 second revision — meta row as a grid, not wrapped text)

**Prompt:** shared a screenshot of the rendered card showing the middle-dot-separated meta line wrapping with a stray leading "·" on the second line, and asked to "remove the bottom text bit." Claude asked a clarifying question about which specific field to drop (adjusted date vs. quantity) before touching anything, since deleting the wrong thing would lose real information. The actual answer clarified it wasn't about removing a field at all — it was that the wrapped run of text looked unformatted, full stop.

**Response:** replaced the inline separated text with a small label/value grid (one row per fact: Category, Storage, Expires/Prepared, Adjusted, Qty, Opened), so it reads as a set of facts rather than a sentence that wraps unpredictably. The unsafe/not-recommended warning message gets its own full-width row since it's a sentence, not a short value.

**Accepted:** the grid layout, after Claude asked first rather than guessing which field the complaint was actually about — the free-text answer ("make it all look good and together") confirmed it was purely a formatting complaint, not a request to drop information, which the original multiple-choice question hadn't fully anticipated.

**Verified before accepting:** `tsc -b --force` and `eslint` both pass clean.

**Not yet verified:** still needs a real browser check, same as the rest of Slice 4.
