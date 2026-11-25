# Security Specification — 69319100011DB Income & Expense Ledger

## 1. Data Invariants
1. **Strict Ownership**: Every document under `/69319100011DB/{userId}` and its subcollections (`transactions`, `budgets`) can only be read, created, updated, or deleted by the authenticated, email-verified user whose `request.auth.uid == userId`.
2. **Master Gate**: Transactions and monthly budgets cannot exist unless `/69319100011DB/{userId}` exists and belongs to the authenticated user (`uid == request.auth.uid`).
3. **Immutable Identity & Creation Time**: `uid` / `userId` and `createdAt` cannot be modified after creation. `createdAt` must equal `request.time` on creation; `updatedAt` must equal `request.time` on both creation and update.
4. **Volumetric & Format Bounds**:
   - All document IDs (`userId`, `transactionId`) match `^[a-zA-Z0-9_\-]+$` and `<= 128` chars.
   - `monthKey` matches `^[0-9]{4}-[0-9]{2}$` and `date` matches `^[0-9]{4}-[0-9]{2}-[0-9]{2}$`, with `date.matches('^' + monthKey + '-[0-9]{2}$')` consistency.
   - `amount` is strictly `> 0` and `<= 1000000000`.
   - Every string field has strict `.size()` bounds.
5. **PII Isolation**: User email and display name live only on `/69319100011DB/{userId}`, which disallows `list` completely and restricts `get` strictly to `isOwner(userId)`.

## 2. Adversarial "Dirty Dozen" Payloads (Expected: PERMISSION_DENIED)
1. **Unauthenticated Read/Write**: Read or write `/69319100011DB/userA/transactions/tx1` with `auth == null`.
2. **Unverified Email Spoof**: Signed-in user with `email_verified: false` attempting to create `/69319100011DB/userA`.
3. **Cross-User Read (PII Leak)**: `userB` attempting `get` on `/69319100011DB/userA`.
4. **Cross-User List**: `userB` attempting `list` on `/69319100011DB` or `/69319100011DB/userA/transactions`.
5. **Identity Spoofing on Create**: `userA` creating `/69319100011DB/userA/transactions/tx1` with `userId: "userB"`.
6. **Ghost / Shadow Field Injection**: `userA` creating a transaction with extra field `isAdmin: true` or `verified: true`.
7. **Orphaned Subcollection Write**: `userA` creating `/69319100011DB/userA/transactions/tx1` when parent `/69319100011DB/userA` does not exist.
8. **ID Poisoning**: `userA` creating `/69319100011DB/userA/transactions/bad$id!` or a 200-char ID.
9. **Negative / Zero / Infinite Amount**: `userA` creating a transaction with `amount: -500` or `amount: 0` or `amount: "1000"`.
10. **Client Timestamp Forgery**: `userA` creating or updating a transaction with a backdated `createdAt` or `updatedAt != request.time`.
11. **Immutable Field Mutation**: `userA` updating `userId` or `createdAt` on an existing transaction.
12. **MonthKey/Date Desync or Oversized Note**: `userA` creating a transaction with `monthKey: "2026-01"`, `date: "2026-02-15"` or a 1000-character `note`.
