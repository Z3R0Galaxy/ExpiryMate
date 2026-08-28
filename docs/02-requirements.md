# Requirements

Every requirement below describes behaviour that is built and present in the app, unless it appears under "Out of Scope". Requirements are grouped by theme within each priority band.

Provenance: the original Must Have set was written before Slice 1 (see `01-problem-statement.md`). The remainder were added or revised across Slices 2 to 6 and Feedback Sprints 1 to 4; where a requirement replaced an earlier one, the change and its reasoning are recorded in `decisions.md` and `ai-use-log.md`.

## In Scope

### Must Have

#### Accounts and security

- The system must allow users to create an account and log in using an email address and password.

- The system must require a new account to be confirmed by email before it can be used, and the confirmation link must point at wherever the app is actually running rather than a fixed configured address. The confirmation requirement itself is a Supabase project setting rather than application code; the redirect behaviour is in the sign-up call.

- The system must present authentication failures in plain language the user can act on, including the case where a sign-up was rejected before the account was created. An unrecognised error must be passed through unchanged rather than replaced with a generic message, so a new failure stays diagnosable.

- The system must let the user reveal the password they have typed before submitting it, on both sign-in and sign-up.

- The system must offer optional two-factor authentication using a time-based one-time password from an authenticator app, enabled and disabled from the user's own profile page. Both enabling and disabling must require a freshly entered valid code, so a signed-in session alone cannot switch the protection off.

- Where an account has a verified second factor, the system must require a valid code after password sign-in before granting access to the app.

- The system must provide a profile page showing the account's display name, initials, email address and the date the account was created.

- The system must ensure that each user can only view and manage their own items. This is enforced at the database with four separate row-level security policies, one each for select, insert, update and delete, every one of them checking that the row's owner matches the authenticated user.

#### Items and data entry

- The system must allow users to input and track food items, including the item name, food category, printed expiry date, quantity, and storage location (Fridge, Freezer, or Pantry).

- The system must offer twelve food categories: Dairy, Eggs, Meat, Seafood, Produce, Bakery, Frozen, Microwave Meals, Beverages, Condiments, Snacks, and Leftovers.

- The system must allow users to specify whether a food item is opened or unopened. If the item is opened, the user must be able to record the date it was opened, either at the time of adding the item or at a later date by editing it.

- The system must present the opened question and its checkbox as a single row, reveal the date-opened field only once the item is marked opened, and clear that date if the item is marked unopened again.

- The system must require quantity to be a whole number between 1 and 999. This is validated in the form for a readable message, and enforced by a database constraint as the actual backstop.

- The system must reject a date opened that is in the future, compared against the user's own local calendar date rather than a UTC date.

- The system must relabel the date field to "Date prepared" when the category is Leftovers, since homemade food has no printed label to read a date from, and must cap that date at today because a meal cannot be prepared in the future.

- The system must default the date field on the add-item form to today's date, while leaving every part of it editable. The edit form must instead default to the item's existing date.

- The system must suggest a food category from the item's name as the user types, using a local keyword match rather than an AI or network call. The suggestion must stop overriding the category once the user has chosen one themselves.

- The system must allow users to add, edit, and delete items from their inventory.

- The system must require a confirmation step before deleting an item, naming the item in the confirmation, and must show the user an error if the deletion fails rather than failing silently.

- The system must show a distinct icon for each food category, on the item card, in the list, and in the item's detail view.

#### Adjusted expiry date algorithm

- The system must calculate an adjusted expiry date for each item based on its food category, storage location, opened status, and date opened, using a predefined set of category-specific rules sourced from USDA food safety guidelines (FoodSafety.gov Cold Food Storage Chart, last reviewed September 2023).

- The adjusted date must be calculated at runtime and never stored, so that the printed expiry date the user entered is always retained and both values remain visible.

- Where a freezer rule is written against a date of freezing, and no separate date-frozen field exists, the calculation must anchor on the date opened when the item is opened, and on the printed date when it is not.

- The full rule set is as follows. "Printed" means the printed expiry date as entered, or the date prepared for Leftovers. "Opened" means the date opened.

| Category | Fridge, unopened | Fridge, opened | Freezer, unopened | Freezer, opened | Pantry, unopened | Pantry, opened |
|---|---|---|---|---|---|---|
| Dairy | Printed | Earlier of printed or opened + 7 | Printed + 60 | Opened + 30 | Unsafe | Unsafe |
| Eggs | Printed | Opened + 4 | Unsafe | Unsafe | Printed - 14 | Unsafe |
| Meat | Printed | Printed | Printed + 270 | Opened + 120 | Unsafe | Unsafe |
| Seafood | Printed | Printed | Printed + 180 | Opened + 90 | Unsafe | Unsafe |
| Produce | Printed | Printed | Printed + 180 | Printed + 180 | Printed | Printed |
| Bakery | Printed + 3 | Printed + 3 | Printed + 90 | Opened + 90 | Printed | Printed - 2 |
| Frozen | Unsafe | Unsafe | Printed | Earlier of printed or opened + 14 | Unsafe | Unsafe |
| Microwave Meals | Unsafe | Opened + 3 | Printed | Unsafe | Unsafe | Unsafe |
| Beverages | Printed | Opened + 7 | Not recommended | Not recommended | Printed | Opened + 3 |
| Condiments | Printed | Opened + 30 | Not recommended | Not recommended | Printed | Opened + 14 |
| Snacks | Printed | Printed | Printed + 180 | Printed + 180 | Printed | Printed - 30 |
| Leftovers | Printed + 4 | Printed + 4 | Printed + 90 | Printed + 90 | Unsafe | Unsafe |

