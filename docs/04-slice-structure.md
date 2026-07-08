# Build Slice Structure

We follow a vertical-slice approach: each slice produces a shippable increment that runs in the browser. Slices are ordered by dependency — later slices build on earlier ones.

| # | Slice | What it delivers |
|---|---|---|
| 1 | **App Shell** | Wire `Auth`, `AddItemForm`, `ItemList` into `App.tsx` with Supabase session management. The app is usable end-to-end after this slice. |
| 2 | **Full Schema Forms** | Update `AddItemForm` and `ItemList` to use all DB columns: `category`, `storage_location`, `quantity`, `is_opened`, `date_opened`. Adds a `useItems` custom hook to centralise data fetching and mutations. |
| 3 | **Adjusted Expiry Logic** | Extract the algorithm from `decisions.md` into `src/lib/adjustedExpiry.ts`. Wire it into `ItemList` so each row shows both the printed date and the adjusted date (or a safety warning). Status badges (`fresh`/`soon`/`expired`) use the adjusted date. |
| 4 | **Styling** | Write `index.css` and `App.css`: layout, colour palette, status badge colours, responsive card grid. Goal: clean, functional UI with no UI library dependency. |
| 5 | **Expiry Notifications** | Browser `Notification` API on page load: alert the user to any items expiring within 3 days. Optionally escalate to a Supabase Edge Function + email for background alerts. |
| 6 | **Nice-to-Haves** | Recipe suggestions (AI-powered via Claude API), multi-user household sharing via Supabase RLS policy extension. Descoped for now. |

---

## Slice Detail

### Slice 1 — App Shell
`App.tsx` currently renders `<h1>expiry mate</h1>`. The three components exist but nothing connects them. This slice makes the app actually run.

Add session state to `App.tsx` using `supabase.auth.getSession()` on mount and `supabase.auth.onAuthStateChange` to listen for login/logout events. When no session exists, render `<Auth />`. When a session exists, render `<AddItemForm>` and `<ItemList>` side by side, plus a Sign Out button.

---

### Slice 2 — Full Schema Forms
The DB has `category`, `storage_location`, `quantity`, `is_opened`, and `date_opened` columns, but `AddItemForm` doesn't collect them and `ItemList` doesn't fetch or display them. Every insert currently fails because `category`, `storage_location`, and `quantity` are `NOT NULL`.

Add dropdowns for category and storage location, a number input for quantity, and a checkbox for `is_opened` that conditionally shows a `date_opened` picker. Update `ItemList` to `SELECT *` and display all fields. Extract data-fetching and mutations into a `useItems` hook shared by both components.

---

### Slice 3 — Adjusted Expiry Logic
The algorithm is fully documented in `decisions.md` but not yet in code. Rules map `(category, storage_location, is_opened)` to an adjustment on top of the printed expiry date, with some combinations flagged unsafe.

Create `src/lib/adjustedExpiry.ts` with a single pure function `getAdjustedExpiry(item) → { date: string } | { unsafe: true }`. Wire it into `ItemList` so each row shows both the printed and adjusted date (or a ⚠ warning). Switch `getStatus` to use the adjusted date.

---

### Slice 4 — Styling
Both `index.css` and `App.css` are empty. Components already have class names attached (`auth-container`, `item-row`, `status-badge`, `status-expired`, etc.).

Write global resets and typography in `index.css`, then layout (centred container, form layout, card grid) and status badge colours (red/amber/green) in `App.css`. Goal: clean and readable, no UI library.

---

### Slice 5 — Expiry Notifications
On app load, check if any items have an adjusted expiry within 3 days. If so, request browser `Notification` permission and fire a notification listing those items. Optionally, a Supabase Edge Function can send an email digest on a schedule.

---

### Slice 6 — Nice-to-Haves
- **Recipe suggestions** — send expiring items to Claude API and return recipe ideas
- **Household sharing** — extend RLS policy to allow multiple users to share a pantry

Both are descoped until Slices 1–5 are solid.
