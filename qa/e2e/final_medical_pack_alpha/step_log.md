# Final Medical Pack Alpha (20260212T123634Z)

- Status: **GO**
- Base: `http://127.0.0.1:8001/api`

## Matrix
- [x] Slogin: login_vet — **PASS**
- [x] Slogin: login_clinic — **PASS**
- [x] Slogin: login_market — **PASS**
- [x] S1_no_show: vet_can_mark_no_show — **PASS**
- [x] S2_vet_cancel_reject_reason: reason_visible_to_user — **PASS**
- [x] S3_followup_chain: visit_series_continuity — **PASS**
- [x] S4_attachments_messages: api_support_or_gap_documented — **PASS**
- [x] S5_treatment_versioning: version_increments_and_history — **PASS**
- [x] S6_authorization: cross_user_cross_role_denied — **PASS**
- [x] S7_concurrency: one_conflicting_transition_rejected — **PASS**
- [x] S8_payment_link: payment_auto_confirms_appointment — **PASS**
- [x] S9_reminders: feature_exists_or_backlog — **PASS**
- [x] S10_mobile_webview: bearer_json_api_compatible — **PASS**

## Blockers / Gaps
- REMINDERS_BACKLOG: No automated appointment reminder job/endpoint observed in API.

## Key IDs
- pet_id: `dc441305-86f8-4405-9484-8ad973998f35`
- no_show_appt_id: `8fedcdf9-19cc-4076-9bdc-701366e9592e`
- reject_appt_id: `212f30be-8252-45c0-9fd8-773161302312`
- series_id: `cc5be5da-e8dd-4ef0-97bb-d9f2bf68d9d9`
- care_id: `6b4e14dd-e294-4553-b5a1-4e8737d62fd8`
- treatment_appt_id: `7540de0d-f5f1-4ea0-8e56-1dee0ccc5fde`
- payment_appt_id: `c98b84e6-81a0-48ed-9cfd-16683272bf7c`

## Notes
- Attachments in care request updates are not persisted in current schema; captured as API gap.
- Reminder automation not exposed as API feature; logged backlog item.