Notes on the table: Meat and Seafood apply fridge rules regardless of whether the item has been opened, since refrigeration limits are the same either way. Snacks reuse the algorithm's Dry Goods rules, as the closest match. Eggs cannot be safely frozen in the shell, which is why every Freezer cell is unsafe. Microwave Meals must stay frozen while sealed and move to the fridge once opened, so the safe cells are the opposite way round to Frozen. "Not recommended" is a distinct wording from "Unsafe" but is handled by the same mechanism.

- Where a combination of storage location and food category is considered unsafe (e.g. raw meat stored in the pantry), the system must not calculate an adjusted date. Originally this meant showing the user a warning and still allowing the item to be saved; revised in Feedback Sprint 2 (22/8/26) to instead block the save outright, telling the user where the item actually belongs, since letting an unsafe combination through with only a warning didn't stop the underlying food-safety problem it was meant to flag. See `decisions.md`, "Feedback Sprint 2."

- The save must be blocked identically whether the user is adding a new item or editing an existing one, and the message shown must name the storage location the item actually belongs in rather than being generic.

#### Status and countdown

- The system must calculate the number of days remaining until each item's adjusted expiry date and display a status accordingly: "Fresh" if more than 7 days remain, "Expiring Soon" if between 0 and 7 days remain, and "Expired" if the date has passed. An item with exactly 0 days remaining reads as Expiring Soon, not Expired.

- Both the status and the days-remaining count must derive from the adjusted expiry date, never from the printed date.

- Where a countdown has reached a full seven days or more, the system must also show the equivalent in whole weeks alongside the days, so the reader does not have to divide by seven themselves. Days remain the primary unit. Seven days is a hard threshold with no rounding up: a six-day item shows no weeks note, a seven-day item shows one week. The spelled-out form is used in detail views and the abbreviated form in the table, where the column stays visible on mobile.

#### Dashboard

- The system must open on a summary dashboard rather than the full item list, so that a realistic inventory of around one hundred items does not present as an unscannable wall of cards.

- The dashboard must show four counts: total items, Fresh, Expiring soon, and Expired. Each must be clickable, and clicking one must expand that status's full list in place rather than navigating away from the dashboard.

- The dashboard must show a status-breakdown ring chart. Segments with a count of zero must not be drawn, the centre must show the real total rather than a percentage, and clicking a segment must do the same thing as clicking the matching count. Each status is reachable by keyboard through the chart's legend rows; the ring arcs themselves are pointer-only.

- Selecting one of the three status counts must highlight the matching segment of the ring chart, and a live hover must take precedence over that selection. The Total count has no matching segment, so selecting it leaves the ring showing its plain total.

- The system must show item counts across the three storage locations as a bar chart rather than a second ring chart, since comparing magnitudes across a few categories is a bar chart's job. Clicking a bar must navigate to that location's own dashboard.

- The dashboard must show a "needs attention" list of the actual items that need a look, named individually rather than only counted. Fresh items must be excluded. The order must be unsafe items first, then expiring-soon items with the fewest days left first, then expired items with the most recently expired first. The list must not be truncated at any count. On desktop it scrolls within its own panel so the link to the full list stays in view; below 900px the panel grows to fit and the page scrolls instead.

- The system must provide a separate scoped dashboard for each storage location, reached from the sidebar or from the bar chart, showing that location's own counts and its own needs-attention list, with a deliberate step to view the full list of that location's items.

#### Item list

- The system must offer both a card view and a table view of items, with the table view loading first.

- The system must allow items to be searched by name.

- The system must allow items to be filtered independently by storage location, by category, and by status, where the status filter also offers a combined "Needs attention (not fresh)" option.

- On phone-width screens the three filters must collapse behind a single disclosure control showing how many filters are currently active, while the search box stays visible at all times.

- The item list must be a single flat list ordered by urgency: unsafe items pinned to the front as a food-safety alert, then everything else ascending by days remaining. This replaces the earlier group-by-location and group-by-status sections; the dashboard now provides the summary those sections were doing.

- On phone-width screens the table must show only name, days left, and status, hiding the remaining columns.

- Clicking or keyboard-activating any item card, table row, or needs-attention row must open the same shared detail view, with the same editing and deletion behaviour in every case.

#### Notifications

- The system must notify users when an item is within 7 days of its adjusted expiry date.

