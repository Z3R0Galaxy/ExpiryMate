# Requirements

## In Scope

### Must Have

- The system must allow users to create an account and log in using an email address and password.

- The system must allow users to input and track food items, including the item name, food category, printed expiry date, quantity, and storage location (Fridge, Freezer, or Pantry).

- The system must allow users to specify whether a food item is opened or unopened. If the item is opened, the user must be able to record the date it was opened, either at the time of adding the item or at a later date by editing it.

- The system must allow users to add, edit, and delete items from their inventory.

- The system must calculate an adjusted expiry date for each item based on its food category, storage location, opened status, and date opened, using a predefined set of category-specific rules sourced from USDA food safety guidelines.

- Where a combination of storage location and food category is considered unsafe (e.g. raw meat stored in the pantry), the system must not calculate an adjusted date. Originally this meant showing the user a warning and still allowing the item to be saved; revised in Feedback Sprint 2 (22/8/26) to instead block the save outright, telling the user where the item actually belongs, since letting an unsafe combination through with only a warning didn't stop the underlying food-safety problem it was meant to flag — see `decisions.md`, "Feedback Sprint 2."

- The system must calculate the number of days remaining until each item's adjusted expiry date and display a status accordingly: "Fresh" if more than 7 days remain, "Expiring Soon" if between 0 and 7 days remain, and "Expired" if the date has passed.

- The system must notify users when an item is within 7 days of its adjusted expiry date.

- The system must ensure that each user can only view and manage their own items.

### Nice to Have

- The system should generate recipe suggestions based on ingredients that are close to expiring, using an integrated AI.

- The system should support multi-user household sharing, allowing members of the same household to view and manage a shared pantry.

## Out of Scope

- Barcode/QR code scanning (items must be added manually; no automatic product lookup from barcodes.)
- Nutritional information (no tracking of calories, macros, or dietary data for items.)
- Image recognition (items cannot be identified or added via photos.)