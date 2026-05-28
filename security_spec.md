# Firebase Security Specification (Payload-First TDD)

## 1. Data Invariants

- **User Profiles**: Stored at `/users/{userId}`. A profile can only be created or modified by the user themselves. The administrative concepts are omitted as we don't have an admin concept, or we can include the `isAdmin` pattern. Standard auth verification via `request.auth.token.email_verified == true` is required.
- **Trip Records**: Stored at `/users/{userId}/trips/{tripId}`. Every Trip log must link to an existing, valid parent `/users/{userId}` document (verified via `exists()` or `get()`). Trips are private to their respective owner.
- **Fuel Records**: Stored at `/users/{userId}/fuel/{fuelId}`. Every Fuel receipt record must be linked to an existing, valid parent `/users/{userId}` document. Fuel transactions are private to their respective owner.

---

## 2. The "Dirty Dozen" Playloads (Attack Vectors)

Here are the 12 payloads representing security vulnerabilities that our Firestore policies must actively block with `PERMISSION_DENIED`.

### Attack Vector 1: Identity Spoofing (Create User Profile as Another UID)
- **Path**: `/users/malicious_attacker_uid`
- **Auth**: `request.auth.uid = "legitimate_user_uid"`
- **Payload**: `{"email": "malicious@attacker.com", "name": "Fake Legitimate User"}`
- **Expected Outcome**: `PERMISSION_DENIED` (UID in path must match `request.auth.uid`).

### Attack Vector 2: Unverified User Access Profile
- **Path**: `/users/unverified_user_uid`
- **Auth**: `request.auth.uid = "unverified_user_uid"`, `request.auth.token.email_verified = false`
- **Payload**: `{"email": "unverified@user.com", "name": "Unverified User"}`
- **Expected Outcome**: `PERMISSION_DENIED` (Email verification must be true).

### Attack Vector 3: Immortal Field Violation (Attempt to Change `createdAt` on User Profile)
- **Path**: `/users/user_123`
- **Auth**: `request.auth.uid = "user_123"`, `request.auth.token.email_verified = true`
- **Existing Document**: `{"email": "user@gmail.com", "createdAt": "2026-05-28T00:00:00Z"}`
- **Update Payload**: `{"email": "user@gmail.com", "createdAt": "2026-05-29T00:00:00Z"}`
- **Expected Outcome**: `PERMISSION_DENIED` (Cannot overwrite immutable field `createdAt`).

### Attack Vector 4: Ghost Parameter Injection / Shadow Update (Inject `customRole` field)
- **Path**: `/users/user_123`
- **Auth**: `request.auth.uid = "user_123"`, `request.auth.token.email_verified = true`
- **Existing Document**: `{"email": "user@gmail.com"}`
- **Update Payload**: `{"email": "user@gmail.com", "customRole": "administrator"}`
- **Expected Outcome**: `PERMISSION_DENIED` (Ghost field `customRole` blocked by strict `affectedKeys().hasOnly` schema validation checker).

### Attack Vector 5: Missing Parent Reference (Orphaned Trip Record creation)
- **Path**: `/users/non_existent_uid/trips/trip_999`
- **Auth**: `request.auth.uid = "non_existent_uid"`, `request.auth.token.email_verified = true`
- **Condition**: Parent `/users/non_existent_uid` does NOT exist in Firestore.
- **Payload**: `{"unit": "Truck-101", "state": "TX", "miles": 120, "date": "2026-05-28"}`
- **Expected Outcome**: `PERMISSION_DENIED` (Parent `/users/non_existent_uid` profile must exist before registering child items).

### Attack Vector 6: Hostile Trip Hijacking (Stealing Trip Records from another user)
- **Path**: `/users/victim_user_uid/trips/trip_555`
- **Auth**: `request.auth.uid = "malicious_attacker_uid"`, `request.auth.token.email_verified = true`
- **Operation**: `get` or `update`
- **Expected Outcome**: `PERMISSION_DENIED` (No cross-user access allowed).

### Attack Vector 7: Trip Resource Poisoning (Massive Miles input)
- **Path**: `/users/user_123/trips/trip_100`
- **Auth**: `request.auth.uid = "user_123"`, `request.auth.token.email_verified = true`
- **Payload**: `{"unit": "Truck-101", "state": "TX", "miles": "999999999999999999999999", "date": "2026-05-28"}`
- **Expected Outcome**: `PERMISSION_DENIED` (Data type format size limits on numeric strings/values must prevent massive inputs).

### Attack Vector 8: State Shortcutting / Path ID Poisoning (Spam character in document ID)
- **Path**: `/users/user_123/trips/$$$INVALID_ID$$$`
- **Auth**: `request.auth.uid = "user_123"`, `request.auth.token.email_verified = true`
- **Payload**: `{"unit": "Truck-101", "state": "TX", "miles": 150, "date": "2026-05-28"}`
- **Expected Outcome**: `PERMISSION_DENIED` (Document ID must conform to strict alpha-numeric ID criteria).

### Attack Vector 9: PII Scraping / Blanket Read Attack
- **Path**: `/users` (Collection list query)
- **Auth**: `request.auth.uid = "malicious_attacker_uid"`, `request.auth.token.email_verified = true`
- **Operation**: `list`
- **Expected Outcome**: `PERMISSION_DENIED` (Cannot do blank queries; must limit results and specifically filter metadata or prevent collection-level leaks).

### Attack Vector 10: Value Poisoning (Malformed State Code on Fuel Record)
- **Path**: `/users/user_123/fuel/fuel_789`
- **Auth**: `request.auth.uid = "user_123"`, `request.auth.token.email_verified = true`
- **Payload**: `{"unit": "Truck-101", "state": "TEXAS_MALFORMED", "gallons": 50, "date": "2026-05-28"}`
- **Expected Outcome**: `PERMISSION_DENIED` (Schema expects state to be exactly 2 characters).

### Attack Vector 11: Fuel Record Identity Spoofing
- **Path**: `/users/user_123/fuel/fuel_222`
- **Auth**: `request.auth.uid = "user_123"`, `request.auth.token.email_verified = true`
- **Payload**: `{"unit": "Truck-101", "state": "TX", "gallons": 100, "date": "2026-05-28", "ownerId": "attacker_uid"}`
- **Expected Outcome**: `PERMISSION_DENIED` (Implicit or explicit state checks prevent foreign owner attachment).

### Attack Vector 12: temporal integrity hijack (Attempting to set fake client timestamp)
- **Path**: `/users/user_123/fuel/fuel_111`
- **Auth**: `request.auth.uid = "user_123"`, `request.auth.token.email_verified = true`
- **Payload**: `{"unit": "Truck-101", "state": "TX", "gallons": 100, "date": "2026-05-28", "createdAt": "2021-01-01T00:00:00Z"}`
- **Expected Outcome**: `PERMISSION_DENIED` (Timestamp must be strictly validated using the server-side comparison `request.time`).

---

## 3. The Test Runner Specification

We verify that each of the "Dirty Dozen" payloads gets rejected. A mock test runner suite will be used to validate the policies prior to deployment to Firestore.
