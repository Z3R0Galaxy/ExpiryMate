# Front-End Architecture

## Component tree (target)

```
App
├── Auth                     (shown when no session)
└── (shown when session exists)
    ├── AddItemForm
    ├── ItemList
    └── Sign Out button
```

`App.tsx` is the session boundary: it calls `supabase.auth.getSession()` on mount and subscribes to `supabase.auth.onAuthStateChange`, then renders `<Auth />` or the authenticated view accordingly. This is Slice 1 (App Shell) and is the current priority — see `decisions.md` for the slice plan.

**Current state vs. target:** as of this document, `Auth.tsx`, `AddItemForm.tsx`, and `ItemList.tsx` all exist and are individually functional, but `App.tsx` doesn't render any of them yet. This file describes the intended architecture; `09-iteration-log.md` will track when each piece actually lands.

## Data flow

Once Slice 2 (Full Schema Forms) is complete, data fetching and mutation will be centralised in a `useItems(userId)` custom hook (`src/hooks/useItems.ts`, not yet created) rather than each component calling `supabase.from('items')` directly. Today, `AddItemForm` and `ItemList` both talk to Supabase independently, which duplicates the `select`/`insert` shape and makes it easy for the two components to drift out of sync (e.g. `AddItemForm` currently only inserts `name` and `expiry_date`, while the table requires `category`, `storage_location`, and `quantity` too — see `05-security-review.md` and `04-data-model.md`). Centralising this into one hook is a correctness fix as much as a tidiness one.

```
useItems(userId)
  ├── items: Item[]
  ├── loading: boolean
  ├── addItem(input)
  ├── updateItem(id, input)
  └── deleteItem(id)
```

`AddItemForm` and `ItemList` will both consume this hook rather than owning their own Supabase calls.

## Styling approach

Plain CSS, no UI library (`index.css` for resets/typography/colour variables, `App.css` for layout and the status-badge colours). This is a deliberate choice for a project of this scope — a UI library would add a dependency and a learning curve for marginal benefit given the app has a handful of screens. Components already carry semantic class names (`auth-container`, `add-item-form`, `item-list`, `item-row`, `status-badge`, `status-expired`, `status-soon`, `status-fresh`) so styling can be layered on without touching component logic.

Both CSS files are currently empty — this is Slice 4 and comes after the app is functionally wired up and using the full schema, on the reasoning that styling a UI that's still changing shape is wasted effort.

## Accessibility considerations

These are commitments for Slice 4, recorded here so they don't get dropped once styling starts:

- Form inputs use associated `<label>` text or clear `placeholder` semantics; date and number inputs use their native `type` attributes so assistive tech and mobile keyboards get the right affordances.
- Status badges (`fresh` / `soon` / `expired`) will carry both colour and text (e.g. "Expiring soon"), not colour alone, so the status is legible without relying on colour perception.
- Interactive elements (edit/delete/sign out) are real `<button>` elements, not `<div onClick>`, so they're keyboard-reachable and get default focus styling.
- Colour choices for the status badges will be checked against WCAG AA contrast ratios against their background once the palette is chosen in Slice 4, not picked purely on vibe.

## Why React

React was chosen over Vue or Svelte primarily on familiarity and the maturity of `@supabase/supabase-js` + React patterns (hooks map cleanly onto Supabase's session/subscription model via `useEffect`), which matters more for a solo timeboxed project than marginal bundle-size differences between frameworks. This is expanded on with more justification in the Part B report, Section 2, per the assessment's requirement to justify tool choices there rather than just in the folio.
