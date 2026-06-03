# Design Decisions

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
