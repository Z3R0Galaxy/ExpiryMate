# Evaluation

This document is the evaluation report referenced in the Part B write-up. It's intentionally light right now — genuine evaluation needs a working app to evaluate, and Slice 1 (App Shell) isn't done yet. This file defines how evaluation will be carried out so it's ready to fill in as soon as there's something usable to test, rather than being backfilled at the end.

## Evaluation plan

**Who:** informal user acceptance testing with household members (the actual target user of a food-expiry tracker), plus self-testing against the requirements in `02-requirements.md`.

**What's being evaluated:**
- Functional correctness: can a user sign up, add an item with all required fields, see the correct status badge, edit an item, delete an item, and have it persist correctly per-user (no cross-user leakage)?
- Adjusted expiry logic: does `getAdjustedExpiry` (once built in Slice 3) produce dates that match the rules in `decisions.md` for a representative sample across categories and storage locations, including the unsafe-combination warnings?
- Usability: can someone unfamiliar with the app add and track a real item without instruction? Where do they hesitate or make mistakes?
- Notifications: once Slice 5 lands, does the browser notification actually fire for items within the 7-day threshold, and is it not spammy (e.g. firing repeatedly on every page load)?

**How results will be recorded:** each testing session gets an entry in `09-iteration-log.md` (what was tested, what feedback came back, what changed as a result), and this file will be updated with a summary once there's a meaningful body of testing to summarise — not a running log itself.

## Status

No formal evaluation has been carried out yet, because the app isn't wired together end-to-end (see `06-front-end-architecture.md`, Slice 1). This section will be replaced with actual findings once Slices 1–3 are complete and there's a usable app to put in front of a test user.
