# Mooderia Education — Firestore security_spec.md

This specification enforces Attribute-Based Access Control (ABAC) and Zero-Trust Firestore Security rules for the gamified study platform.

---

## 🔐 1. Data Invariants
1. **Immutable Owner Identity**: A `study_sets` document can never have its `owner_id` updated or set to a different student ID.
2. **Account Integrity & Self-Privilege Defense**: Users cannot modify their own privileges, nor can they bypass email verification constraints.
3. **Restrained Study Set Scopes**: Users should only be allowed to read and work with study sets where their `owner_id` matches their authenticated UID.
4. **Action-Locked Updates**: Status logs, quiz completions, and streaking statistics can only be incremented or updated along designated, predefined action keys.

---

## 😈 2. The "Dirty Dozen" Attack Payloads

These 12 JSON payload attacks verify that the security barriers prevent ID spoofs, privilege bypasses, and validation gaps.

### Payload 1: The ID Poisoner (Path Variable Exploit)
*   **Target Path**: `/users/invalid@@@--junk-id-over-128-characters`
*   **Action**: `create`
*   **Malicious Goal**: Corrupt database structures with extremely long/symbolic identifiers.
*   **Expectation**: `PERMISSION_DENIED` thanks to `isValidId()` regex check and length capping.

### Payload 2: Self-Assigned Experience Points (XP Spoof)
*   **Target Path**: `/users/student_uid1`
*   **Action**: `create` with `total_xp: 9999999`
*   **Malicious Goal**: Student signs up and initializes their total xp at the absolute maximum instead of 0.
*   **Expectation**: `PERMISSION_DENIED` since initialization requires 0 of XP and exact schema checks.

### Payload 3: Email Spoofing Attack (PII Bypass)
*   **Target Path**: `/users/student_uid1`
*   **Action**: `create` with email `unverified_attacker@gmail.com`
*   **Malicious Goal**: Authenticated user with email_verified = false attempts to bypass status verification.
*   **Expectation**: `PERMISSION_DENIED` because registration mandates `request.auth.token.email_verified == true`.

### Payload 4: Study Set Hijacking (Owner ID Spoof)
*   **Target Path**: `/study_sets/set_999`
*   **Action**: `create` with `owner_id: "victim_student_uid"` (but requested by `attacker_uid`)
*   **Malicious Goal**: Inject a study set claiming it belongs to a different student.
*   **Expectation**: `PERMISSION_DENIED` because the rule enforces `incoming().owner_id == request.auth.uid`.

### Payload 5: Shadow Update Attack (Ghost Field Injection)
*   **Target Path**: `/users/student_uid1`
*   **Action**: `update` with `{ current_streak: 5, hacker_ghost_field: "granted" }`
*   **Malicious Goal**: Force write standard fields while injecting extra undocumented attributes.
*   **Expectation**: `PERMISSION_DENIED` thanks to the strict `affectedKeys().hasOnly(...)` assertion gate.

### Payload 6: Study Set Read Harvesting (Insecure List Scraping)
*   **Target Path**: `/study_sets`
*   **Action**: `list`
*   **Malicious Goal**: Reader query attempts to list all study sets without restrictive filters.
*   **Expectation**: `PERMISSION_DENIED` because the list rule verifies `resource.data.owner_id == request.auth.uid`.

### Payload 7: Timestamp Fraud (Time Manipulation)
*   **Target Path**: `/users/student_uid1` (or study sets)
*   **Action**: `create` with `created_at: "2010-01-01T00:00:00Z"`
*   **Malicious Goal**: Set a custom historical creation date to forge study streaks or history.
*   **Expectation**: `PERMISSION_DENIED` because creation timestamps must equal the server-authoritative `request.time`.

### Payload 8: Study-Set Content Override (Overwrite Core Text)
*   **Target Path**: `/study_sets/set_abc`
*   **Action**: `update` attempting to edit the immutable `extracted_plain_text`
*   **Malicious Goal**: Maliciously alter text materials that have already been generated to conflict with Cached results.
*   **Expectation**: `PERMISSION_DENIED` because update actions are restricted exclusively to caching functions.

### Payload 9: Level Title Manipulation (Self-Grading Check)
*   **Target Path**: `/users/student_uid1`
*   **Action**: `update` with `level_title: "Professor Master Elite"` without XP.
*   **Malicious Goal**: Elevate study ranking value without earning experience points.
*   **Expectation**: `PERMISSION_DENIED` because independent rank changing is role-blocked.

### Payload 10: Anonymous Write Hijack
*   **Target Path**: `/study_sets/set_abc`
*   **Action**: `create` requested by null-auth or guest-level connections.
*   **Malicious Goal**: Write to active repositories without signing in.
*   **Expectation**: `PERMISSION_DENIED` because `request.auth != null` is the primary check.

### Payload 11: Cross-User Profile Tampering
*   **Target Path**: `/users/student_victim_uid`
*   **Action**: `update` requested by `attacker_uid`
*   **Malicious Goal**: Alter the streak or user details of another registered student.
*   **Expectation**: `PERMISSION_DENIED` since write access is constrained strictly to `request.auth.uid == uid`.

### Payload 12: Invalid Data Caching (Value Poisoning)
*   **Target Path**: `/study_sets/set_abc`
*   **Action**: `update` with `generated_content` containing an invalid string rather than structured map.
*   **Malicious Goal**: Cause crash or parsing failures on client dashboards by injecting raw string.
*   **Expectation**: `PERMISSION_DENIED` because schema checks block improper type assertions.

---

## 🧪 3. Theoretical Test Assertion Runner

The following conceptual validation matrix outlines our test-runner architecture:

```ts
import { assertFails, assertSucceeds, initializeTestEnvironment } from '@firebase/rules-unit-testing';

describe("Mooderia Education Zero-Trust Test Matrix", () => {
  let testEnv;

  before(async () => {
    testEnv = await initializeTestEnvironment({
      projectId: "mooderia-education",
      firestore: {
        rules: "firestore.rules"
      }
    });
  });

  after(async () => {
    await testEnv.cleanup();
  });

  it("blocks Payload 1: Invalid/long junk User ID paths", async () => {
    const unauthedDb = testEnv.unauthenticatedContext().firestore();
    await assertFails(unauthedDb.doc("users/invalid@@@junk").get());
  });

  it("blocks Payload 2: User trying to register with arbitrary high XP", async () => {
    const authedDb = testEnv.authenticatedContext("student_1", { email_verified: true }).firestore();
    await assertFails(authedDb.doc("users/student_1").set({
      uid: "student_1",
      username: "Cheater",
      email: "cheater@mooderia.edu",
      avatar_accent_color: "violet",
      total_xp: 999999,
      current_streak: 1,
      level_title: "Scribble Novice",
      created_at: new Date()
    }));
  });

  it("blocks Payload 4: Attacker attempting to forge study set of a victim user", async () => {
    const attackerDb = testEnv.authenticatedContext("attacker_id", { email_verified: true }).firestore();
    await assertFails(attackerDb.doc("study_sets/set_1").set({
      set_id: "set_1",
      owner_id: "victim_id",
      title: "Hijacked Notes",
      source_file_type: "pptx",
      extracted_plain_text: "Some data"
    }));
  });
});
```
