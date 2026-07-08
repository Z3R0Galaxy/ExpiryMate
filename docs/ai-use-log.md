# AI Use Log

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