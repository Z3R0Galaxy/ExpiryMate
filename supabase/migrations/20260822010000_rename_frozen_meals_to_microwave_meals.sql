-- Renames the 'Frozen Meals' food_category enum value to 'Microwave Meals'.
--
-- Context: the user asked to rename the category right after the previous
-- migration (20260822000000_add_frozen_meals_category.sql) had already been
-- run against the live database, so existing items already saved under
-- 'Frozen Meals' need to carry the new name forward rather than being
-- re-added as a second value. `rename value` does exactly that: it changes
-- the label in place, so every row already tagged 'Frozen Meals' reads as
-- 'Microwave Meals' immediately, with no separate data migration needed.
--
-- Unlike `add value`, `rename value` has no same-transaction restriction —
-- it doesn't introduce a value that needs to be committed before use, so
-- this is safe to run as a single statement same as any other DDL.

alter type food_category rename value 'Frozen Meals' to 'Microwave Meals';
