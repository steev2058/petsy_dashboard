# Bugs and Fixes (Alpha)

Date: 2026-02-12

## 1) Auth code leakage in production-like mode
**Severity:** High  
**Area:** Auth / account takeover surface

### Problem
`/api/auth/signup`, `/api/auth/resend-verification`, and `/api/auth/forgot-password` returned verification/reset codes in API responses whenever SMTP was not configured or failed.

### Impact
An attacker able to trigger these flows could bypass email proof of possession and reset/verify accounts directly.

### Fix
Introduced strict default behavior:
- New flag: `ALLOW_INSECURE_AUTH_CODE_RESPONSE` (default `false`)
- Verification/reset codes are only returned when this flag is explicitly enabled.
- Default responses no longer include sensitive codes.

### Evidence
- Automated tests assert no `verification_code`/`reset_code` leakage by default.

---

## 2) Health records authorization gap (IDOR-style)
**Severity:** High  
**Area:** Data privacy / medical records

### Problem
`GET /api/health-records/{pet_id}` previously fetched records by `pet_id` only, without verifying the requesting user owned the pet.

### Impact
Any authenticated user knowing/guessing a `pet_id` could read another user’s pet health records.

### Fix
Endpoint now checks pet ownership before data fetch:
- `db.pets.find_one({"id": pet_id, "owner_id": current_user["id"]})`
- Returns `404` if pet is not owned by requester.

### Evidence
- Automated test verifies owner gets `200`; non-owner gets `404`.

---

## Not fixed in this pass (tracked risk)
1. JWT secret fallback default remains weak and static if env var is missing.
2. Missing rate limiting / abuse throttling on auth endpoints.
3. Existing unrelated frontend modifications were present in working tree; not touched by Alpha commit.
