# Security Specification (`security_spec.md`)

## 1. Data Invariants
1. **Strict Ownership (`users/{userId}`)**: A `UserProfile` document at `/users/{userId}` can only be read, created, updated, or deleted by the authenticated, email-verified user whose `request.auth.uid == userId` AND `incoming().uid == request.auth.uid`.
2. **PII Split Collection (`/users/{userId}/private/{docId}`)**: Personally Identifiable Information (`email`) is strictly isolated in `/users/{userId}/private/info` and can only be accessed when `request.auth.uid == userId` and the parent `/users/{userId}` document exists.
3. **Relational Master Gate (`/users/{userId}/progressSnapshots/{snapshotId}`)**: A `ProgressSnapshot` cannot exist without a valid parent `/users/{userId}` document owned by `request.auth.uid`.
4. **Immutable Identity & Creation Timestamp**: `uid` and `createdAt` can never be mutated during an `update`.
5. **Server Timestamp Enforcement**: `createdAt` on `create` and `updatedAt` on `create`/`update` must equal `request.time`.

## 2. The "Dirty Dozen" Payloads
1. **Unauthenticated Write**: `auth = null`, creating `/users/user_1` -> `PERMISSION_DENIED`.
2. **Unverified Email Spoof**: `auth = { uid: 'user_1', token: { email_verified: false } }` -> `PERMISSION_DENIED`.
3. **Cross-User Profile Hijack**: `auth.uid = 'attacker'` writing to `/users/victim` -> `PERMISSION_DENIED`.
4. **UID Payload Spoofing**: `auth.uid = 'user_1'` writing `uid: 'user_2'` to `/users/user_1` -> `PERMISSION_DENIED`.
5. **Shadow Field Injection (Create)**: Adding `"isAdmin": true` to `/users/user_1` -> `PERMISSION_DENIED`.
6. **Shadow Field Injection (Update)**: Updating `/users/user_1` with `"role": "admin"` -> `PERMISSION_DENIED`.
7. **Immortal Field Mutation**: Changing `createdAt` or `uid` on `/users/user_1` update -> `PERMISSION_DENIED`.
8. **Forged Client Timestamp**: Passing a past/future timestamp instead of `request.time` -> `PERMISSION_DENIED`.
9. **Resource Poisoning (Oversized DisplayName)**: `displayName` of 5,000 chars (> 80 max) -> `PERMISSION_DENIED`.
10. **Invalid Enum Objective**: `primaryObjective: "hacked_mode"` -> `PERMISSION_DENIED`.
11. **Orphaned Progress Snapshot**: Creating `/users/user_1/progressSnapshots/snap_1` when `/users/user_1` does not exist -> `PERMISSION_DENIED`.
12. **PII Cross-Read**: `auth.uid = 'attacker'` reading `/users/victim/private/info` -> `PERMISSION_DENIED`.
