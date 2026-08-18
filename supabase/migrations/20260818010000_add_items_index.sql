-- Migration: composite index on items(user_id, expiry_date)
--
-- Why: every query this app runs filters by user_id and orders by
-- expiry_date (see useItems.fetchItems) — this is the one access pattern
-- that actually matters for this table's performance. See docs/decisions.md,
-- "Marking-alignment review" (18/8/26).
--
-- Run this in the Supabase SQL Editor after
-- 20260818000000_split_items_rls_policies.sql.

create index if not exists items_user_id_expiry_date_idx
  on items (user_id, expiry_date);
