# Alpha -> Beta admin flow handoff

- run_id: `20260212T153055Z`
- branch: `qa/admin-cycle-20260212-a`
- status: `GO`

## Seeded entities
- friend_report_id: `876345e0-1ced-4693-98d3-28eaf1e80ac0`
- market_listing_id: `bf22266a-a99d-46aa-b4c6-efd28b675f57`
- community_post_id: `1e4fac08-91b1-470f-94f6-eec2464ed690` (deleted by admin)
- role_request_ids:
  - vet_actor: `db1364c0-e9b0-4f80-8b6e-21be87d4ccb3`
  - clinic_actor: `8533f1f6-0caa-46ab-a0b3-db62110878af`
  - market_actor: `2154f870-2c7b-40a9-9ca2-ea208010bcf3`

## Backend fixes applied in this cycle
1) `/admin/users/{user_id}` now returns `404 User not found` when ID does not exist.
2) `/admin/marketplace/listings/{listing_id}/status` now returns `404 Listing not found` when ID does not exist.
3) Admin community moderation now operates on `community` collection (aligned with create/read), and delete returns 404 if missing.

## Beta follow-up focus
- Verify admin UI reflects these backend fixes (especially missing-ID handling and community moderation visibility).
- Confirm admin audit logs capture role change + friend report + listing status action rows.
- Re-validate non-admin denial for `/admin/*` routes from real user sessions.
