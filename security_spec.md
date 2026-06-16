# Security Specification - Xô Fome (Porto Velho)

## Data Invariants
1. **Wallets**: Only the owner or an admin can read. Balance updates must come from verified operations.
2. **Orders**: Only the customer who created it, the targeted restaurant owner, the assigned courier, or an admin can read/update.
3. **Restaurants**: Anyone can read. Only the owner or an admin can update.
4. **FoodItems**: Anyone can read. Only the restaurant owner or an admin can write.
5. **Users**: Only the owner or an admin can read/write their profile.

## The Dirty Dozen Payloads (Attacks to Block)

1. **Identity Spoofing**: Attempt to create a restaurant with someone else's `ownerUid`.
2. **Wallet Injection**: Attempt to set your own wallet balance to 1,000,000.
3. **Shadow Field Injection**: Adding an `isAdmin: true` field to a regular `UserProfile` write.
4. **Order Scraping**: Listing all orders without being authenticated or being the owner.
5. **Relational Sync Bypass**: Updating a product that belongs to another restaurant.
6. **Price Poisoning**: Setting a food item price to a negative value or a extremely large number.
7. **Status Shortcutting**: Moving an order from 'pending' directly to 'delivered'.
8. **PII Leak**: Reading another user's email/CPF/phone.
9. **Admin Spoofing**: Trying to write to `admin_logs` from a customer account.
10. **Role Escalation**: Updating your own `role` from 'customer' to 'admin'.
11. **Orphaned Writes**: Creating an order for a restaurant that doesn't exist.
12. **ID Poisoning**: Injecting 1.5KB junk strings as document IDs.

## Test Runner (Logic Verification)
These rules will be tested against the above payloads. Every attempt must return `PERMISSION_DENIED`.
