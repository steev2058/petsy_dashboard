# Final Beta Reciprocal Full-Cycle Report (20260212T115315Z)

- Base: `http://127.0.0.1:8001/api`
- Marker: `beta-final-20260212T115315Z`

## PASS/FAIL Matrix
- [x] Seeded role logins (admin/vet/clinic/market) — **PASS**
- [x] Reciprocal chat accept/respond (clinic <-> market) — **PASS**
- [x] Seller perspective sees purchase via /orders/sales — **PASS**
- [x] Sponsorship owner sees pending lifecycle state — **PASS**
- [x] Sponsorship transitions to completed and remains visible — **PASS**
- [x] Vet/provider sees counterpart appointment — **PASS**

## Key Entity IDs
- conversation_id: `b49d9152-33da-4a3d-a6e2-4f573a9cb1f9`
- listing_id: `79b580bb-ae3e-4873-b2d2-b58b5a8064b4`
- order_id: `1e549a8f-2424-481a-8d88-203323b06b7e`
- pet_id: `1daffa26-bc07-42e5-b45b-636af1cf20c7`
- sponsorship_id: `1da8266d-8ba3-4674-b74e-81f405bc7125`
- appointment_id: `bfc3e2fd-d91c-4342-8378-f83d34d596ce`

## Notes
- This run uses seeded role accounts only.
- Seller visibility validated via newly added `/orders/sales` endpoint.
- Sponsorship lifecycle validated via owner visibility + status transition endpoint.
- Vet perspective validated via broadened `/appointments` query (vet_id visibility).
