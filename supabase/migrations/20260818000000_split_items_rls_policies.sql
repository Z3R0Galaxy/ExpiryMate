-- Migration: split the single "for all" RLS policy on items into four
-- per-operation policies (select/insert/update/delete).
--
-- Why: functionally identical protection (still auth.uid() = user_id on every
-- row), but reads as a deliberate range of security features rather than one
-- broad rule — see docs/decisions.md, "Marking-alignment review" (18/8/26).
--
-- Run this in the Supabase SQL Editor after 20260601000000_add_item_fields.sql.

drop policy if exists "Users can manage their own items" on items;

create policy "Users can view their own items"
  on items for select
  using (auth.uid() = user_id);

create policy "Users can insert their own items"
  on items for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own items"
  on items for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete their own items"
  on items for delete
  using (auth.uid() = user_id);
