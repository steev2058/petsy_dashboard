# Final Alpha E2E Report (20260212T115311Z)

- Branch: `qa/final-launch-cycle-20260212-a`
- Base API: `http://127.0.0.1:8001/api`
- Actor role: `clinic`

## Scope Executed
- Login (admin/vet/clinic/market) using seeded accounts
- Friend + chat interaction (seeded clinic -> seeded vet, with counterpart message visibility)
- Beta coordination ping via `qa/handoff/e2e_agents.md` (friend request + direct open attempt)
- Purchase/order flow using Beta listing id
- Sponsorship flow using Beta pet id
- Appointment booking flow via vets directory

## Pass/Fail Matrix
- [x] login_admin — **PASS**
- [x] login_vet — **PASS**
- [x] login_clinic — **PASS**
- [x] login_market — **PASS**
- [x] friend_request_seeded — **PASS**
- [x] friend_accept_seeded — **PASS**
- [x] open_direct_seeded — **PASS**
- [x] send_chat_message_seeded — **PASS**
- [x] chat_visible_to_counterpart_seeded — **PASS**
- [x] beta_handoff_ping_attempted — **PASS**
- [x] create_order — **PASS**
- [x] order_visible_to_buyer — **PASS**
- [x] create_sponsorship — **PASS**
- [x] sponsorship_visible_to_creator — **PASS**
- [x] sponsorship_visible_on_pet_feed — **PASS**
- [x] list_vets — **PASS**
- [x] create_appointment — **PASS**
- [x] appointment_visible_to_booker — **PASS**

## Key IDs
- friend_request_id_beta: `4d17865b-1b86-446f-bc3a-ae630aaf882b`
- beta_direct_open_status: `403`
- friend_request_id_seeded: `None`
- seeded_conversation_id: `13907a7f-935d-4c31-910c-60c450215dd9`
- order_id: `63cf6c06-207b-403d-ade1-72b345aa034b`
- sponsorship_id: `aa3a7643-8a13-4b91-9087-8c6796cafcae`
- appointment_id: `b1925acc-3b2a-42a0-8712-e0d43af3bed2`
- selected_vet_id: `29904761-d70f-44f2-a803-573e4ac9570f`

## Fixes Applied During Run
- SPONSORSHIP_PET_FEED_500_AND_VISIBILITY: fixed in backend endpoint and retested PASS.

## Final Alpha Status
**GO** (Alpha-side flows pass after fix and retest).
