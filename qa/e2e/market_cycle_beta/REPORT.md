# Market User Cycle Beta Report (20260212T131124Z)

- Base API: `http://127.0.0.1:8001/api`
- Marker: `market-beta-20260212T131124Z`
- Verdict: **GO**

## PASS/FAIL Matrix
- [x] Buyer account setup/login(create-or-login) — **PASS** (`signup=200, login=403`)
- [x] Buyer authenticated session — **PASS**
- [x] Coordinate with Alpha seller account — **PASS**
- [x] Browse/search/filter/detail journey — **PASS**
- [x] Archived listing hidden from browse — **PASS**
- [x] Sold listing appears as unavailable in browse — **PASS**
- [x] Cart -> checkout -> order history/detail — **PASS**
- [x] Seller-side flow: sale visibility + buyer receives status update — **PASS**
- [x] Buyer/seller messaging interaction — **PASS**
- [x] Edge guards: sold/archived + invalid quantity/pricing blocked — **PASS** (`sold=400, archived=400, qty=400, price=400`)
- [x] Privacy: buyer cannot access another buyer order — **PASS** (`order2_create=200, cross_access=404`)

## Key IDs
- buyer_id: `f691c364-bee7-4f90-b67a-365beb40ec83`
- buyer2_id: `30ff83c7-1a97-4ecc-8d35-42f7dc73a3b9`
- seller_id: `c3cfc846-1bbb-4182-bd60-83d66dc4565d`
- listing_id: `6813e6b5-533a-4265-93b6-2a664e1d9cbc`
- sold_listing_id: `b7601370-f9fd-4108-9329-eb370d6234da`
- archived_listing_id: `a3c928cb-638a-4299-b28c-b399ebc4edf2`
- order_id: `2a7fece7-e03c-4d4a-817f-aabcb8b2720b`
- order2_id: `23beb50f-36d9-4172-8c7b-8a6493704d75`

## Residual Risks
- Buyer account verification still requires email channel; QA uses local JWT continuity for fresh users.
- No inventory stock counters per listing, so out-of-stock logic is approximated via sold/archived status.
