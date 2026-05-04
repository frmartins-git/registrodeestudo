# Security Specification - ConcursoPro Study Manager

## 1. Data Invariants
- A **Study Session** must belong to exactly one `userId`.
- Users can only read, create, update, or delete sessions where `userId == request.auth.uid`.
- **Subjects** and **Topics** must be isolated per user.
- Timestamps (`createdAt`, `updatedAt`) must be server-generated.

## 2. The "Dirty Dozen" (Attack Payloads)
1. **Identity Theft**: Attempting to create a session with another user's `userId`.
2. **Ghost Fields**: Adding an `isAdmin: true` field to a user profile or session.
3. **ID Poisoning**: Using a 2MB string as a document ID to bloat storage costs.
4. **XSS Payload**: Injecting `<script>alert(1)</script>` into the `activity` or `goal` field.
5. **Modification of Immutable Fields**: Changing a document's `createdAt` date after creation.
6. **Orphaned Writes**: Creating a session referring to a `subjectId` that doesn't exist.
7. **Privilege Escalation**: Attempting to list all users' sessions via a blanket query.
8. **Bulk Deletion**: Authenticated user trying to delete a collection they don't own.
9. **Resource Exhaustion**: Sending a 1MB string to the `goal` field.
10. **State Skipping**: Forcing a session status to "Completed" without providing required topics.
11. **Future Dating**: Setting a `date` field to the year 3000.
12. **Null Spoofing**: Sending `userId: null` to bypass checks.

## 3. Test Runner (Mock Tests)
- `test('Users cannot see others data')` -> Expect PERMISSION_DENIED
- `test('Users cannot create sessions with someone else as owner')` -> Expect PERMISSION_DENIED
- `test('Field size limits')` -> Expect PERMISSION_DENIED if > 255 chars
