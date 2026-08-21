-- Feedback Sprint seed data — realistic ~135-item household inventory
-- Seeded against the user's real account: 609e83a3-ec8e-489d-865a-353e769d5659
-- Generated 21/8/26 for the Feedback Sprint's "seed before building the real UI" step.
--
-- Corrected 21/8/26: originally generated against 0b3816cf-2946-4363-9490-313fd82f865a,
-- a different (older) account of the user's — the insert succeeded but RLS correctly
-- hid every row from the account actually signed into the app, so nothing appeared.
-- The UUID above is now the corrected one. See docs/decisions.md, "Feedback Sprint
-- seed account mismatch" for the fix applied to the already-run data.
-- See docs/10-feedback-sprint.md and docs/decisions.md for the generation approach:
-- every row's expiry_date/date_opened was computed by inverting the real Adjusted
-- Expiry Date Algorithm (docs/decisions.md) so the resulting ADJUSTED date lands in a
-- deliberately chosen bucket (fresh / soon / expired / unsafe), then verified forward
-- against the same algorithm before being written here — not just random dates.
--
-- Bucket spread: ~91 fresh, ~18 soon, ~17 expired, ~9 unsafe (out of 135) — deliberately
-- not skewed to all-fresh, and every one of the 11 categories x 3 storage locations that
-- can legitimately occur is represented at least once.
--
-- Supersedes supabase/seed/seed.sql (the original ~20-item Slice 1-era seed) for this
-- purpose — that file is left in place as a historical record, not deleted.
--
-- Run this by hand in the Supabase SQL Editor (same as every migration so far — see
-- CLAUDE.md). Not idempotent: running it twice inserts the data twice. If this account
-- already has the old 20-item seed (or other test items) in it and a clean ~135-item
-- dataset is wanted instead, uncomment the line below to clear this account's items
-- first — irreversible, so only uncomment it deliberately:
-- delete from items where user_id = '609e83a3-ec8e-489d-865a-353e769d5659';

