# Admin Deep Cycle Alpha Report (20260212T165807Z)

- Base: `http://127.0.0.1:8001/api`
- Marker: `alpha-admin-cycle-20260212T165807Z`
- Admin: `admin@petsy.com` (`cf2af5c6-3ec3-4247-b43e-ff8be5f86e65`)
- Beta user: `alpha.user.1770915488@example.com` (`0c9c87d3-f0c9-4abc-baa6-c329cde3aceb`)
- Vet actor: `alpha.vet.1770915488@example.com` (`5abca839-14c7-4610-83f6-47d91c913202`)
- Clinic actor: `alpha.clinic.1770915488@example.com` (`98c84b87-8eea-4caf-b733-61f0c5451db6`)
- Market actor: `alpha.market.1770915488@example.com` (`c818e9a6-76f5-438e-b7fc-6a29ffeba622`)
- Target user: `alpha.target.1770915488@example.com` (`7675e4be-373e-4dbc-b244-3e1f4a5c5a0a`)

## PASS/FAIL Matrix
- [x] Admin auth/session valid and admin role visible — **PASS**
- [x] Role management: admin can view users and update+rollback user role — **PASS**
- [x] Governance boundary: non-admin actors denied on admin endpoints — **PASS**
- [x] Friend moderation: block_target prevents DM — **PASS**
- [x] Marketplace moderation: archived listing hidden publicly and visible archived to owner — **PASS**
- [x] Community moderation: admin can view and delete community post — **PASS**
- [x] Operational admin: audit log filters and admin notifications visible — **PASS**
- [x] Role-request decisions reflected in user role and requester history — **PASS**
- [x] Notifications propagated to impacted actors — **PASS**
- [x] Governance boundary: non-admin denied admin audit logs — **PASS**
- [x] High-risk negatives: invalid role, missing IDs, malformed payloads rejected — **PASS**

## Key IDs
- friend_report_id: `24a4dc7d-3e8b-4780-bc3c-f9c631ecb952`
- market_listing_id: `01557afc-65aa-4ba3-bc96-5d9289bd0e13`
- community_post_id: `ada2ace2-d153-4b0e-bf33-09093c93faf0`
- role_request_ids: `{"vet_actor": "65ef4003-9b0b-4ea3-a89b-ba77613c3451", "clinic_actor": "aeae60e4-d878-45b2-9620-937dd00c59aa", "market_actor": "8ccf80db-646b-4171-8b88-994c428fa09c"}`

## Blockers
- none
