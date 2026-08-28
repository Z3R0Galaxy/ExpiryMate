# Front-End Architecture

## Component tree

```
App                                  session boundary + MFA gate
├── Auth                             (no session)
├── MfaChallenge                     (session, but assurance level not yet aal2)
└── AuthenticatedApp                 (session satisfied)
    ├── Sidebar                      brand, profile block, 5 nav destinations, theme toggle, sign out
    ├── main
    │   ├── PageHeading              page title + Home button (every view except the dashboard)
    │   ├── Dashboard                stat tiles, Donut, BarChart, AttentionPanel
    │   ├── PlaceDashboard           per-place stat tiles + AttentionPanel
    │   ├── ItemList                 toolbar, card grid or table, both opening ItemDetailModal
    │   ├── ProfilePage              derived name, join date, TwoFactorSettings
    │   └── AboutPage
    ├── FAB                          fixed add-item button
    ├── AnimatedModal > AddItemForm  (when the FAB is used)
    └── OnboardingTour               (first run for this account, once items have loaded)
```

`App.tsx` is the session boundary. It calls `supabase.auth.getSession()` on mount, subscribes to `onAuthStateChange`, and then checks `supabase.auth.mfa.getAuthenticatorAssuranceLevel()` to decide whether the session still needs a TOTP code before the app proper is shown. That MFA result is derived at render time and tagged with the account id, deliberately rather than being reset by an effect, so a plain token refresh does not flash the whole app back to a loading screen and switching accounts never shows the previous account's stale result.

`AuthenticatedApp` is split out so `useItems`, which fetches on mount, only ever runs once there is a signed-in user, and unmounts cleanly on sign out. It owns the view state: which view is showing, which storage place, and the two filters the item list should open with.

Navigation is plain component state rather than a router. There are five destinations and the app is a single page; a router would add a dependency and URL-syncing work for no behaviour the app currently needs. The trade-off, stated plainly, is that views are not linkable or bookmarkable and the browser's back button does not step through them. A router would be the first thing to add if deep-linking ever mattered.

## Data flow

All Supabase reads and writes for the `items` table go through one `useItems(userId)` hook.

```
useItems(userId)
  ├── items: Item[]
  ├── loading: boolean
  ├── error: string | null
  ├── addItem(input)
  ├── updateItem(id, input)
  ├── deleteItem(id)
  └── refetch()
```

This is a correctness fix as much as a tidiness one. `AddItemForm` and `ItemList` used to talk to Supabase independently, which duplicated the query shape and let the two drift: `AddItemForm` was inserting only `name` and `expiry_date` while the table required the full schema. Centralising the query shape in one place is what stopped that.

Three further hooks sit on top, each existing so that logic is written once rather than per component:

- `useItemsWithStatus(items)` memoises the per-item date maths for a whole list, so `Dashboard`, `PlaceDashboard` and `ItemList` all agree on the same computed status for the same item and none of them re-derive it.
- `useItemDetail(onUpdate, onDelete)` owns the open, edit and delete state machine behind `ItemDetailModal`, so a card, a table row and a needs-attention row all open the same modal with identical behaviour.
- `useAnimatedModal()` owns the shared open, close and grow-from-origin state used by both the add-item modal and the item-detail modal.

Pure logic lives in `src/lib/` and is deliberately free of React and Supabase, so it can be unit tested without mounting a component or touching a database: `adjustedExpiry.ts` (the algorithm and the date helpers), `itemStatus.ts` (status, countdown and the weeks note), `validateItem.ts` (form validation and the storage-safety check), `guessCategory.ts`, `dashboardStats.ts` (sorting, counting and filtering), `authErrorMessage.ts` and `userDisplay.ts`. `tests/unit/` covers all of it.

## Styling approach

Plain CSS with a design-token layer: `index.css` holds the reset, typography, colour variables and the light and dark palettes; `App.css` holds layout and component styles. Tokens cover a three-step radius scale, a two-tier shadow scale and a shared motion easing, replacing the scattered one-off values that came before them.

No CSS framework and no component library. `framer-motion` is the one exception and is a real dependency, used for the attention panel's crossfade, the stat-tile press, the ring chart's sweep-in and hover, the bar chart's grow-in, and the onboarding tour's highlight. It was added deliberately and narrowly, for animation only, after the original "no UI library at all" decision was overridden by the user. Everything else, including all icons, is hand-written.

Theme is an attribute on the root element, set by an inline script in `index.html` before first paint so there is no flash of the wrong theme, and kept in sync by `useTheme` once React mounts. Dark is the default for a visitor with no stored preference.

Two breakpoints, both max-width: 900px, where the sidebar becomes a horizontal icon bar and the dashboard's fill-the-viewport layout reverts to normal page scrolling; and 560px, where two-column forms collapse to one and the item table drops to name, days left and status. The item grid uses `repeat(auto-fill, minmax(...))` so it reflows without needing a breakpoint of its own.

## Accessibility

- Status is carried by text as well as colour ("Expiring soon", not just amber), so it is legible without colour perception.
- Every icon-only control has an `aria-label` and `title`, kept even when the sidebar collapses to icons.
- Interactive elements are real `<button>` elements wherever possible. Where a non-native element must be interactive (table rows, ring-chart legend rows, bar-chart bars) it carries `role="button"`, `tabIndex={0}` and an Enter/Space handler.
- Focus is visible everywhere: `index.css` styles form controls, buttons and links; `App.css` adds the table row and the two chart controls. Nothing in either stylesheet sets `outline: none`.
- The ring chart's `<svg>` is `aria-hidden` and its arcs are pointer-only. The legend beside it carries the same data as plain text and is the keyboard and screen-reader path, so the arcs would be a second tab stop for an action already reachable.
- Modals trap the page behind them, close on Escape and on backdrop click, and are rendered through a portal.
- Numerals are tabular throughout so figures align in columns.

The status palette was chosen for contrast, and the primary colour is an indigo picked specifically for a documented 4.5:1 pairing rather than on appearance alone.

## Why React

React was chosen over Vue or Svelte primarily on familiarity and the maturity of `@supabase/supabase-js` with React patterns, since hooks map cleanly onto Supabase's session and subscription model through `useEffect`. For a solo timeboxed project that matters more than marginal bundle-size differences between frameworks. This is expanded on in the Part B report, Section 2, per the assessment's requirement to justify tool choices there rather than in the folio.
