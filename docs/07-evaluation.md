# Evaluation

This document is the evaluation report referenced in the Part B write-up. It records how the app was evaluated, what came back, and what changed as a result.

## Evaluation plan

**Who:** informal user acceptance testing with household members (the actual target user of a food-expiry tracker), a structured UX review from the class teacher, and self-testing against the requirements in `02-requirements.md`.

**What was evaluated:**

- Functional correctness: can a user sign up, add an item with all required fields, see the correct status, edit an item, delete an item, and have it persist per-user with no cross-user leakage?
- Adjusted expiry logic: does `getAdjustedExpiry` produce dates matching the rules in `decisions.md` across every category and storage location, including the unsafe combinations?
- Usability: can someone unfamiliar with the app add and track a real item without instruction, and where do they hesitate?
- Notifications: does the browser notification fire for items within the 7-day threshold without being spammy?

**How results were recorded:** each session gets an entry in `09-iteration-log.md` recording what was tested, what feedback came back, and what changed. This file summarises the outcome rather than repeating the log.

## What was actually done

**Teacher UX review (21/8/26).** The single most consequential piece of feedback. It found that a flat card list would not scale to a realistic inventory of around one hundred items, that the landing page should be a summary rather than the full list, that navigation should let a user jump to a specific storage place, and that a card and list view toggle was needed. This triggered the Feedback Sprint, which rebuilt the app around a dashboard, added per-place dashboards and a persistent sidebar, and replaced the grouped card sections with one flat urgency-sorted list. Recorded in `10-feedback-sprint.md`.

**Four rounds of user feedback (21/8 to 24/8/26).** The Feedback Sprint's eight UI passes plus Feedback Sprints 2, 3 and 4. These produced, among other changes: blocking unsafe saves outright rather than warning and allowing them; a Fresh count that had been computed but never shown; two-factor authentication; a first-run tour; showing weeks alongside days on longer countdowns; and making list view the default. Several changes were built, shown, and then reverted at the user's request, which is itself recorded rather than quietly dropped.

**Seed data for realistic testing (21/8/26).** A 135-item database seed was generated so the dashboard could be evaluated at a realistic scale rather than with three test rows. Building it used a two-way check, inverting each target status into item fields and then running the real algorithm forward to confirm the result. That process caught four generator bugs before the seed was finalised.

**Repository sweep (27/8/26).** A full review of all 38 source files, 8 migrations and 12 documents. The full write-up is in the sweep report. Findings, and what happened to each:

| Finding | Severity | Outcome |
|---|---|---|
| Countdown anchored on the UTC date, so status was one day wrong between 00:00 and 10:00 local time | High | Fixed. An item that expired yesterday was showing as "Expiring soon" every morning |
| The `date_opened` database constraint used the server's UTC date while the client used the local date, so marking an item opened "today" was rejected each morning | High | Fixed by migration |
| The category guesser failed on plurals: 28 of 29 singular keywords missed | Medium | Fixed |
| The About page described a rule the app does not implement | Medium | Rewritten |
| `ExpiryBanner` and `formatNameList` were dead code, still bundled | Low | Retired |
| No automated tests existed despite `08-test-plan.md` calling for them | Low | 161 unit tests added |
| The onboarding tour showed four steps while the counter said five | Low | Fixed |
| Ring-chart arcs were not keyboard reachable and two custom controls had no focus style | Low | Focus styles added; arcs left pointer-only, since the legend already provides the keyboard path |
| A single 582 kB JavaScript bundle | Low | Split into app code plus three vendor chunks |
| Documentation drift across most of `docs/`, `README.md` and `CLAUDE.md` | Low | Corrected |

## Findings

**The algorithm is correct.** All 72 combinations of category, storage location and opened status match the documented rules exactly, verified twice: once by hand during Slice 3 across 11 representative cases, and once exhaustively in the 27/8/26 sweep. It is the part of the app with the largest rule surface and it has held up.

**Data isolation holds.** Row-level security was verified against a clean database with two accounts, including the mutation paths that are easy to forget: user B's `UPDATE` and `DELETE` both affect zero of user A's rows, and inserting a row owned by another user is refused. It also held under a real mistake during development, when a seed was written against the wrong account UUID and RLS correctly hid every row.

**The interface improved most through outside eyes.** Almost every substantial UI decision in this project came from someone else using it, not from self-testing. The dashboard, the sidebar, the flat urgency sort, blocking unsafe saves, and the weeks-alongside-days countdown were all external feedback. Self-testing found bugs; other people found the design problems.

**The weakest area was verification, not implementation.** For most of the project the standard was "`tsc` and `eslint` pass, and it looks right in the browser". That is enough to catch a crash and not enough to catch a wrong answer. Both high-severity bugs in the sweep were of the second kind: the code compiled, linted, and looked completely normal, and produced a wrong status for the first ten hours of every day. Neither would have survived a test suite, and one of them was a bug the project had already found and fixed once in a different file without checking whether the same mistake existed elsewhere.

## What would come next

Automating the integration layer, so the RLS and migration checks run on every change rather than by hand. Adding the password reset flow, which is currently absent, so a user who forgets their password can recover the account. A real display-name field, since the name shown throughout the UI is currently derived from the email address as a stand-in. Then the two deferred nice-to-haves, recipe suggestions and household sharing, in that order.
