# Admin Governance Beta Report (20260212T152533Z)

- Base: `http://127.0.0.1:8001/api`
- Marker: `beta-admin-cycle-20260212T152533Z`
- Admin: `admin@petsy.com` (`cf2af5c6-3ec3-4247-b43e-ff8be5f86e65`)
- Beta user: `beta.user.1770909934@example.com` (`454a7812-8e2e-4b9b-8c0c-bcb6699782c1`)
- Vet actor: `beta.vet.1770909934@example.com` (`fc899bbf-2184-4ff1-b4b4-e4a9dde58f58`)
- Clinic actor: `beta.clinic.1770909934@example.com` (`18488bb8-c544-4e68-89c4-8085b1fbbe21`)
- Market actor: `beta.market.1770909934@example.com` (`19e1c448-be9f-477b-a817-b5c7ad583acc`)
- Target user: `beta.target.1770909934@example.com` (`fab769ee-6816-4e57-aba6-7a82bda5d13f`)

## PASS/FAIL Matrix
- [x] Non-admin actors denied on admin endpoints — **PASS**
- [x] Friend report moderated: admin block_target prevents DM — **PASS**
- [x] Marketplace moderation reflected: archived hidden from public — **PASS**
- [x] Marketplace moderation reflected to owner listing state — **PASS**
- [x] Role-request admin actions reflected in user roles/status — **PASS**
- [x] Notification propagation after admin actions — **PASS**
- [x] Non-admin cannot access admin audit logs — **PASS**

## Key IDs
- friend_report_id: `d2508de0-f198-4168-a990-63042a8d0015`
- market_listing_id: `858c4862-953c-4bc3-84db-90682bfa6835`
- role_request_ids: `{"vet_actor": "09ed729f-9fdb-4634-8e91-e44b698641e4", "clinic_actor": "4736b036-1816-4eaa-903f-31eeec550a7b", "market_actor": "a2652488-8498-4ef2-8894-8f07211c5fd5"}`

## Blockers
- none
