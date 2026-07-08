# Design Decisions

## Build Slice Structure (decided 2026-06-11, revised 2026-06-11)

We follow a vertical-slice approach: each slice produces a shippable increment that runs in the browser. Slices are ordered by dependency — later slices build on earlier ones.

| # | Slice | Requirement coverage |
|---|---|---|
| 1 | **App Shell** | Auth (sign up, sign in, sign out, per-user data isolation) |
| 2 | **Full Schema Forms** | Item name, category, printed expiry date, quantity, storage location, opened status, date opened — add / edit / delete all fields |
| 3 | **Adjusted Expiry + Status Display** | Adjusted expiry date calculation, safety warnings for unsafe combos, days-remaining count, Fresh / Expiring Soon / Expired status badges (all using adjusted date) |
| 4 | **Styling** | Clean, usable UI on any browser — no UI library |
| 5 | **Expiry Notifications** | Notify user when any item is within 7 days of its adjusted expiry date (browser Notification API on load; optionally Supabase Edge Function for email) |
| 6 | **Nice-to-Haves** | Recipe suggestions (AI-powered), multi-user household sharing — descoped until Slices 1–5 are complete |

### Slice details

**Slice 1 — App Shell**
- `App.tsx`: call `supabase.auth.getSession()` on mount; subscribe to `onAuthStateChange`
- Unauthenticated: render `<Auth />`
- Authenticated: render `<AddItemForm userId={...} onAdded={...} />` + `<ItemList userId={...} refresh={...} />` + Sign Out button
- Requirement: each user sees only their own rows (enforced by existing RLS policy)

**Slice 2 — Full Schema Forms**
- `AddItemForm`: add `category` dropdown (Dairy / Meat / Seafood / Produce / Bakery / Frozen / Beverages / Condiments / Snacks / Leftovers), `storage_location` dropdown (Fridge / Freezer / Pantry), `quantity` number input (1–999), `is_opened` checkbox, `date_opened` date picker (shown only when `is_opened` is checked)
- `ItemList`: fetch and display all columns; inline edit must expose all fields (including the new ones); delete unchanged
- Extract a `useItems(userId)` custom hook: owns the `SELECT` query, `insert`, `update`, `delete` calls so neither component manages Supabase directly
- Requirement: all Must Have fields captured and persisted

**Slice 3 — Adjusted Expiry + Status Display**
- Create `src/lib/adjustedExpiry.ts`: pure function `getAdjustedExpiry(item) → { adjustedDate: string } | { unsafe: true }`; implements all category/storage/opened rules from the algorithm section of this file
- `ItemList` row displays: printed expiry date, adjusted expiry date (or ⚠ unsafe warning), days remaining count (integer, derived from adjusted date), status badge
- Status thresholds (per requirements): **Fresh** > 7 days, **Expiring Soon** 0–7 days, **Expired** < 0 days
- Status and days-remaining both derive from the adjusted date, not the printed date
- Requirement: adjusted expiry calculation, safety warnings, days remaining, status display

**Slice 4 — Styling**
- Components already carry class names (`auth-container`, `item-row`, `status-badge`, `status-expired`, `status-soon`, `status-fresh`, etc.)
- Write `index.css`: CSS reset, base typography, colour variables
- Write `App.css`: centred layout, form layout, item card grid or list, badge colours (green / amber / red), responsive at mobile widths
- Requirement: accessible, usable on any device with a browser

**Slice 5 — Expiry Notifications**
- On app load (after session confirmed), fetch items where adjusted expiry ≤ today + 7 days
- Request browser `Notification` permission; fire one notification listing affected items
- Threshold: **7 days** (matches requirements — not 3)
- Optional stretch: Supabase Edge Function sends a daily email digest via Resend/SendGrid
- Requirement: notify users when an item is within 7 days of its adjusted expiry date

---

## Adjusted Expiry Date Algorithm

### Overview

When a user adds or edits a food item, the app calculates an **adjusted expiry date** based on four inputs: the printed expiry date (from the label), the food category, the storage location, and whether the item has been opened. For opened items, the date the item was opened is also used.

The adjusted expiry date is derived at runtime and is never stored in the database. The printed expiry date is always retained so users can see both values.

Where a storage location is considered unsafe for a given category (e.g. raw meat left in the pantry), the algorithm does not produce an adjusted date. Instead, the app displays a safety warning.

### Source

All storage duration values are sourced from the **USDA FoodSafety.gov Cold Food Storage Chart**, last reviewed September 2023.  
https://www.foodsafety.gov/food-safety-charts/cold-food-storage-charts

---

### Algorithm Rules by Category

