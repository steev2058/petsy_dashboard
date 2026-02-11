# QA Inventory — 2026-02-11

## Branch
- `qa/autofix-20260211`

## Staging runtime (isolated)
- Backend/API: `http://127.0.0.1:18000` (uvicorn)
- Frontend (Expo web): `http://127.0.0.1:18001`
- Reserved extra staging port (frontend tooling): `18002`

## Evidence artifacts
- `qa/artifacts/2026-02-11/evidence/phase_results.json`

## Scope covered
- Runbook phases 0..9 executed with concrete API evidence.
- Admin + role workflow + friends/privacy/messaging executed using 4 QA accounts.
- Secret hygiene audit + fix committed.

## Notes
- Production runtime was not touched; staging ports only.