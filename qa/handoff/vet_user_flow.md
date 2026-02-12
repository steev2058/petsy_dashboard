# Vet/User Flow Handoff (Alpha <-> Beta)

Updated: 2026-02-12T12:01:45Z

## Beta Update (normal USER against demo.vet@petsy.com)
- run_id: `20260212T120025Z`
- artifacts:
  - `qa/e2e/vet_flow_beta/REPORT.md`
  - `qa/e2e/vet_flow_beta/evidence.json`
- beta_user_id: `77b18f80-48a2-4e36-bdfe-0dd9a7bc8db6`
- beta_email: `beta.vetflow.1770897625@example.com`
- vet_user_id: `1382dcc7-3cd5-4be2-b4e9-8bad76a7d864` (`demo.vet@petsy.com`)

## Scenario coverage + key entities
- 3 pets (exactly):
  - `c3dd3c9c-b22c-4a9a-82f3-dfd3d2da5135` (Milo)
  - `8937ac8b-73d4-4ebd-81ae-6a334cfbbb2c` (Luna)
  - `1cf7609d-3f7b-4f8f-a52d-edbe5647da3c` (Kiwi)
- Appointment IDs:
  - `56d8b1f1-810e-456e-8a43-91030fc57af9`
  - `1b1364eb-7fa4-4175-a0ec-ea581f273459`
  - `85738eaf-e685-4dae-8397-206e5df28080` (cancelled)
- Chat conversation_id: `d6d2fe78-d712-4321-8cd6-1a6bca4783e8` (two-way messages present)
- Care request IDs:
  - `48184dde-8d1c-4d16-9b09-4c5355487ce9`
  - `8a545aae-0dab-4827-8eed-4fa2cf8ff768`
  - `15bbf200-e4e7-4a02-93e4-f8959af8959c`

## PASS/FAIL
- PASS: exactly 3 pets under one user
- PASS: 3 appointment creations (distinct reason strings)
- PASS: cancel supported + reflected
- FAIL: reschedule unsupported (`PUT /appointments/{id}` => 405)
- PASS: vet visibility of counterpart appointments
- PASS: user<->vet two-way chat follow-up
- PASS: care request lifecycle (accept/start/complete)
- PASS: timeline events + per-pet health record sync after complete
- PASS: notifications visible for care status updates

## Blocker
- Initial blocker resolved on branch `qa/vet-followup-cycle-20260212-b` by adding `PUT /appointments/{appointment_id}` for owner reschedule.

## Beta Retest After Fix
- run_id: `20260212T120139Z`
- artifacts:
  - `qa/e2e/vet_flow_beta/REPORT.md`
  - `qa/e2e/vet_flow_beta/evidence.json`
- result: all checks PASS, blocker cleared.
- latest key ids:
  - conversation_id: `4b51fd2b-e0a9-4179-a62a-19048e7b3feb`
  - appointments: `743191c1-35ab-4584-8c2d-e706030141db`, `c6d4de91-1431-4830-9218-727c62ae8991`, `db745433-efb2-412b-908f-3eeb3a8f86c2`
  - care requests: `9771b7cf-f05c-433c-848a-02bb4912b0d4`, `376ada76-f43e-4943-b6e6-f4ea5989e577`, `21c3e205-6653-4ded-9af0-0132d0a4344f`
