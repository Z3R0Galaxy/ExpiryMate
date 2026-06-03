-- Migration: add category, storage_location, quantity, is_opened, date_opened to items
-- Run this in the Supabase SQL editor after the initial 20260507000000_create_items.sql migration.

-- Enums
create type food_category as enum (
  'Dairy',
  'Meat',
  'Seafood',
  'Produce',
  'Bakery',
  'Frozen',
  'Beverages',
  'Condiments',
  'Snacks',
  'Leftovers'
);

create type storage_location as enum (
  'Fridge',
  'Freezer',
  'Pantry'
);

-- New columns
alter table items
  add column category       food_category    not null default 'Produce',
  add column storage_location storage_location not null default 'Fridge',
  add column quantity       integer          not null default 1
                              check (quantity between 1 and 999),
  add column is_opened      boolean          not null default false,
  add column date_opened    date             check (date_opened <= current_date);

-- Constraint: date_opened required when is_opened = true
alter table items
  add constraint date_opened_required_when_opened
    check (is_opened = false or date_opened is not null);

-- Remove the defaults now that existing rows are backfilled
-- (optional — remove if you want defaults to persist for new inserts)
-- alter table items alter column category drop default;
-- alter table items alter column storage_location drop default;
