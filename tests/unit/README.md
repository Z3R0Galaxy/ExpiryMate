# Unit tests

Pure logic, no I/O. Run with `npm test` (or `npm run test:watch`). Vitest, Node environment, no DOM and no database.

| File | Covers |
|---|---|
| `adjustedExpiry.test.ts` | The adjusted-expiry algorithm across all 72 combinations of 12 categories, 3 storage locations and opened/unopened; the Fresh/Expiring soon/Expired thresholds and the day-0 boundary; that every unsafe message names a storage location; and `todayLocal` |
| `itemStatus.test.ts` | `weeksNote`'s hard 7-day threshold and floor behaviour, and `computeStatusInfo`'s status, countdown and label |
| `validateItem.test.ts` | `validateItemForm`'s name, date and quantity rules, and `checkStorageSafety`'s blocking of unsafe combinations |
| `guessCategory.test.ts` | Keyword matching, rule priority, whole-word matching, and plurals |
| `dashboardStats.test.ts` | `sortByUrgency`, `buildNeedsAttention`, the count helpers, `filterByStatus` and `statusPanelTitle` |

Two things worth knowing about how these are written.

The algorithm's 72 expected results in `adjustedExpiry.test.ts` are transcribed by hand from the rule tables in `docs/decisions.md` and `docs/02-requirements.md`, not derived from the implementation. That is deliberate: a test generated from the code under test only proves the code is self-consistent. Written this way, the suite fails if the code and the documented rules ever disagree.

Several tests set `process.env.TZ = 'Australia/Sydney'` at the top of the file, above the imports, and use `vi.setSystemTime` to sit inside the 00:00 to 10:00 window where the local date and the UTC date differ. Both of the timezone bugs this project has hit live in exactly that window, so a suite running in UTC would pass while the bug was still present. The tests marked "regression (sweep finding 1)" and the Feedback Sprint 2 one fail against the code as it was before each fix.
