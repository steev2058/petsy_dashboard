# Bug List — 2026-02-11

## BUG-001 (Medium) — Secret hygiene hardening gap
- **Area:** Security / repository hygiene
- **Severity:** Medium
- **Finding:** Repo ignored `.env` patterns, but lacked explicit tracked `.env.example` allow-list and explicit backend `.env` guard rule in `.gitignore`, increasing risk of accidental secret commits.
- **Repro:**
  1. Inspect `.gitignore` env section; no explicit `!*.env.example` override.
  2. Team cannot safely commit template env files without ignore conflicts.
- **Fix:** Added strict overrides + template file.
- **Evidence:**
  - Commit `d147878`
  - `backend/.env.example`
  - `.gitignore` QA secret hygiene override block
- **Retest:**
  - `git ls-files | grep -E '\.env($|\.)'` returns only `backend/.env.example` ✅
  - Staging smoke health still 200 ✅
