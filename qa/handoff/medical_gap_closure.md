# Handoff: Medical Gap Closure (Alpha -> Beta)

## Branch
- `qa/close-medical-gaps-20260212-a`

## What Alpha Implemented
- Medical attachment APIs in `backend/server.py`:
  - `POST /api/medical-attachments/upload`
  - `POST /api/medical-attachments/{attachment_id}/attach`
  - `GET /api/medical-attachments`
  - `GET /api/medical-attachments/{attachment_id}/download`
  - `DELETE /api/medical-attachments/{attachment_id}`
- Context support: care requests, appointments, health records.
- Authorization: owner, assigned vet, admin only.
- Validation: mime allowlist + 10MB max + non-empty check.
- Secure storage path: `backend/uploads/medical/<owner>/<YYYY>/<MM>/...`.
- Metadata model persisted in `medical_attachments` collection.
- Care timeline linkage: upload to care request inserts `care_request_events` (`medical_attachment_uploaded`).
- Minimal reminder simulation endpoint:
  - `POST /api/appointments/{appointment_id}/reminders/simulate`
  - Writes `appointment_reminders` + in-app notification evidence.

## Tests Added
- `tests/test_medical_attachments_api.py`
  - upload/list/download/delete auth path (owner/vet/blocked outsider)
  - file type validation and attach flow
  - reminder simulation evidence

## Artifacts
- `qa/e2e/medical_gap_closure_alpha/REPORT.md`
- `qa/e2e/medical_gap_closure_alpha/matrix.json`
- `qa/e2e/medical_gap_closure_alpha/raw_evidence/*`
- `qa/e2e/medical_gap_closure_alpha/api_examples/medical_attachments.http`

## Beta Requested Follow-up (if time)
- Confirm frontend wiring to new endpoints.
- Evaluate migration to object storage + signed access URLs.
- Add antivirus/content scanning before persistence for production hardening.
