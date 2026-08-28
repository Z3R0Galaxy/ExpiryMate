# Smoke tests

Manual post-deploy checklist against the live URL (https://expiry-mate.vercel.app). Run after any deploy that touches auth, the data layer, or a migration.

1. Sign up with a new address. The success message mentions checking the spam folder.
2. Open the confirmation email and follow the link. It lands on the deployed app, not `localhost`.
3. Sign in. The dashboard loads and shows the empty state.
4. The first-run tour appears, steps through, and does not reappear after a reload.
5. Add an item. Type a name such as "Apples" and check the category is guessed. Save it.
6. The dashboard now shows counts, the ring chart and the bar chart, and the item appears in the needs-attention list if it is not fresh.
7. Try to save dairy into the Pantry. The save is refused and the message names the fridge or freezer.
8. Mark an item opened with today's date. It saves. Worth doing in the morning specifically, which is when the timezone bugs fixed on 27/8/26 used to surface.
9. Open an item, edit it, save, then delete it and confirm the confirmation step names the item.
10. Switch to list view, search, and apply each filter.
11. Toggle the theme, reload, and confirm the choice is remembered.
12. Narrow the window below 900px and confirm the sidebar becomes a top bar; below 560px, confirm the table drops to name, days left and status.
13. Sign out.

Automating this would mean Playwright against the deployed URL plus a disposable test account. A disposable local Playwright harness has been used repeatedly during development for visual checks, but it has never been committed.