insert into items (user_id, name, category, storage_location, expiry_date, quantity, is_opened, date_opened)
values
  ('609e83a3-ec8e-489d-865a-353e769d5659', 'Whole Milk', 'Dairy', 'Pantry', current_date + 52, 1, false, null),  -- unsafe
  ('609e83a3-ec8e-489d-865a-353e769d5659', 'Free-Range Eggs', 'Eggs', 'Fridge', current_date + 45, 2, false, null),  -- fresh
  ('609e83a3-ec8e-489d-865a-353e769d5659', 'Chicken Breast', 'Meat', 'Freezer', current_date - 150, 3, false, null),  -- fresh
  ('609e83a3-ec8e-489d-865a-353e769d5659', 'Salmon Fillet', 'Seafood', 'Fridge', current_date + 60, 2, true, current_date - 4),  -- fresh
  ('609e83a3-ec8e-489d-865a-353e769d5659', 'Spinach', 'Produce', 'Fridge', current_date + 14, 1, true, current_date - 9),  -- fresh
  ('609e83a3-ec8e-489d-865a-353e769d5659', 'Sourdough Bread', 'Bakery', 'Pantry', current_date + 47, 1, true, current_date - 2),  -- fresh
  ('609e83a3-ec8e-489d-865a-353e769d5659', 'Frozen Peas', 'Frozen', 'Freezer', current_date + 10, 4, false, null),  -- fresh
  ('609e83a3-ec8e-489d-865a-353e769d5659', 'Orange Juice', 'Beverages', 'Fridge', current_date + 10, 1, false, null),  -- fresh
  ('609e83a3-ec8e-489d-865a-353e769d5659', 'Ketchup', 'Condiments', 'Pantry', current_date + 61, 3, true, current_date - 13),  -- soon
  ('609e83a3-ec8e-489d-865a-353e769d5659', 'Tortilla Chips', 'Snacks', 'Fridge', current_date + 3, 2, false, null),  -- soon
  ('609e83a3-ec8e-489d-865a-353e769d5659', 'Leftover Pasta', 'Leftovers', 'Freezer', current_date - 91, 2, false, null),  -- expired
  ('609e83a3-ec8e-489d-865a-353e769d5659', 'Skim Milk', 'Dairy', 'Fridge', current_date + 20, 2, false, null),  -- fresh
  ('609e83a3-ec8e-489d-865a-353e769d5659', 'Egg Whites Carton', 'Eggs', 'Pantry', current_date + 104, 3, false, null),  -- fresh
  ('609e83a3-ec8e-489d-865a-353e769d5659', 'Chicken Thighs', 'Meat', 'Fridge', current_date + 20, 2, true, current_date),  -- fresh
  ('609e83a3-ec8e-489d-865a-353e769d5659', 'Prawns', 'Seafood', 'Fridge', current_date + 30, 1, true, current_date - 10),  -- fresh
  ('609e83a3-ec8e-489d-865a-353e769d5659', 'Carrots', 'Produce', 'Pantry', current_date + 2, 2, false, null),  -- soon
  ('609e83a3-ec8e-489d-865a-353e769d5659', 'Bagels', 'Bakery', 'Pantry', current_date + 180, 2, false, null),  -- fresh
  ('609e83a3-ec8e-489d-865a-353e769d5659', 'Frozen Berries', 'Frozen', 'Freezer', current_date + 47, 2, true, current_date - 7),  -- soon
  ('609e83a3-ec8e-489d-865a-353e769d5659', 'Almond Milk', 'Beverages', 'Fridge', current_date + 180, 3, false, null),  -- fresh
  ('609e83a3-ec8e-489d-865a-353e769d5659', 'Mayonnaise', 'Condiments', 'Freezer', current_date + 18, 1, false, null),  -- unsafe
  ('609e83a3-ec8e-489d-865a-353e769d5659', 'Trail Mix', 'Snacks', 'Freezer', current_date - 120, 2, false, null),  -- fresh
  ('609e83a3-ec8e-489d-865a-353e769d5659', 'Leftover Curry', 'Leftovers', 'Freezer', current_date - 70, 3, false, null),  -- fresh
  ('609e83a3-ec8e-489d-865a-353e769d5659', 'Greek Yoghurt', 'Dairy', 'Freezer', current_date - 40, 4, false, null),  -- fresh
  ('609e83a3-ec8e-489d-865a-353e769d5659', 'Duck Eggs', 'Eggs', 'Fridge', current_date + 60, 3, false, null),  -- fresh
  ('609e83a3-ec8e-489d-865a-353e769d5659', 'Ground Beef', 'Meat', 'Freezer', current_date - 90, 3, false, null),  -- fresh
  ('609e83a3-ec8e-489d-865a-353e769d5659', 'Tinned Tuna', 'Seafood', 'Freezer', current_date - 90, 2, false, null),  -- fresh
  ('609e83a3-ec8e-489d-865a-353e769d5659', 'Apples', 'Produce', 'Pantry', current_date + 14, 2, false, null),  -- fresh
  ('609e83a3-ec8e-489d-865a-353e769d5659', 'Dinner Rolls', 'Bakery', 'Fridge', current_date, 1, true, current_date - 6),  -- soon
  ('609e83a3-ec8e-489d-865a-353e769d5659', 'Ice Cream', 'Frozen', 'Freezer', current_date + 39, 3, true, current_date - 15),  -- expired
  ('609e83a3-ec8e-489d-865a-353e769d5659', 'Cold Brew Coffee', 'Beverages', 'Fridge', current_date + 20, 2, true, current_date - 17),  -- expired
  ('609e83a3-ec8e-489d-865a-353e769d5659', 'Soy Sauce', 'Condiments', 'Fridge', current_date + 60, 2, true, current_date - 30),  -- soon
  ('609e83a3-ec8e-489d-865a-353e769d5659', 'Crackers', 'Snacks', 'Fridge', current_date + 14, 1, false, null),  -- fresh
  ('609e83a3-ec8e-489d-865a-353e769d5659', 'Leftover Rice', 'Leftovers', 'Pantry', current_date + 38, 1, false, null),  -- unsafe
  ('609e83a3-ec8e-489d-865a-353e769d5659', 'Natural Yoghurt', 'Dairy', 'Freezer', current_date - 15, 3, false, null),  -- fresh
  ('609e83a3-ec8e-489d-865a-353e769d5659', 'Quail Eggs', 'Eggs', 'Fridge', current_date + 20, 3, false, null),  -- fresh
  ('609e83a3-ec8e-489d-865a-353e769d5659', 'Beef Steak', 'Meat', 'Fridge', current_date + 250, 3, true, current_date - 8),  -- fresh
  ('609e83a3-ec8e-489d-865a-353e769d5659', 'Barramundi Fillets', 'Seafood', 'Fridge', current_date + 2, 4, true, current_date - 4),  -- soon
  ('609e83a3-ec8e-489d-865a-353e769d5659', 'Bananas', 'Produce', 'Pantry', current_date + 20, 1, true, current_date - 5),  -- fresh
  ('609e83a3-ec8e-489d-865a-353e769d5659', 'White Bread', 'Bakery', 'Fridge', current_date + 2, 4, true, current_date - 10),  -- soon
  ('609e83a3-ec8e-489d-865a-353e769d5659', 'Frozen Pizza', 'Frozen', 'Freezer', current_date + 180, 4, false, null),  -- fresh
  ('609e83a3-ec8e-489d-865a-353e769d5659', 'Apple Juice', 'Beverages', 'Fridge', current_date + 37, 2, true, current_date),  -- soon
  ('609e83a3-ec8e-489d-865a-353e769d5659', 'Mustard', 'Condiments', 'Fridge', current_date + 58, 1, true, current_date - 32),  -- expired
  ('609e83a3-ec8e-489d-865a-353e769d5659', 'Muesli Bars', 'Snacks', 'Fridge', current_date + 120, 2, true, current_date - 8),  -- fresh
  ('609e83a3-ec8e-489d-865a-353e769d5659', 'Leftover Roast Chicken', 'Leftovers', 'Freezer', current_date - 70, 1, false, null),  -- fresh
  ('609e83a3-ec8e-489d-865a-353e769d5659', 'Cheddar Cheese', 'Dairy', 'Freezer', current_date - 15, 2, false, null),  -- fresh
  ('609e83a3-ec8e-489d-865a-353e769d5659', 'Organic Eggs', 'Eggs', 'Fridge', current_date + 30, 1, false, null),  -- fresh
  ('609e83a3-ec8e-489d-865a-353e769d5659', 'Pork Chops', 'Meat', 'Fridge', current_date + 45, 2, true, current_date),  -- fresh
  ('609e83a3-ec8e-489d-865a-353e769d5659', 'Squid', 'Seafood', 'Freezer', current_date - 97, 1, true, current_date - 92),  -- expired
  ('609e83a3-ec8e-489d-865a-353e769d5659', 'Tomatoes', 'Produce', 'Pantry', current_date + 180, 1, true, current_date - 9),  -- fresh
  ('609e83a3-ec8e-489d-865a-353e769d5659', 'Croissants', 'Bakery', 'Freezer', current_date - 70, 1, false, null),  -- fresh
  ('609e83a3-ec8e-489d-865a-353e769d5659', 'Frozen Chips', 'Frozen', 'Freezer', current_date + 120, 2, false, null),  -- fresh
  ('609e83a3-ec8e-489d-865a-353e769d5659', 'Soy Milk', 'Beverages', 'Fridge', current_date + 250, 4, false, null),  -- fresh
  ('609e83a3-ec8e-489d-865a-353e769d5659', 'BBQ Sauce', 'Condiments', 'Freezer', current_date + 8, 4, true, current_date - 1),  -- unsafe
  ('609e83a3-ec8e-489d-865a-353e769d5659', 'Popcorn', 'Snacks', 'Fridge', current_date - 1, 1, true, current_date - 2),  -- expired
  ('609e83a3-ec8e-489d-865a-353e769d5659', 'Leftover Stir Fry', 'Leftovers', 'Fridge', current_date - 2, 4, false, null),  -- soon
  ('609e83a3-ec8e-489d-865a-353e769d5659', 'Mozzarella', 'Dairy', 'Fridge', current_date + 55, 4, true, current_date - 2),  -- soon
  ('609e83a3-ec8e-489d-865a-353e769d5659', 'Barn-Laid Eggs', 'Eggs', 'Fridge', current_date - 7, 1, false, null),  -- expired
  ('609e83a3-ec8e-489d-865a-353e769d5659', 'Bacon', 'Meat', 'Freezer', current_date - 111, 4, true, current_date - 106),  -- fresh
  ('609e83a3-ec8e-489d-865a-353e769d5659', 'Mussels', 'Seafood', 'Freezer', current_date - 182, 1, false, null),  -- expired
  ('609e83a3-ec8e-489d-865a-353e769d5659', 'Broccoli', 'Produce', 'Fridge', current_date + 2, 3, false, null),  -- soon
  ('609e83a3-ec8e-489d-865a-353e769d5659', 'Wraps', 'Bakery', 'Pantry', current_date + 1, 3, false, null),  -- soon
  ('609e83a3-ec8e-489d-865a-353e769d5659', 'Frozen Fish Fingers', 'Frozen', 'Freezer', current_date + 120, 1, false, null),  -- fresh
  ('609e83a3-ec8e-489d-865a-353e769d5659', 'Sparkling Water', 'Beverages', 'Freezer', current_date + 50, 1, true, current_date - 5),  -- unsafe
  ('609e83a3-ec8e-489d-865a-353e769d5659', 'Chilli Sauce', 'Condiments', 'Pantry', current_date + 180, 4, false, null),  -- fresh
  ('609e83a3-ec8e-489d-865a-353e769d5659', 'Pretzels', 'Snacks', 'Freezer', current_date - 60, 1, true, current_date),  -- fresh
  ('609e83a3-ec8e-489d-865a-353e769d5659', 'Leftover Soup', 'Leftovers', 'Freezer', current_date - 80, 3, false, null),  -- fresh
  ('609e83a3-ec8e-489d-865a-353e769d5659', 'Butter', 'Dairy', 'Freezer', current_date - 30, 2, false, null),  -- fresh
  ('609e83a3-ec8e-489d-865a-353e769d5659', 'Egg Yolks', 'Eggs', 'Pantry', current_date + 44, 2, false, null),  -- fresh
  ('609e83a3-ec8e-489d-865a-353e769d5659', 'Lamb Chops', 'Meat', 'Fridge', current_date + 20, 1, true, current_date - 10),  -- fresh
  ('609e83a3-ec8e-489d-865a-353e769d5659', 'Cod Fillet', 'Seafood', 'Fridge', current_date + 10, 2, true, current_date - 5),  -- fresh
  ('609e83a3-ec8e-489d-865a-353e769d5659', 'Lettuce', 'Produce', 'Fridge', current_date + 45, 4, true, current_date - 5),  -- fresh
  ('609e83a3-ec8e-489d-865a-353e769d5659', 'English Muffins', 'Bakery', 'Fridge', current_date + 17, 1, true, current_date - 2),  -- fresh
  ('609e83a3-ec8e-489d-865a-353e769d5659', 'Frozen Corn', 'Frozen', 'Freezer', current_date + 120, 2, false, null),  -- fresh
  ('609e83a3-ec8e-489d-865a-353e769d5659', 'Iced Tea', 'Beverages', 'Pantry', current_date + 250, 3, false, null),  -- fresh
  ('609e83a3-ec8e-489d-865a-353e769d5659', 'Vegemite', 'Condiments', 'Pantry', current_date + 90, 3, false, null),  -- fresh
  ('609e83a3-ec8e-489d-865a-353e769d5659', 'Rice Cakes', 'Snacks', 'Pantry', current_date + 60, 3, false, null),  -- fresh
  ('609e83a3-ec8e-489d-865a-353e769d5659', 'Leftover Lasagne', 'Leftovers', 'Freezer', current_date - 80, 2, false, null),  -- fresh
  ('609e83a3-ec8e-489d-865a-353e769d5659', 'Cream Cheese', 'Dairy', 'Freezer', current_date - 46, 4, false, null),  -- fresh
  ('609e83a3-ec8e-489d-865a-353e769d5659', 'Pickled Eggs', 'Eggs', 'Fridge', current_date + 20, 3, false, null),  -- fresh
  ('609e83a3-ec8e-489d-865a-353e769d5659', 'Turkey Mince', 'Meat', 'Fridge', current_date + 20, 1, true, current_date),  -- fresh
  ('609e83a3-ec8e-489d-865a-353e769d5659', 'Smoked Salmon', 'Seafood', 'Fridge', current_date + 180, 1, true, current_date - 7),  -- fresh
  ('609e83a3-ec8e-489d-865a-353e769d5659', 'Capsicum', 'Produce', 'Fridge', current_date + 180, 2, false, null),  -- fresh
  ('609e83a3-ec8e-489d-865a-353e769d5659', 'Baguette', 'Bakery', 'Pantry', current_date - 10, 3, false, null),  -- expired
  ('609e83a3-ec8e-489d-865a-353e769d5659', 'Frozen Dumplings', 'Frozen', 'Freezer', current_date + 60, 2, false, null),  -- fresh
  ('609e83a3-ec8e-489d-865a-353e769d5659', 'Kombucha', 'Beverages', 'Fridge', current_date + 14, 2, false, null),  -- fresh
  ('609e83a3-ec8e-489d-865a-353e769d5659', 'Peanut Butter', 'Condiments', 'Fridge', current_date + 180, 2, false, null),  -- fresh
  ('609e83a3-ec8e-489d-865a-353e769d5659', 'Dried Fruit', 'Snacks', 'Fridge', current_date + 7, 3, true, current_date - 8),  -- soon
  ('609e83a3-ec8e-489d-865a-353e769d5659', 'Leftover Casserole', 'Leftovers', 'Freezer', current_date - 92, 3, false, null),  -- expired
  ('609e83a3-ec8e-489d-865a-353e769d5659', 'Sour Cream', 'Dairy', 'Fridge', current_date + 1, 1, false, null),  -- soon
  ('609e83a3-ec8e-489d-865a-353e769d5659', 'Free-Range Eggs', 'Eggs', 'Pantry', current_date + 24, 2, false, null),  -- fresh
  ('609e83a3-ec8e-489d-865a-353e769d5659', 'Sausages', 'Meat', 'Fridge', current_date + 45, 1, true, current_date - 2),  -- fresh
  ('609e83a3-ec8e-489d-865a-353e769d5659', 'Oysters', 'Seafood', 'Fridge', current_date + 20, 1, true, current_date - 9),  -- fresh
  ('609e83a3-ec8e-489d-865a-353e769d5659', 'Zucchini', 'Produce', 'Fridge', current_date + 14, 2, false, null),  -- fresh
  ('609e83a3-ec8e-489d-865a-353e769d5659', 'Sourdough Bread', 'Bakery', 'Pantry', current_date + 16, 2, true, current_date - 10),  -- fresh
  ('609e83a3-ec8e-489d-865a-353e769d5659', 'Frozen Waffles', 'Frozen', 'Freezer', current_date + 54, 1, true, current_date),  -- fresh
  ('609e83a3-ec8e-489d-865a-353e769d5659', 'Coconut Water', 'Beverages', 'Fridge', current_date + 45, 3, false, null),  -- fresh
  ('609e83a3-ec8e-489d-865a-353e769d5659', 'Jam', 'Condiments', 'Freezer', current_date - 4, 2, true, current_date - 1),  -- unsafe
  ('609e83a3-ec8e-489d-865a-353e769d5659', 'Nuts Mix', 'Snacks', 'Fridge', current_date + 14, 1, true, current_date),  -- fresh
  ('609e83a3-ec8e-489d-865a-353e769d5659', 'Leftover Pizza', 'Leftovers', 'Fridge', current_date - 9, 1, false, null),  -- expired
  ('609e83a3-ec8e-489d-865a-353e769d5659', 'Custard', 'Dairy', 'Fridge', current_date + 45, 3, true, current_date - 12),  -- expired
  ('609e83a3-ec8e-489d-865a-353e769d5659', 'Egg Whites Carton', 'Eggs', 'Pantry', current_date + 264, 2, false, null),  -- fresh
  ('609e83a3-ec8e-489d-865a-353e769d5659', 'Chicken Wings', 'Meat', 'Fridge', current_date + 3, 2, false, null),  -- soon
  ('609e83a3-ec8e-489d-865a-353e769d5659', 'Crab Meat', 'Seafood', 'Freezer', current_date - 120, 4, false, null),  -- fresh
  ('609e83a3-ec8e-489d-865a-353e769d5659', 'Potatoes', 'Produce', 'Pantry', current_date, 2, false, null),  -- soon
  ('609e83a3-ec8e-489d-865a-353e769d5659', 'Bagels', 'Bakery', 'Pantry', current_date + 14, 1, false, null),  -- fresh
  ('609e83a3-ec8e-489d-865a-353e769d5659', 'Frozen Mango', 'Frozen', 'Fridge', current_date + 26, 4, false, null),  -- unsafe
  ('609e83a3-ec8e-489d-865a-353e769d5659', 'Lemonade', 'Beverages', 'Fridge', current_date + 180, 4, false, null),  -- fresh
  ('609e83a3-ec8e-489d-865a-353e769d5659', 'Honey', 'Condiments', 'Fridge', current_date + 30, 1, false, null),  -- fresh
  ('609e83a3-ec8e-489d-865a-353e769d5659', 'Chocolate Bar', 'Snacks', 'Freezer', current_date - 135, 1, true, current_date - 7),  -- fresh
  ('609e83a3-ec8e-489d-865a-353e769d5659', 'Leftover Stew', 'Leftovers', 'Freezer', current_date - 30, 3, false, null),  -- fresh
  ('609e83a3-ec8e-489d-865a-353e769d5659', 'Cottage Cheese', 'Dairy', 'Pantry', current_date + 24, 3, true, current_date),  -- unsafe
  ('609e83a3-ec8e-489d-865a-353e769d5659', 'Duck Eggs', 'Eggs', 'Pantry', current_date + 9, 1, false, null),  -- expired
  ('609e83a3-ec8e-489d-865a-353e769d5659', 'Pork Belly', 'Meat', 'Fridge', current_date + 180, 1, false, null),  -- fresh
  ('609e83a3-ec8e-489d-865a-353e769d5659', 'Salmon Fillet', 'Seafood', 'Fridge', current_date + 45, 3, true, current_date - 9),  -- fresh
  ('609e83a3-ec8e-489d-865a-353e769d5659', 'Onions', 'Produce', 'Fridge', current_date - 2, 2, false, null),  -- expired
  ('609e83a3-ec8e-489d-865a-353e769d5659', 'Dinner Rolls', 'Bakery', 'Freezer', current_date - 92, 4, false, null),  -- expired
  ('609e83a3-ec8e-489d-865a-353e769d5659', 'Frozen Peas', 'Frozen', 'Freezer', current_date + 30, 1, false, null),  -- fresh
  ('609e83a3-ec8e-489d-865a-353e769d5659', 'Orange Juice', 'Beverages', 'Pantry', current_date - 2, 2, false, null),  -- expired
  ('609e83a3-ec8e-489d-865a-353e769d5659', 'Ketchup', 'Condiments', 'Pantry', current_date + 90, 2, false, null),  -- fresh
  ('609e83a3-ec8e-489d-865a-353e769d5659', 'Tortilla Chips', 'Snacks', 'Freezer', current_date - 120, 4, true, current_date - 4),  -- fresh
  ('609e83a3-ec8e-489d-865a-353e769d5659', 'Leftover Pasta', 'Leftovers', 'Fridge', current_date - 4, 4, false, null),  -- soon
  ('609e83a3-ec8e-489d-865a-353e769d5659', 'Parmesan', 'Dairy', 'Freezer', current_date - 67, 2, false, null),  -- expired
  ('609e83a3-ec8e-489d-865a-353e769d5659', 'Quail Eggs', 'Eggs', 'Pantry', current_date + 74, 3, false, null),  -- fresh
  ('609e83a3-ec8e-489d-865a-353e769d5659', 'Beef Mince', 'Meat', 'Fridge', current_date + 180, 3, true, current_date - 2),  -- fresh
  ('609e83a3-ec8e-489d-865a-353e769d5659', 'Prawns', 'Seafood', 'Fridge', current_date + 20, 1, false, null),  -- fresh
  ('609e83a3-ec8e-489d-865a-353e769d5659', 'Avocado', 'Produce', 'Fridge', current_date + 90, 4, true, current_date - 6),  -- fresh
  ('609e83a3-ec8e-489d-865a-353e769d5659', 'White Bread', 'Bakery', 'Pantry', current_date + 182, 3, true, current_date - 5),  -- fresh
  ('609e83a3-ec8e-489d-865a-353e769d5659', 'Frozen Berries', 'Frozen', 'Pantry', current_date + 42, 1, false, null),  -- unsafe
  ('609e83a3-ec8e-489d-865a-353e769d5659', 'Almond Milk', 'Beverages', 'Pantry', current_date + 45, 3, false, null),  -- fresh
  ('609e83a3-ec8e-489d-865a-353e769d5659', 'Mayonnaise', 'Condiments', 'Pantry', current_date + 74, 3, true, current_date),  -- fresh
  ('609e83a3-ec8e-489d-865a-353e769d5659', 'Trail Mix', 'Snacks', 'Fridge', current_date + 90, 1, false, null),  -- fresh
  ('609e83a3-ec8e-489d-865a-353e769d5659', 'Leftover Curry', 'Leftovers', 'Freezer', current_date - 70, 4, false, null),  -- fresh
  ('609e83a3-ec8e-489d-865a-353e769d5659', 'Whole Milk', 'Dairy', 'Freezer', current_date + 60, 2, true, current_date),  -- fresh
  ('609e83a3-ec8e-489d-865a-353e769d5659', 'Organic Eggs', 'Eggs', 'Fridge', current_date + 250, 4, false, null),  -- fresh
  ('609e83a3-ec8e-489d-865a-353e769d5659', 'Chicken Breast', 'Meat', 'Fridge', current_date + 90, 1, false, null);  -- fresh
