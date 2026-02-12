# API RBAC Matrix (Alpha)

Date: 2026-02-12  
Branch: `qa/alpha-petsy-launch-20260212`

## Scope covered
Focused backend/API auth + RBAC checks with automated verification on critical routes.

| Endpoint | Method | Role: unauth | Role: user | Role: admin | Notes |
|---|---|---:|---:|---:|---|
| `/api/auth/signup` | POST | ✅ | ✅ | ✅ | Public registration. Hardened response no longer leaks verification code by default. |
| `/api/auth/login` | POST | ✅ | ✅ | ✅ | Requires verified account to log in. |
| `/api/auth/forgot-password` | POST | ✅ | ✅ | ✅ | Public; now no reset code leakage by default. |
| `/api/admin/marketplace/listings` | GET | ❌ 403 | ❌ 403 | ✅ 200 | Verified in tests (`test_rbac_admin_endpoint_user_forbidden_admin_allowed`). |
| `/api/health-records/{pet_id}` | GET | ❌ 401 | ✅ owner only | ❌ non-owner (404) | Fixed IDOR-style data exposure: now enforces pet ownership before reading records. |

## Role model observations
- Primary admin gate is `get_admin_user()` checking `is_admin` OR role=`admin`.
- Secondary role utility `require_roles(*roles)` exists for feature roles.
- Most admin endpoints correctly use `Depends(get_admin_user)`.

## Gaps / residual risk
- JWT secret currently has insecure fallback default in code (`petsy-secret-key-2025`), creating a deployment misconfiguration risk if env var is missing.
- No explicit rate limiting on auth endpoints (`signup`, `login`, `forgot-password`).
