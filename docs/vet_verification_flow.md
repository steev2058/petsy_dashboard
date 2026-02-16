# Vet Verification Flow

## States
- `draft`
- `pending_verification`
- `active`
- `rejected`
- `suspended`

Public directory visibility requires:
- `status=active`
- `verified=true`
- `is_public=true`

## Backend endpoints
- `POST /api/role-requests` (target_role=`vet`)
- `PUT /api/admin/role-requests/{request_id}` (approve/reject)
  - approve (vet): sets user role to `vet`, ensures `vet_profiles` row, sets profile to `pending_verification`, `verified=false`, `is_public=false`
- `GET /api/vet-profile/me`
- `PUT /api/vet-profile/me`
- `POST /api/vet-profile/me/submit`
- `GET /api/vets?q=&city=&pet_type=&sort=top_rated|nearest`
- `GET /api/admin/vet-profiles?status=&q=&city=`
- `PUT /api/admin/vet-profiles/{profile_id}` with action:
  - `approve`
  - `reject` (requires `verification_notes`)
  - `suspend`
  - `activate`
  - `set_public` (`is_public=true` only if active+verified)

## UI behavior
- Vet role users:
  - Use `/vet-profile` screen to edit profile
  - Save => draft
  - Submit => pending verification
  - Rejected => notes shown + resubmit available
- Home banners:
  - draft/missing fields => complete profile CTA
  - pending => under review
  - rejected => fix + resubmit
  - suspended => contact admin
- Admin:
  - `/admin/vet-profiles` verification queue
  - filters pending/active/rejected/suspended
  - actions approve/reject/suspend/public toggle
  - account block/unblock via existing admin user block endpoints

## Notes
- Legacy `vets` collection kept as compatibility fallback, but public listing is restricted to verified+active+public records.
