# Alpha -> Beta Handoff (2026-02-12)

## Branch
- `qa/alpha-petsy-launch-20260212`

## What Alpha changed
- Hardened auth code responses to prevent verification/reset code leakage by default.
- Added object-level authorization on health records endpoint.
- Added automated security/RBAC regression tests:
  - `tests/test_api_security_rbac.py`

## Key commit
- `634e518` — security(auth): stop leaking verification/reset codes by default

## Files added/updated
- `backend/server.py`
- `tests/test_api_security_rbac.py`
- `qa/alpha/API_RBAC_MATRIX.md`
- `qa/alpha/BUGS_AND_FIXES.md`
- `qa/alpha/SECURITY_RUNTIME_CHECKS.md`
- `qa/alpha/TEST_EVIDENCE.md`

## How to run Alpha tests
```bash
backend/.venv/bin/python -m pytest -q tests/test_api_security_rbac.py
```

## Suggested Beta follow-ups
1. Enforce mandatory strong `JWT_SECRET` at startup (fail-fast).
2. Add rate limiting/abuse protection on auth endpoints.
3. Convert deprecated `datetime.utcnow()` usage to timezone-aware UTC.
4. Expand role matrix tests to `vet`, `market_owner`, `care_clinic` endpoints.

## Context
- `qa/handoff/beta_to_alpha.md` was not present during this Alpha run.
