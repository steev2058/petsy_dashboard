# Vet verification flow evidence (2026-02-16)

## Scenario 1: approve role -> profile auto-created pending_verification
- Admin approves role request (`PUT /api/admin/role-requests/{id}` action=approve, target_role=vet)
- Expected/implemented backend side effects:
  - user.role => vet
  - `ensure_vet_profile(user_id)` called
  - profile status forced to `pending_verification`, `verified=false`, `is_public=false`

## Scenario 2: vet edits profile -> submit -> appears in admin pending queue
- Vet opens `/vet-profile`, updates required fields, presses Submit.
- API sequence:
  - `PUT /api/vet-profile/me`
  - `POST /api/vet-profile/me/submit`
- Expected result:
  - profile status `pending_verification`
  - visible under admin queue `GET /api/admin/vet-profiles?status=pending_verification`

## Scenario 3: admin approve -> appears in directory
- Admin action: `PUT /api/admin/vet-profiles/{profile_id}` action=approve
- Optional: set public with `action=set_public`, `is_public=true`
- Public API check:
  - `GET /api/vets` returns only records with active+verified+public

## Scenario 4: admin reject -> vet sees notes and can resubmit
- Admin action: reject with `verification_notes`
- Vet side:
  - `/vet-profile` banner shows rejected notes
  - user can Save edits and Submit again

## Scenario 5: suspend/block behavior
- Suspend profile (`action=suspend`) removes from public directory (status no longer active)
- Account block/unblock uses existing endpoints:
  - `POST /api/admin/users/{user_id}/block`
  - `DELETE /api/admin/users/{user_id}/block`
- Block signal is visible to admin queue user metadata and can be toggled from queue UI
