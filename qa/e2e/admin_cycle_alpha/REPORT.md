# Admin Deep Cycle Alpha Report (20260212T153055Z)

- Base: `http://127.0.0.1:8001/api`
- Marker: `alpha-admin-cycle-20260212T153055Z`
- Admin: `admin@petsy.com` (`cf2af5c6-3ec3-4247-b43e-ff8be5f86e65`)
- Beta user: `alpha.user.1770910255@example.com` (`6000f5e2-fb25-4116-b1e4-599c2b9a5bde`)
- Vet actor: `alpha.vet.1770910255@example.com` (`f694e7f5-3c9c-4cb1-939f-c8b7c87a1a35`)
- Clinic actor: `alpha.clinic.1770910255@example.com` (`4c502561-40ea-4e3f-a345-1b8abe0e6566`)
- Market actor: `alpha.market.1770910255@example.com` (`e05f0e2a-9077-4705-845b-aa29712d5b85`)
- Target user: `alpha.target.1770910255@example.com` (`9ef02715-e265-4379-af3f-f7b4716ea2c5`)

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
- friend_report_id: `876345e0-1ced-4693-98d3-28eaf1e80ac0`
- market_listing_id: `bf22266a-a99d-46aa-b4c6-efd28b675f57`
- community_post_id: `1e4fac08-91b1-470f-94f6-eec2464ed690`
- role_request_ids: `{"vet_actor": "db1364c0-e9b0-4f80-8b6e-21be87d4ccb3", "clinic_actor": "8533f1f6-0caa-46ab-a0b3-db62110878af", "market_actor": "2154f870-2c7b-40a9-9ca2-ea208010bcf3"}`

## Blockers
- none