- This must be delivered as exactly one batched browser notification per page load, covering expiring-soon and expired items together, requesting permission if it has not been granted and failing quietly if it is refused. Unsafe items are excluded, since they have no adjusted date to be within seven days of and are already surfaced at the top of the dashboard.

- The system must show the current browser notification permission on the profile page, stating whether notifications are on, off, blocked, or unavailable in this browser, and must offer a control to turn them on where the browser will still accept the request. Where permission has already been granted it must offer a way to send a test notification; where it has been denied it must explain that the change has to be made in the browser's own site settings rather than offering a control that cannot work.

#### Interface, navigation and accessibility

- The system must provide a persistent sidebar with five destinations: the dashboard, each of the three storage locations, and all items. It must indicate which destination is current, must be collapsible to icons only with that choice remembered between visits, and must become a horizontal icon bar on screens narrower than 900px.

- The system must offer a light and dark theme, remembered between visits. Inside the app the choice must be made from the profile page's Appearance section, as a two-option control that shows which theme is currently active rather than only the one that pressing it would give; the sign-in screen, which has no profile page to reach, keeps a single toggle button. A first-time visitor with no stored preference must get the dark theme. The chosen theme must be applied before the first paint so there is no flash of the wrong theme on load.

- The system must provide a profile page, reached from the sidebar's profile block, showing the account's derived name, email, and join date, along with a summary of its current two-factor and theme state. It must gather the app's settings in one place: appearance, notifications, two-factor authentication, and account-level actions.

- The profile page must offer a way to replay the first-run guided tour. Because several of the tour's steps point at elements that only exist on the dashboard, replaying it must return to the dashboard first rather than showing a silently shortened tour.

- The profile page must offer a sign-out control alongside the sidebar's own.

- The system must place the add-item action in a fixed button that stays reachable from every view, and must reveal its label on hover and on keyboard focus alike.

- The system must show a first-run guided tour covering the sidebar, the dashboard counts, the add button, the profile block, and the logo. It must be shown once per account rather than once per browser, so it follows the user rather than the device, and must be skippable at any step. A step whose target is not on screen must be skipped rather than stranding the tour, and the step counter must count only the steps that can actually be shown, so that a new account whose dashboard has no counts yet is not told it is on "step 2 of 5" of a tour with four steps.

- The system must provide an About page, reached from the app's logo, explaining what the app does and explaining in plain language the one case where it refuses a save.

- The system must label the current page with a single plain-language title and offer one control that returns to the dashboard, rather than a multi-level breadcrumb trail.

- Detail and add-item views must open as a modal that can be dismissed by its close control, by clicking outside it, or by pressing Escape, must lock the page behind it while open, and must animate out from the element that was clicked.

- The system must define a visible keyboard focus indicator for form controls, buttons, links and table rows, and must never suppress the browser's own focus ring, so that custom focusable elements such as the chart legend rows still show one.

- Every icon-only control must carry a text label for assistive technology, including when a control collapses to icon-only.

- Item cards, table rows, needs-attention rows, chart legend rows and bar-chart bars must be operable by keyboard as well as by pointer.

- The layout must adapt at two breakpoints, 900px and 560px, so that the app remains usable from phone width to desktop. Numerals must be tabular so that figures in the counts, countdowns and table columns align in their columns.

### Nice to Have

- The system should generate recipe suggestions based on ingredients that are close to expiring, using an integrated AI. Deferred rather than dropped: this needs a real language-model API call, with the cost, latency and failure mode that brings. See `decisions.md`, "Slice 6 scope."

- The system should support multi-user household sharing, allowing members of the same household to view and manage a shared pantry. Deferred rather than dropped: this needs a data-model and row-level-security change to allow controlled access to another user's rows. See `decisions.md`, "Slice 6 scope."

- The system should send a daily email digest of items needing attention. Not built: this needs an external email provider's API key and a scheduled trigger, neither of which was available in the build window. Recorded as a stated scope decision rather than an oversight. See `decisions.md`, "Slice 5."

## Out of Scope

### Deliberately excluded

- Barcode/QR code scanning (items must be added manually; no automatic product lookup from barcodes.)
- Nutritional information (no tracking of calories, macros, or dietary data for items.)
- Image recognition (items cannot be identified or added via photos.)
- A by-category chart. Twelve categories is too many segments for a ring chart to stay legible, and the bar chart already covers the comparison that matters.
- A historical trend chart. The app holds no time-series data to plot.
- Export of the needs-attention list. Scrolling was the mechanism actually asked for.

### Known gaps

These are absent rather than excluded, and would be the natural next additions.

- Password reset. There is currently no forgot-password flow, so a user who loses their password cannot recover the account from within the app.
- A real display name. The schema has no display-name column; the name and initials shown in the sidebar and on the profile page are derived from the email address as a deliberate stand-in.
- Automated tests. `docs/08-test-plan.md` sets out unit, integration and smoke coverage, and the adjusted-expiry algorithm was written as a pure function specifically so it could be unit tested, but no test files have been committed.
