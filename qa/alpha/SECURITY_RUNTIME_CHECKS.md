# Security Runtime Checks (Alpha)

Date: 2026-02-12

## Executed checks

1. **Auth leakage checks**
   - Signup response does not expose verification code by default.
   - Forgot-password response does not expose reset code by default.
   - Verified with automated tests.

2. **RBAC checks**
   - Non-admin user denied access to admin endpoint (`/api/admin/marketplace/listings`) with 403.
   - Admin user allowed (200).

3. **Object-level authorization checks**
   - Health records endpoint enforces pet ownership.
   - Non-owner access denied.

4. **Regression sanity after fix**
   - Owner can still read own health records.
   - Normal signup → verify → login flow still works.

## Security posture notes

### Positive
- Admin dependency guard is consistently used for key admin endpoints.
- Sensitive auth code responses are now opt-in for local/dev only.

### Remaining risks
- JWT secret fallback still insecure if deployment misses `JWT_SECRET`.
- No anti-automation/rate-limit protection on login/reset endpoints.
- No account lockout strategy observed for repeated failed logins.

## Recommended immediate pre-launch actions
1. Make `JWT_SECRET` mandatory in startup validation (fail-fast if unset/weak).
2. Add request throttling for auth routes (`signup`, `login`, `forgot-password`, `verify`).
3. Add security regression tests to CI on every PR.
