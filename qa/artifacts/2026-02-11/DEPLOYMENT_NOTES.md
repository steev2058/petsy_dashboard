# Deployment Notes — 2026-02-11

## Branching / safety
- Work executed on `qa/autofix-20260211`.
- `main` was not used for direct commits or pushes.

## Runtime separation
- Staging backend/API on `:18000`.
- Staging frontend web on `:18001`.
- Production runtime was not modified.

## Secret hygiene
- Added `backend/.env.example` placeholder template.
- `.gitignore` hardened to keep `backend/.env` untracked while allowing `.env.example`.

## Pre-merge checks recommended
1. Re-run automated API suite against deployment candidate.
2. Run targeted manual UI exploratory on auth/admin/friends/notifications screens.
3. Confirm no tracked secrets before merge:
   - `git ls-files | grep -E '\.env($|\.)'`
4. Ensure CI build/test green.
