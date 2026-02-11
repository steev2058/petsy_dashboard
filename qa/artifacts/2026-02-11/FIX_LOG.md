# Fix Log — 2026-02-11

## BUG-001
- **Commit:** `d147878`
- **Message:** `fix(qa): enforce env secret hygiene with tracked example [BUG-001]`
- **Changes:**
  - Added `backend/.env.example` with safe placeholders
  - Added explicit `.gitignore` overrides:
    - allow `*.env.example`
    - enforce `backend/.env` ignored
- **Retest impacted area:** PASS
  - tracked env check only includes `.env.example`
- **Short smoke regression:** PASS
  - `GET /api/health` => 200
