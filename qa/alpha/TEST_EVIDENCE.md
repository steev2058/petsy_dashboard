# Test Evidence (Alpha)

Date: 2026-02-12  
Environment: local branch `qa/alpha-petsy-launch-20260212`

## Automated suite executed

Command:
```bash
backend/.venv/bin/python -m pytest -q tests/test_api_security_rbac.py
```

Result:
- `4 passed, 31 warnings in 12.03s`

## Tests covered

1. `test_auth_code_not_leaked_by_default`
   - Validates signup response does not include `verification_code` by default.

2. `test_rbac_admin_endpoint_user_forbidden_admin_allowed`
   - Confirms role matrix behavior on admin endpoint:
     - user -> 403
     - admin -> 200

3. `test_health_records_require_pet_ownership`
   - Confirms object-level authorization:
     - owner -> 200
     - non-owner -> 404

4. `test_forgot_password_does_not_leak_reset_code`
   - Confirms forgot-password response does not leak `reset_code` by default.

## Negative-path checks included
- Non-admin attempting admin route access.
- Non-owner attempting health-record read.
- Sensitive-code response leakage prevention.

## Notes
- Warnings include deprecated `datetime.utcnow()` usage and JWT key-length warning from fallback secret; tracked as residual hardening risk.
