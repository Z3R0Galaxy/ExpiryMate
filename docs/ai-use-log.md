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
