-- Feedback Sprint seed data — realistic ~135-item household inventory
-- Seeded against the user's real account: 0b3816cf-2946-4363-9490-313fd82f865a
-- Generated 21/8/26 for the Feedback Sprint's "seed before building the real UI" step.
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
-- delete from items where user_id = '0b3816cf-2946-4363-9490-313fd82f865a';

insert into items (user_id, name, category, storage_location, expiry_date, quantity, is_opened, date_opened)
values
  ('0b3816cf-2946-4363-9490-313fd82f865a', 'Whole Milk', 'Dairy', 'Pantry', current_date + 52, 1, false, null),  -- unsafe
  ('0b3816cf-2946-4363-9490-313fd82f865a', 'Free-Range Eggs', 'Eggs', 'Fridge', current_date + 45, 2, false, null),  -- fresh
  ('0b3816cf-2946-4363-9490-313fd82f865a', 'Chicken Breast', 'Meat', 'Freezer', current_date - 150, 3, false, null),  -- fresh
  ('0b3816cf-2946-4363-9490-313fd82f865a', 'Salmon Fillet', 'Seafood', 'Fridge', current_date + 60, 2, true, current_date - 4),  -- fresh
  ('0b3816cf-2946-4363-9490-313fd82f865a', 'Spinach', 'Produce', 'Fridge', current_date + 14, 1, true, current_date - 9),  -- fresh
  ('0b3816cf-2946-4363-9490-313fd82f865a', 'Sourdough Bread', 'Bakery', 'Pantry', current_date + 47, 1, true, current_date - 2),  -- fresh
  ('0b3816cf-2946-4363-9490-313fd82f865a', 'Frozen Peas', 'Frozen', 'Freezer', current_date + 10, 4, false, null),  -- fresh
  ('0b3816cf-2946-4363-9490-313fd82f865a', 'Orange Juice', 'Beverages', 'Fridge', current_date + 10, 1, false, null),  -- fresh
  ('0b3816cf-2946-4363-9490-313fd82f865a', 'Ketchup', 'Condiments', 'Pantry', current_date + 61, 3, true, current_date - 13),  -- soon
  ('0b3816cf-2946-4363-9490-313fd82f865a', 'Tortilla Chips', 'Snacks', 'Fridge', current_date + 3, 2, false, null),  -- soon
  ('0b3816cf-2946-4363-9490-313fd82f865a', 'Leftover Pasta', 'Leftovers', 'Freezer', current_date - 91, 2, false, null),  -- expired
  ('0b3816cf-2946-4363-9490-313fd82f865a', 'Skim Milk', 'Dairy', 'Fridge', current_date + 20, 2, false, null),  -- fresh
  ('0b3816cf-2946-4363-9490-313fd82f865a', 'Egg Whites Carton', 'Eggs', 'Pantry', current_date + 104, 3, false, null),  -- fresh
  ('0b3816cf-2946-4363-9490-313fd82f865a', 'Chicken Thighs', 'Meat', 'Fridge', current_date + 20, 2, true, current_date),  -- fresh
  ('0b3816cf-2946-4363-9490-313fd82f865a', 'Prawns', 'Seafood', 'Fridge', current_date + 30, 1, true, current_date - 10),  -- fresh
  ('0b3816cf-2946-4363-9490-313fd82f865a', 'Carrots', 'Produce', 'Pantry', current_date + 2, 2, false, null),  -- soon
  ('0b3816cf-2946-4363-9490-313fd82f865a', 'Bagels', 'Bakery', 'Pantry', current_date + 180, 2, false, null),  -- fresh
  ('0b3816cf-2946-4363-9490-313fd82f865a', 'Frozen Berries', 'Frozen', 'Freezer', current_date + 47, 2, true, current_date - 7),  -- soon
  ('0b3816cf-2946-4363-9490-313fd82f865a', 'Almond Milk', 'Beverages', 'Fridge', current_date + 180, 3, false, null),  -- fresh
  ('0b3816cf-2946-4363-9490-313fd82f865a', 'Mayonnaise', 'Condiments', 'Freezer', current_date + 18, 1, false, null),  -- unsafe
  ('0b3816cf-2946-4363-9490-313fd82f865a', 'Trail Mix', 'Snacks', 'Freezer', current_date - 120, 2, false, null),  -- fresh
  ('0b3816cf-2946-4363-9490-313fd82f865a', 'Leftover Curry', 'Leftovers', 'Freezer', current_date - 70, 3, false, null),  -- fresh
  ('0b3816cf-2946-4363-9490-313fd82f865a', 'Greek Yoghurt', 'Dairy', 'Freezer', current_date - 40, 4, false, null),  -- fresh
  ('0b3816cf-2946-4363-9490-313fd82f865a', 'Duck Eggs', 'Eggs', 'Fridge', current_date + 60, 3, false, null),  -- fresh
  ('0b3816cf-2946-4363-9490-313fd82f865a', 'Ground Beef', 'Meat', 'Freezer', current_date - 90, 3, false, null),  -- fresh
  ('0b3816cf-2946-4363-9490-313fd82f865a', 'Tinned Tuna', 'Seafood', 'Freezer', current_date - 90, 2, false, null),  -- fresh
  ('0b3816cf-2946-4363-9490-313fd82f865a', 'Apples', 'Produce', 'Pantry', current_date + 14, 2, false, null),  -- fresh
  ('0b3816cf-2946-4363-9490-313fd82f865a', 'Dinner Rolls', 'Bakery', 'Fridge', current_date, 1, true, current_date - 6),  -- soon
  ('0b3816cf-2946-4363-9490-313fd82f865a', 'Ice Cream', 'Frozen', 'Freezer', current_date + 39, 3, true, current_date - 15),  -- expired
  ('0b3816cf-2946-4363-9490-313fd82f865a', 'Cold Brew Coffee', 'Beverages', 'Fridge', current_date + 20, 2, true, current_date - 17),  -- expired
  ('0b3816cf-2946-4363-9490-313fd82f865a', 'Soy Sauce', 'Condiments', 'Fridge', current_date + 60, 2, true, current_date - 30),  -- soon
  ('0b3816cf-2946-4363-9490-313fd82f865a', 'Crackers', 'Snacks', 'Fridge', current_date + 14, 1, false, null),  -- fresh
  ('0b3816cf-2946-4363-9490-313fd82f865a', 'Leftover Rice', 'Leftovers', 'Pantry', current_date + 38, 1, false, null),  -- unsafe
  ('0b3816cf-2946-4363-9490-313fd82f865a', 'Natural Yoghurt', 'Dairy', 'Freezer', current_date - 15, 3, false, null),  -- fresh
  ('0b3816cf-2946-4363-9490-313fd82f865a', 'Quail Eggs', 'Eggs', 'Fridge', current_date + 20, 3, false, null),  -- fresh
  ('0b3816cf-2946-4363-9490-313fd82f865a', 'Beef Steak', 'Meat', 'Fridge', current_date + 250, 3, true, current_date - 8),  -- fresh
  ('0b3816cf-2946-4363-9490-313fd82f865a', 'Barramundi Fillets', 'Seafood', 'Fridge', current_date + 2, 4, true, current_date - 4),  -- soon
  ('0b3816cf-2946-4363-9490-313fd82f865a', 'Bananas', 'Produce', 'Pantry', current_date + 20, 1, true, current_date - 5),  -- fresh
  ('0b3816cf-2946-4363-9490-313fd82f865a', 'White Bread', 'Bakery', 'Fridge', current_date + 2, 4, true, current_date - 10),  -- soon
  ('0b3816cf-2946-4363-9490-313fd82f865a', 'Frozen Pizza', 'Frozen', 'Freezer', current_date + 180, 4, false, null),  -- fresh
  ('0b3816cf-2946-4363-9490-313fd82f865a', 'Apple Juice', 'Beverages', 'Fridge', current_date + 37, 2, true, current_date),  -- soon
  ('0b3816cf-2946-4363-9490-313fd82f865a', 'Mustard', 'Condiments', 'Fridge', current_date + 58, 1, true, current_date - 32),  -- expired
  ('0b3816cf-2946-4363-9490-313fd82f865a', 'Muesli Bars', 'Snacks', 'Fridge', current_date + 120, 2, true, current_date - 8),  -- fresh
  ('0b3816cf-2946-4363-9490-313fd82f865a', 'Leftover Roast Chicken', 'Leftovers', 'Freezer', current_date - 70, 1, false, null),  -- fresh
  ('0b3816cf-2946-4363-9490-313fd82f865a', 'Cheddar Cheese', 'Dairy', 'Freezer', current_date - 15, 2, false, null),  -- fresh
  ('0b3816cf-2946-4363-9490-313fd82f865a', 'Organic Eggs', 'Eggs', 'Fridge', current_date + 30, 1, false, null),  -- fresh
  ('0b3816cf-2946-4363-9490-313fd82f865a', 'Pork Chops', 'Meat', 'Fridge', current_date + 45, 2, true, current_date),  -- fresh
  ('0b3816cf-2946-4363-9490-313fd82f865a', 'Squid', 'Seafood', 'Freezer', current_date - 97, 1, true, current_date - 92),  -- expired
  ('0b3816cf-2946-4363-9490-313fd82f865a', 'Tomatoes', 'Produce', 'Pantry', current_date + 180, 1, true, current_date - 9),  -- fresh
  ('0b3816cf-2946-4363-9490-313fd82f865a', 'Croissants', 'Bakery', 'Freezer', current_date - 70, 1, false, null),  -- fresh
  ('0b3816cf-2946-4363-9490-313fd82f865a', 'Frozen Chips', 'Frozen', 'Freezer', current_date + 120, 2, false, null),  -- fresh
  ('0b3816cf-2946-4363-9490-313fd82f865a', 'Soy Milk', 'Beverages', 'Fridge', current_date + 250, 4, false, null),  -- fresh
  ('0b3816cf-2946-4363-9490-313fd82f865a', 'BBQ Sauce', 'Condiments', 'Freezer', current_date + 8, 4, true, current_date - 1),  -- unsafe
  ('0b3816cf-2946-4363-9490-313fd82f865a', 'Popcorn', 'Snacks', 'Fridge', current_date - 1, 1, true, current_date - 2),  -- expired
  ('0b3816cf-2946-4363-9490-313fd82f865a', 'Leftover Stir Fry', 'Leftovers', 'Fridge', current_date - 2, 4, false, null),  -- soon
  ('0b3816cf-2946-4363-9490-313fd82f865a', 'Mozzarella', 'Dairy', 'Fridge', current_date + 55, 4, true, current_date - 2),  -- soon
  ('0b3816cf-2946-4363-9490-313fd82f865a', 'Barn-Laid Eggs', 'Eggs', 'Fridge', current_date - 7, 1, false, null),  -- expired
  ('0b3816cf-2946-4363-9490-313fd82f865a', 'Bacon', 'Meat', 'Freezer', current_date - 111, 4, true, current_date - 106),  -- fresh
  ('0b3816cf-2946-4363-9490-313fd82f865a', 'Mussels', 'Seafood', 'Freezer', current_date - 182, 1, false, null),  -- expired
  ('0b3816cf-2946-4363-9490-313fd82f865a', 'Broccoli', 'Produce', 'Fridge', current_date + 2, 3, false, null),  -- soon
  ('0b3816cf-2946-4363-9490-313fd82f865a', 'Wraps', 'Bakery', 'Pantry', current_date + 1, 3, false, null),  -- soon
  ('0b3816cf-2946-4363-9490-313fd82f865a', 'Frozen Fish Fingers', 'Frozen', 'Freezer', current_date + 120, 1, false, null),  -- fresh
  ('0b3816cf-2946-4363-9490-313fd82f865a', 'Sparkling Water', 'Beverages', 'Freezer', current_date + 50, 1, true, current_date - 5),  -- unsafe
  ('0b3816cf-2946-4363-9490-313fd82f865a', 'Chilli Sauce', 'Condiments', 'Pantry', current_date + 180, 4, false, null),  -- fresh
  ('0b3816cf-2946-4363-9490-313fd82f865a', 'Pretzels', 'Snacks', 'Freezer', current_date - 60, 1, true, current_date),  -- fresh
  ('0b3816cf-2946-4363-9490-313fd82f865a', 'Leftover Soup', 'Leftovers', 'Freezer', current_date - 80, 3, false, null),  -- fresh
  ('0b3816cf-2946-4363-9490-313fd82f865a', 'Butter', 'Dairy', 'Freezer', current_date - 30, 2, false, null),  -- fresh
  ('0b3816cf-2946-4363-9490-313fd82f865a', 'Egg Yolks', 'Eggs', 'Pantry', current_date + 44, 2, false, null),  -- fresh
  ('0b3816cf-2946-4363-9490-313fd82f865a', 'Lamb Chops', 'Meat', 'Fridge', current_date + 20, 1, true, current_date - 10),  -- fresh
  ('0b3816cf-2946-4363-9490-313fd82f865a', 'Cod Fillet', 'Seafood', 'Fridge', current_date + 10, 2, true, current_date - 5),  -- fresh
  ('0b3816cf-2946-4363-9490-313fd82f865a', 'Lettuce', 'Produce', 'Fridge', current_date + 45, 4, true, current_date - 5),  -- fresh
  ('0b3816cf-2946-4363-9490-313fd82f865a', 'English Muffins', 'Bakery', 'Fridge', current_date + 17, 1, true, current_date - 2),  -- fresh
  ('0b3816cf-2946-4363-9490-313fd82f865a', 'Frozen Corn', 'Frozen', 'Freezer', current_date + 120, 2, false, null),  -- fresh
  ('0b3816cf-2946-4363-9490-313fd82f865a', 'Iced Tea', 'Beverages', 'Pantry', current_date + 250, 3, false, null),  -- fresh
  ('0b3816cf-2946-4363-9490-313fd82f865a', 'Vegemite', 'Condiments', 'Pantry', current_date + 90, 3, false, null),  -- fresh
  ('0b3816cf-2946-4363-9490-313fd82f865a', 'Rice Cakes', 'Snacks', 'Pantry', current_date + 60, 3, false, null),  -- fresh
  ('0b3816cf-2946-4363-9490-313fd82f865a', 'Leftover Lasagne', 'Leftovers', 'Freezer', current_date - 80, 2, false, null),  -- fresh
  ('0b3816cf-2946-4363-9490-313fd82f865a', 'Cream Cheese', 'Dairy', 'Freezer', current_date - 46, 4, false, null),  -- fresh
  ('0b3816cf-2946-4363-9490-313fd82f865a', 'Pickled Eggs', 'Eggs', 'Fridge', current_date + 20, 3, false, null),  -- fresh
  ('0b3816cf-2946-4363-9490-313fd82f865a', 'Turkey Mince', 'Meat', 'Fridge', current_date + 20, 1, true, current_date),  -- fresh
  ('0b3816cf-2946-4363-9490-313fd82f865a', 'Smoked Salmon', 'Seafood', 'Fridge', current_date + 180, 1, true, current_date - 7),  -- fresh
  ('0b3816cf-2946-4363-9490-313fd82f865a', 'Capsicum', 'Produce', 'Fridge', current_date + 180, 2, false, null),  -- fresh
  ('0b3816cf-2946-4363-9490-313fd82f865a', 'Baguette', 'Bakery', 'Pantry', current_date - 10, 3, false, null),  -- expired
  ('0b3816cf-2946-4363-9490-313fd82f865a', 'Frozen Dumplings', 'Frozen', 'Freezer', current_date + 60, 2, false, null),  -- fresh
  ('0b3816cf-2946-4363-9490-313fd82f865a', 'Kombucha', 'Beverages', 'Fridge', current_date + 14, 2, false, null),  -- fresh
  ('0b3816cf-2946-4363-9490-313fd82f865a', 'Peanut Butter', 'Condiments', 'Fridge', current_date + 180, 2, false, null),  -- fresh
  ('0b3816cf-2946-4363-9490-313fd82f865a', 'Dried Fruit', 'Snacks', 'Fridge', current_date + 7, 3, true, current_date - 8),  -- soon
  ('0b3816cf-2946-4363-9490-313fd82f865a', 'Leftover Casserole', 'Leftovers', 'Freezer', current_date - 92, 3, false, null),  -- expired
  ('0b3816cf-2946-4363-9490-313fd82f865a', 'Sour Cream', 'Dairy', 'Fridge', current_date + 1, 1, false, null),  -- soon
  ('0b3816cf-2946-4363-9490-313fd82f865a', 'Free-Range Eggs', 'Eggs', 'Pantry', current_date + 24, 2, false, null),  -- fresh
  ('0b3816cf-2946-4363-9490-313fd82f865a', 'Sausages', 'Meat', 'Fridge', current_date + 45, 1, true, current_date - 2),  -- fresh
  ('0b3816cf-2946-4363-9490-313fd82f865a', 'Oysters', 'Seafood', 'Fridge', current_date + 20, 1, true, current_date - 9),  -- fresh
  ('0b3816cf-2946-4363-9490-313fd82f865a', 'Zucchini', 'Produce', 'Fridge', current_date + 14, 2, false, null),  -- fresh
  ('0b3816cf-2946-4363-9490-313fd82f865a', 'Sourdough Bread', 'Bakery', 'Pantry', current_date + 16, 2, true, current_date - 10),  -- fresh
  ('0b3816cf-2946-4363-9490-313fd82f865a', 'Frozen Waffles', 'Frozen', 'Freezer', current_date + 54, 1, true, current_date),  -- fresh
  ('0b3816cf-2946-4363-9490-313fd82f865a', 'Coconut Water', 'Beverages', 'Fridge', current_date + 45, 3, false, null),  -- fresh
  ('0b3816cf-2946-4363-9490-313fd82f865a', 'Jam', 'Condiments', 'Freezer', current_date - 4, 2, true, current_date - 1),  -- unsafe
  ('0b3816cf-2946-4363-9490-313fd82f865a', 'Nuts Mix', 'Snacks', 'Fridge', current_date + 14, 1, true, current_date),  -- fresh
  ('0b3816cf-2946-4363-9490-313fd82f865a', 'Leftover Pizza', 'Leftovers', 'Fridge', current_date - 9, 1, false, null),  -- expired
  ('0b3816cf-2946-4363-9490-313fd82f865a', 'Custard', 'Dairy', 'Fridge', current_date + 45, 3, true, current_date - 12),  -- expired
  ('0b3816cf-2946-4363-9490-313fd82f865a', 'Egg Whites Carton', 'Eggs', 'Pantry', current_date + 264, 2, false, null),  -- fresh
  ('0b3816cf-2946-4363-9490-313fd82f865a', 'Chicken Wings', 'Meat', 'Fridge', current_date + 3, 2, false, null),  -- soon
  ('0b3816cf-2946-4363-9490-313fd82f865a', 'Crab Meat', 'Seafood', 'Freezer', current_date - 120, 4, false, null),  -- fresh
  ('0b3816cf-2946-4363-9490-313fd82f865a', 'Potatoes', 'Produce', 'Pantry', current_date, 2, false, null),  -- soon
  ('0b3816cf-2946-4363-9490-313fd82f865a', 'Bagels', 'Bakery', 'Pantry', current_date + 14, 1, false, null),  -- fresh
  ('0b3816cf-2946-4363-9490-313fd82f865a', 'Frozen Mango', 'Frozen', 'Fridge', current_date + 26, 4, false, null),  -- unsafe
  ('0b3816cf-2946-4363-9490-313fd82f865a', 'Lemonade', 'Beverages', 'Fridge', current_date + 180, 4, false, null),  -- fresh
  ('0b3816cf-2946-4363-9490-313fd82f865a', 'Honey', 'Condiments', 'Fridge', current_date + 30, 1, false, null),  -- fresh
  ('0b3816cf-2946-4363-9490-313fd82f865a', 'Chocolate Bar', 'Snacks', 'Freezer', current_date - 135, 1, true, current_date - 7),  -- fresh
  ('0b3816cf-2946-4363-9490-313fd82f865a', 'Leftover Stew', 'Leftovers', 'Freezer', current_date - 30, 3, false, null),  -- fresh
  ('0b3816cf-2946-4363-9490-313fd82f865a', 'Cottage Cheese', 'Dairy', 'Pantry', current_date + 24, 3, true, current_date),  -- unsafe
  ('0b3816cf-2946-4363-9490-313fd82f865a', 'Duck Eggs', 'Eggs', 'Pantry', current_date + 9, 1, false, null),  -- expired
  ('0b3816cf-2946-4363-9490-313fd82f865a', 'Pork Belly', 'Meat', 'Fridge', current_date + 180, 1, false, null),  -- fresh
  ('0b3816cf-2946-4363-9490-313fd82f865a', 'Salmon Fillet', 'Seafood', 'Fridge', current_date + 45, 3, true, current_date - 9),  -- fresh
  ('0b3816cf-2946-4363-9490-313fd82f865a', 'Onions', 'Produce', 'Fridge', current_date - 2, 2, false, null),  -- expired
  ('0b3816cf-2946-4363-9490-313fd82f865a', 'Dinner Rolls', 'Bakery', 'Freezer', current_date - 92, 4, false, null),  -- expired
  ('0b3816cf-2946-4363-9490-313fd82f865a', 'Frozen Peas', 'Frozen', 'Freezer', current_date + 30, 1, false, null),  -- fresh
  ('0b3816cf-2946-4363-9490-313fd82f865a', 'Orange Juice', 'Beverages', 'Pantry', current_date - 2, 2, false, null),  -- expired
  ('0b3816cf-2946-4363-9490-313fd82f865a', 'Ketchup', 'Condiments', 'Pantry', current_date + 90, 2, false, null),  -- fresh
  ('0b3816cf-2946-4363-9490-313fd82f865a', 'Tortilla Chips', 'Snacks', 'Freezer', current_date - 120, 4, true, current_date - 4),  -- fresh
  ('0b3816cf-2946-4363-9490-313fd82f865a', 'Leftover Pasta', 'Leftovers', 'Fridge', current_date - 4, 4, false, null),  -- soon
  ('0b3816cf-2946-4363-9490-313fd82f865a', 'Parmesan', 'Dairy', 'Freezer', current_date - 67, 2, false, null),  -- expired
  ('0b3816cf-2946-4363-9490-313fd82f865a', 'Quail Eggs', 'Eggs', 'Pantry', current_date + 74, 3, false, null),  -- fresh
  ('0b3816cf-2946-4363-9490-313fd82f865a', 'Beef Mince', 'Meat', 'Fridge', current_date + 180, 3, true, current_date - 2),  -- fresh
  ('0b3816cf-2946-4363-9490-313fd82f865a', 'Prawns', 'Seafood', 'Fridge', current_date + 20, 1, false, null),  -- fresh
  ('0b3816cf-2946-4363-9490-313fd82f865a', 'Avocado', 'Produce', 'Fridge', current_date + 90, 4, true, current_date - 6),  -- fresh
  ('0b3816cf-2946-4363-9490-313fd82f865a', 'White Bread', 'Bakery', 'Pantry', current_date + 182, 3, true, current_date - 5),  -- fresh
  ('0b3816cf-2946-4363-9490-313fd82f865a', 'Frozen Berries', 'Frozen', 'Pantry', current_date + 42, 1, false, null),  -- unsafe
  ('0b3816cf-2946-4363-9490-313fd82f865a', 'Almond Milk', 'Beverages', 'Pantry', current_date + 45, 3, false, null),  -- fresh
  ('0b3816cf-2946-4363-9490-313fd82f865a', 'Mayonnaise', 'Condiments', 'Pantry', current_date + 74, 3, true, current_date),  -- fresh
  ('0b3816cf-2946-4363-9490-313fd82f865a', 'Trail Mix', 'Snacks', 'Fridge', current_date + 90, 1, false, null),  -- fresh
  ('0b3816cf-2946-4363-9490-313fd82f865a', 'Leftover Curry', 'Leftovers', 'Freezer', current_date - 70, 4, false, null),  -- fresh
  ('0b3816cf-2946-4363-9490-313fd82f865a', 'Whole Milk', 'Dairy', 'Freezer', current_date + 60, 2, true, current_date),  -- fresh
  ('0b3816cf-2946-4363-9490-313fd82f865a', 'Organic Eggs', 'Eggs', 'Fridge', current_date + 250, 4, false, null),  -- fresh
  ('0b3816cf-2946-4363-9490-313fd82f865a', 'Chicken Breast', 'Meat', 'Fridge', current_date + 90, 1, false, null);  -- fresh
