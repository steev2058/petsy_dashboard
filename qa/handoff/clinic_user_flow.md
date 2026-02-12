# Clinic/User Flow Handoff (Alpha <-> Beta)

Updated: 2026-02-12T15:15:29Z

## Coordination Source
- Primary expected file was missing at start; Alpha used fallback IDs from `qa/handoff/vet_user_flow.md`.

## Alpha Clinic-side Run
- run_id: `20260212T151529Z`
- actor_role: `care_clinic`
- actor_email: `demo.clinic@petsy.com`
- actor_user_id: `97052c92-910f-4061-976f-c8a991cdaaf4`

## Key entities
- care_request_id: `b76fe716-ced2-4300-a603-521917d02231`
- pet_id: `4a2b9e1c-6ae9-4168-a86c-a5a5278ad2ea`
- assigned_vet_id: `1382dcc7-3cd5-4be2-b4e9-8bad76a7d864`
- unrelated_care_request_id_for_authz: `48184dde-8d1c-4d16-9b09-4c5355487ce9`

## Coverage outcome
- PASS: clinic login + queue visibility (`GET /clinic/care-requests`)
- PASS: clinic can assign/reassign vet via clinic endpoint (`PUT /clinic/care-requests/{id}`)
- PASS: timeline integrity across clinic and vet actions
- PASS: vet notifications on assignment and clinic notifications on vet follow-up
- PASS: strict authorization boundaries (clinic blocked from vet endpoint misuse, unrelated timeline, market-owner mutation endpoint, admin endpoint)

## Artifacts
- `qa/e2e/clinic_cycle_alpha/REPORT.md`
- `qa/e2e/clinic_cycle_alpha/pass_fail_matrix.json`
- `qa/e2e/clinic_cycle_alpha/evidence.json`
- `qa/e2e/clinic_cycle_alpha/step_log.md`
- `qa/e2e/clinic_cycle_alpha/raw/*`
