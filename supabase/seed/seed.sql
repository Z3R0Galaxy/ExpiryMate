-- Seed data for ExpiryMate — average Australian family
-- User: 0b3816cf-2946-4363-9490-313fd82f865a

insert into items (user_id, name, category, storage_location, expiry_date, quantity, is_opened, date_opened)
values
  ('0b3816cf-2946-4363-9490-313fd82f865a', 'Full Cream Milk',       'Dairy',      'Fridge',  current_date + 5,   2, true,  current_date - 2),
  ('0b3816cf-2946-4363-9490-313fd82f865a', 'Tasty Cheese Block',    'Dairy',      'Fridge',  current_date + 21,  1, true,  current_date - 4),
  ('0b3816cf-2946-4363-9490-313fd82f865a', 'Vanilla Yoghurt',       'Dairy',      'Fridge',  current_date + 8,   4, false, null),
  ('0b3816cf-2946-4363-9490-313fd82f865a', 'Chicken Thighs',        'Meat',       'Freezer', current_date + 60,  6, false, null),
  ('0b3816cf-2946-4363-9490-313fd82f865a', 'Beef Mince',            'Meat',       'Fridge',  current_date + 2,   1, false, null),
  ('0b3816cf-2946-4363-9490-313fd82f865a', 'Lamb Chops',            'Meat',       'Freezer', current_date + 45,  4, false, null),
  ('0b3816cf-2946-4363-9490-313fd82f865a', 'Barramundi Fillets',    'Seafood',    'Freezer', current_date + 30,  2, false, null),
  ('0b3816cf-2946-4363-9490-313fd82f865a', 'Iceberg Lettuce',       'Produce',    'Fridge',  current_date + 4,   1, true,  current_date - 1),
  ('0b3816cf-2946-4363-9490-313fd82f865a', 'Cherry Tomatoes',       'Produce',    'Fridge',  current_date + 6,   1, true,  current_date - 2),
  ('0b3816cf-2946-4363-9490-313fd82f865a', 'Broccoli',              'Produce',    'Fridge',  current_date + 3,   1, false, null),
  ('0b3816cf-2946-4363-9490-313fd82f865a', 'Woolworths White Bread','Bakery',     'Pantry',  current_date + 4,   1, true,  current_date - 1),
  ('0b3816cf-2946-4363-9490-313fd82f865a', 'Frozen Fish Fingers',   'Frozen',     'Freezer', current_date + 90,  1, false, null),
  ('0b3816cf-2946-4363-9490-313fd82f865a', 'Frozen Chips',          'Frozen',     'Freezer', current_date + 120, 2, false, null),
  ('0b3816cf-2946-4363-9490-313fd82f865a', 'Orange Juice',          'Beverages',  'Fridge',  current_date + 6,   1, true,  current_date - 3),
  ('0b3816cf-2946-4363-9490-313fd82f865a', 'Tomato Sauce',          'Condiments', 'Fridge',  current_date + 180, 1, true,  current_date - 30),
  ('0b3816cf-2946-4363-9490-313fd82f865a', 'Vegemite',              'Condiments', 'Pantry',  current_date + 365, 1, true,  current_date - 60),
  ('0b3816cf-2946-4363-9490-313fd82f865a', 'Tim Tams',              'Snacks',     'Pantry',  current_date + 30,  1, true,  current_date - 3),
  ('0b3816cf-2946-4363-9490-313fd82f865a', 'Shapes Crackers',       'Snacks',     'Pantry',  current_date + 60,  1, false, null),
  ('0b3816cf-2946-4363-9490-313fd82f865a', 'Leftover Bolognese',    'Leftovers',  'Fridge',  current_date + 2,   1, true,  current_date),
  ('0b3816cf-2946-4363-9490-313fd82f865a', 'Expired Sour Cream',    'Dairy',      'Fridge',  current_date - 2,   1, true,  current_date - 10);
-- ^ last row is intentionally expired to test the "expired" status badge
