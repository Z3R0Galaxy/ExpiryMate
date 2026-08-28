-- Widens the date_opened check so a user in a timezone ahead of UTC can
-- record "today" without the database refusing the row.
--
-- Context: 20260601000000_add_item_fields.sql added the column with
--   check (date_opened <= current_date)
-- `current_date` is evaluated in the SERVER's timezone, which is UTC on
-- Supabase, while the app validates against the BROWSER's local calendar
-- date (todayLocal(), src/lib/adjustedExpiry.ts). For any timezone ahead
-- of UTC those two disagree for the first hours of every day: in
-- Australia/Sydney (UTC+10), between 00:00 and 10:00 local the server's
-- current_date is still yesterday. Marking an item opened "today" during
-- that window passed client validation and was then rejected by Postgres,
-- surfacing a raw constraint violation to the user. Confirmed against a
-- real Postgres instance during the 27/8/26 sweep (finding 2).
--
-- One day of tolerance covers every timezone ahead of UTC (the largest
-- real offset is UTC+14) while still rejecting a genuinely nonsensical
-- future date, which is what this constraint is actually for. The client
-- remains the precise check; this stays the backstop.
--
-- The constraint is also given an explicit name. The original was the
-- auto-generated `items_date_opened_check`, which is harder to reference
-- deliberately in a later migration.

alter table items drop constraint if exists items_date_opened_check;

alter table items
  add constraint items_date_opened_not_future
    check (date_opened is null or date_opened <= current_date + 1);