The adjustments below are expressed relative to the printed expiry date (for unopened items) or the date opened (for opened items), whichever applies.

#### Dairy
| Storage | Opened | Adjusted Expiry Date |
|---|---|---|
| Fridge | No | Printed expiry date (no change) |
| Fridge | Yes | Earlier of: printed expiry date, or date opened + 7 days |
| Freezer | No | Printed expiry date + 60 days |
| Freezer | Yes | Date opened + 30 days |
| Pantry | Either | ⚠ Unsafe — display warning |

#### Meat & Poultry (raw)
| Storage | Opened | Adjusted Expiry Date |
|---|---|---|
| Fridge | No | Printed expiry date (no change) |
| Fridge | Yes | Printed expiry date (no change — fridge rules apply regardless of seal) |
| Freezer | No | Date of freezing + 270 days (9 months; USDA: whole poultry 1 year, pieces 9 months, ground 3–4 months) |
| Freezer | Yes | Date of freezing + 120 days |
| Pantry | Either | ⚠ Unsafe — display warning |

#### Seafood
| Storage | Opened | Adjusted Expiry Date |
|---|---|---|
| Fridge | No | Printed expiry date (no change) |
| Fridge | Yes | Printed expiry date (no change) |
| Freezer | No | Date of freezing + 180 days (USDA: fatty fish 2–3 months, lean fish 6–8 months, shellfish 3–4 months) |
| Freezer | Yes | Date of freezing + 90 days |
| Pantry | Either | ⚠ Unsafe — display warning |

#### Eggs
| Storage | Opened | Adjusted Expiry Date |
|---|---|---|
| Fridge | No | Printed expiry date (USDA: raw eggs in shell 3–5 weeks) |
| Fridge | Yes (cracked/separated) | Date opened + 4 days (USDA: raw egg whites/yolks 2–4 days) |
| Freezer | No | ⚠ Unsafe — eggs cannot be frozen in shell |
| Freezer | Yes | ⚠ Unsafe — display warning |
| Pantry | No | Printed expiry date − 14 days (room temperature significantly shortens shelf life) |
| Pantry | Yes | ⚠ Unsafe — display warning |

#### Fruit & Vegetables
| Storage | Opened | Adjusted Expiry Date |
|---|---|---|
| Fridge | Either | Printed expiry date (no change) |
| Freezer | Either | Printed expiry date + 180 days (most vegetables freeze well; 6 months used as a conservative estimate) |
| Pantry | Either | Printed expiry date (no change; suitable for root vegetables, apples, etc.) |

#### Cooked Meals / Leftovers
*Note: for this category, the user enters the date prepared rather than a printed expiry date.*
| Storage | Opened | Adjusted Expiry Date |
|---|---|---|
| Fridge | Either | Date prepared + 4 days (USDA: cooked meat/poultry 3–4 days; soups/stews 3–4 days) |
| Freezer | Either | Date prepared + 90 days (USDA: cooked meat 2–6 months; soups/stews 2–3 months) |
| Pantry | Either | ⚠ Unsafe — display warning |

#### Beverages
| Storage | Opened | Adjusted Expiry Date |
|---|---|---|
| Fridge | No | Printed expiry date (no change) |
| Fridge | Yes | Date opened + 7 days |
| Pantry | No | Printed expiry date (no change) |
| Pantry | Yes | Date opened + 3 days |
| Freezer | Either | Not applicable — freezer not recommended for most beverages |

#### Condiments & Sauces
| Storage | Opened | Adjusted Expiry Date |
|---|---|---|
| Fridge | No | Printed expiry date (no change) |
| Fridge | Yes | Date opened + 30 days |
| Pantry | No | Printed expiry date (no change) |
| Pantry | Yes | Date opened + 14 days |
| Freezer | Either | Not applicable — freezer not suitable for most condiments |

#### Dry Goods (pasta, rice, flour, cereals)
| Storage | Opened | Adjusted Expiry Date |
|---|---|---|
| Pantry | No | Printed expiry date (no change) |
| Pantry | Yes | Printed expiry date − 30 days (exposure to air reduces shelf life) |
| Fridge | Either | Printed expiry date (no change) |
| Freezer | Either | Printed expiry date + 180 days (flour, nuts, and grains last significantly longer when frozen) |

#### Bakery (bread, cakes, pastries)
| Storage | Opened | Adjusted Expiry Date |
|---|---|---|
| Pantry | No | Printed expiry date (no change) |
| Pantry | Yes | Printed expiry date − 2 days |
| Fridge | Either | Printed expiry date + 3 days |
| Freezer | Either | Date of freezing + 90 days |
