# Final Alpha E2E Cycle (20260212T115311Z)

- Base: `http://127.0.0.1:8001/api`
- Actor: `clinic`

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

## Key Entities
- friend_request_id_beta: `4d17865b-1b86-446f-bc3a-ae630aaf882b`
- beta_direct_open_status: `403`
- friend_request_id_seeded: `None`
- seeded_conversation_id: `13907a7f-935d-4c31-910c-60c450215dd9`
- order_id: `63cf6c06-207b-403d-ade1-72b345aa034b`
- sponsorship_id: `aa3a7643-8a13-4b91-9087-8c6796cafcae`
- appointment_id: `b1925acc-3b2a-42a0-8712-e0d43af3bed2`
- selected_vet_id: `29904761-d70f-44f2-a803-573e4ac9570f`

## Blockers Observed
- none

## Raw Request Snippets
- `POST /auth/login` => 200
- `GET /auth/me` => 200
- `POST /auth/login` => 200
- `GET /auth/me` => 200
- `POST /auth/login` => 200
- `GET /auth/me` => 200
- `POST /auth/login` => 200
- `GET /auth/me` => 200
- `POST /friends/requests` => 200
- `GET /friends/requests` => 200
- `POST /conversations/direct/1382dcc7-3cd5-4be2-b4e9-8bad76a7d864` => 200
- `POST /conversations/13907a7f-935d-4c31-910c-60c450215dd9/messages` => 200
- `GET /conversations/13907a7f-935d-4c31-910c-60c450215dd9/messages` => 200
- `POST /friends/requests` => 200
