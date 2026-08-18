-- Adds 'Eggs' to the food_category enum.
--
-- Context: the Adjusted Expiry Date Algorithm (docs/decisions.md) already had
-- a fully worked-out Eggs section (fridge/freezer/pantry x opened rules), but
-- 'Eggs' was never actually a selectable category — egg items had to be
-- logged under Dairy or Produce, both of which used the wrong shelf-life
-- rules. This closes that gap. See decisions.md, "Category/algorithm
-- reconciliation" (18/8/26).
--
-- Must be run as its own statement (not wrapped in an explicit transaction
-- with other DDL) — Postgres allows ALTER TYPE ... ADD VALUE outside a
-- transaction block, which is how the Supabase SQL Editor runs it by default.

alter type food_category add value 'Eggs';
