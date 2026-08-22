-- Adds 'Frozen Meals' to the food_category enum.
--
-- Context: Feedback Sprint 2 (22/8/26) asked for a dedicated category for
-- frozen/microwavable ready meals — previously these had to be logged under
-- the general 'Frozen' category, which uses raw-frozen-ingredient rules
-- (e.g. frozen chicken, frozen veg) that don't reflect how a ready meal
-- actually behaves once opened: a ready meal is reheated and eaten like a
-- cooked leftover, with a much shorter fridge life than "still frozen, just
-- thawing" implies. See docs/decisions.md, "Feedback Sprint 2: Frozen Meals
-- category," for the new adjusted-expiry rule this unlocks in
-- src/lib/adjustedExpiry.ts.
--
-- Must be run as its own statement (not wrapped in an explicit transaction
-- with other DDL) — same constraint noted in the Eggs migration this
-- mirrors (20260818020000_add_eggs_category.sql).

alter type food_category add value 'Frozen Meals';
