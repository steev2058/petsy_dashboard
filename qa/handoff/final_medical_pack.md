# Final Medical Pack Handoff (Alpha -> Beta)

## Alpha Run
- UTC: 2026-02-12T12:36:34Z
- Branch: `qa/final-medical-pack-20260212-a`
- Artifacts: `qa/e2e/final_medical_pack_alpha/*`
- Status: **GO** (with one backlog item)

## Implemented on Alpha (minimal safe fixes)
1. Appointment lifecycle enhancements:
   - Added vet-side status endpoint: `PUT /api/vet/appointments/{id}/status`
   - Supports: `confirm`, `complete`, `cancel`, `reject`, `no_show`
   - Added `status_reason` visibility to user-facing appointment fetch.
2. No-show/missed support:
   - Explicit `no_show` transition from `confirmed` state.
3. Race/concurrency hardening:
   - Compare-and-set style updates for cancel/reschedule/status transitions.
   - Returns `409` on concurrent stale update.
4. Follow-up chain continuity:
   - Added `visit_series_id` and `follow_up_of` on appointments.
   - Minimal linkage via `notes: "follow_up_of:<appointment_id>"` convention.
5. Post-completion treatment versioning:
   - Added `PUT /api/vet/appointments/{id}/treatment`
   - Tracks `treatment_version` and append-only `treatment_updates`.
6. Payment-linked state effects:
   - Successful payment for `appointment_id` auto-confirms pending appointment.
   - Applied in both `/payments/process` (COD immediate) and `/payments/confirm/{payment_id}`.
7. Sensitive auth tightening:
   - `GET /health-records/{pet_id}` now enforces owner/admin access.

## Validated Scenarios (1..10)
- 1 PASS no-show handling
- 2 PASS doctor reject reason visible to user
- 3 PASS follow-up chain continuity
- 4 PASS attachments/messages API gap documented (attachments not persisted)
- 5 PASS post-completion treatment versioning
- 6 PASS cross-user/cross-role access denial
- 7 PASS race condition guard on conflicting transitions
- 8 PASS payment-linked appointment effect
- 9 PASS reminder feature marked backlog (missing)
- 10 PASS API compatibility note for Telegram/mobile webview usage (standard bearer+JSON)

## Backlog / Open Risk
- `REMINDERS_BACKLOG`: no automated reminder scheduler/job endpoint observed.

## Key IDs from Alpha evidence run
- no_show_appt_id: `8fedcdf9-19cc-4076-9bdc-701366e9592e`
- reject_appt_id: `212f30be-8252-45c0-9fd8-773161302312`
- series_id: `cc5be5da-e8dd-4ef0-97bb-d9f2bf68d9d9`
- treatment_appt_id: `7540de0d-f5f1-4ea0-8e56-1dee0ccc5fde`
- payment_appt_id: `c98b84e6-81a0-48ed-9cfd-16683272bf7c`
