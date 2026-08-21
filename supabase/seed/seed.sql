-- Seed data for ExpiryMate — average Australian family
-- User: 609e83a3-ec8e-489d-865a-353e769d5659
--
-- Corrected 21/8/26: this file originally targeted 0b3816cf-2946-4363-9490-313fd82f865a,
-- a different account of the user's than the one now used to sign into the app — the
-- rows this inserted have been sitting invisible (correctly hidden by RLS) ever since.
-- UUID corrected here to match; see docs/decisions.md, "Feedback Sprint seed account
-- mismatch" for how the already-inserted rows were fixed without re-running this file.

insert into items (user_id, name, category, storage_location, expiry_date, quantity, is_opened, date_opened)
values
  ('609e83a3-ec8e-489d-865a-353e769d5659', 'Full Cream Milk',       'Dairy',      'Fridge',  current_date + 5,   2, true,  current_date - 2),
  ('609e83a3-ec8e-489d-865a-353e769d5659', 'Tasty Cheese Block',    'Dairy',      'Fridge',  current_date + 21,  1, true,  current_date - 4),
  ('609e83a3-ec8e-489d-865a-353e769d5659', 'Vanilla Yoghurt',       'Dairy',      'Fridge',  current_date + 8,   4, false, null),
  ('609e83a3-ec8e-489d-865a-353e769d5659', 'Chicken Thighs',        'Meat',       'Freezer', current_date + 60,  6, false, null),
  ('609e83a3-ec8e-489d-865a-353e769d5659', 'Beef Mince',            'Meat',       'Fridge',  current_date + 2,   1, false, null),
  ('609e83a3-ec8e-489d-865a-353e769d5659', 'Lamb Chops',            'Meat',       'Freezer', current_date + 45,  4, false, null),
  ('609e83a3-ec8e-489d-865a-353e769d5659', 'Barramundi Fillets',    'Seafood',    'Freezer', current_date + 30,  2, false, null),
  ('609e83a3-ec8e-489d-865a-353e769d5659', 'Iceberg Lettuce',       'Produce',    'Fridge',  current_date + 4,   1, true,  current_date - 1),
  ('609e83a3-ec8e-489d-865a-353e769d5659', 'Cherry Tomatoes',       'Produce',    'Fridge',  current_date + 6,   1, true,  current_date - 2),
  ('609e83a3-ec8e-489d-865a-353e769d5659', 'Broccoli',              'Produce',    'Fridge',  current_date + 3,   1, false, null),
  ('609e83a3-ec8e-489d-865a-353e769d5659', 'Woolworths White Bread','Bakery',     'Pantry',  current_date + 4,   1, true,  current_date - 1),
  ('609e83a3-ec8e-489d-865a-353e769d5659', 'Frozen Fish Fingers',   'Frozen',     'Freezer', current_date + 90,  1, false, null),
  ('609e83a3-ec8e-489d-865a-353e769d5659', 'Frozen Chips',          'Frozen',     'Freezer', current_date + 120, 2, false, null),
  ('609e83a3-ec8e-489d-865a-353e769d5659', 'Orange Juice',          'Beverages',  'Fridge',  current_date + 6,   1, true,  current_date - 3),
  ('609e83a3-ec8e-489d-865a-353e769d5659', 'Tomato Sauce',          'Condiments', 'Fridge',  current_date + 180, 1, true,  current_date - 30),
  ('609e83a3-ec8e-489d-865a-353e769d5659', 'Vegemite',              'Condiments', 'Pantry',  current_date + 365, 1, true,  current_date - 60),
  ('609e83a3-ec8e-489d-865a-353e769d5659', 'Tim Tams',              'Snacks',     'Pantry',  current_date + 30,  1, true,  current_date - 3),
  ('609e83a3-ec8e-489d-865a-353e769d5659', 'Shapes Crackers',       'Snacks',     'Pantry',  current_date + 60,  1, false, null),
  ('609e83a3-ec8e-489d-865a-353e769d5659', 'Leftover Bolognese',    'Leftovers',  'Fridge',  current_date + 2,   1, true,  current_date),
  ('609e83a3-ec8e-489d-865a-353e769d5659', 'Expired Sour Cream',    'Dairy',      'Fridge',  current_date - 2,   1, true,  current_date - 10);
-- ^ last row is intentionally expired to test the "expired" status badge
