# Requirements

## In Scope

### Must Have

- The system must allow users to create an account and log in using an email address and password.

- The system must allow users to input and track food items, including the item name, expiry date, and quantity.

- The system must allow users to add, edit, and delete items from their inventory.

- The system must calculate the number of days remaining until each item's expiry date and display a status accordingly: "Fresh" if more than 7 days remain, "Expiring Soon" if between 0 and 7 days remain, and "Expired" if the date has passed.

- The system must notify users when an item is within 7 days of its expiry date.

- The system must ensure that each user can only view and manage their own items.

### Nice to Have

- The system should generate recipe suggestions based on ingredients that are close to expiring, using an integrated AI.

- The system should support multi-user household sharing, allowing members of the same household to view and manage a shared pantry.

## Out of Scope

- Barcode/QR code scanning (items must be added manually; no automatic product lookup from barcodes.)
- Nutritional information (no tracking of calories, macros, or dietary data for items.)
- Image recognition (items cannot be identified or added via photos.)