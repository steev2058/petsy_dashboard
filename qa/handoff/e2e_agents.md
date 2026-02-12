# E2E Agent Handoff (User A <-> User B)

Updated: 2026-02-12T11:36:06.290557+00:00

## User B Prepared Data
- user_id: `f106f48e-de19-4340-829b-3d9005d8ef7e`
- email: `beta.userb.1770896163@example.com`
- pet_id (sponsorship target): `e03a504c-8412-49c6-a623-29634e6659fc`
- listing_goods_id: `15c1f4b2-d9dd-4028-a7ec-3dd70f6299a4`
- listing_service_id: `96bee529-929a-4eac-a55e-cc1b29d72c8d`

## Coordination Notes for User A
- Send friend request to `user_id` above and ping in this file with request_id.
- Start direct conversation and send one message so User B can confirm receipt.
- Use `listing_goods_id` for order creation (current backend does not notify seller; expected blocker).
- Create sponsorship against `pet_id` (currently remains pending, not visible via pet endpoint until completed).
- Create appointment using `vet_id=<userB_id>` to validate counterpart visibility blocker.

## Beta Side-B Final Update (2026-02-12T11:53Z)
- Completed reciprocal cycle with seeded roles (`demo.clinic`, `demo.market`, `demo.vet`, `admin`).
- Friend/chat reciprocal path validated on conversation_id `b49d9152-33da-4a3d-a6e2-4f573a9cb1f9`.
- Seller purchase visibility now validated via `/orders/sales` (order_id `1e549a8f-2424-481a-8d88-203323b06b7e`).
- Sponsorship lifecycle now visible for owner and transitionable (`1da8266d-8ba3-4674-b74e-81f405bc7125`: pending -> completed).
- Vet-side appointment visibility now validated for `vet_id` counterpart (`bfc3e2fd-d91c-4342-8378-f83d34d596ce`).
- Artifacts: `qa/e2e/final_beta/REPORT.md`, `qa/e2e/final_beta/evidence.json`.

## Alpha Update 2026-02-12T11:48:40.270272+00:00
- actor_role: `clinic` / actor_user_id: `97052c92-910f-4061-976f-c8a991cdaaf4`
- friend_request_id_to_userB: `4d17865b-1b86-446f-bc3a-ae630aaf882b`
- conversation_id: `None`
- order_id_using_listing_goods_id: `352971ab-ceb6-444e-884e-8dfb22b7aeee`
- sponsorship_id_on_pet: `e0bf71d6-0c15-49ae-913d-32ae32acb0db`
- appointment_id_with_vet: `9fd3cdca-1375-4e8d-8028-a90b2c951df3`
- Notes: sponsorship remains pending/not surfaced on pet feed; seller-side order visibility still unavailable from Alpha side.

## Alpha Update 2026-02-12T11:49:56.052904+00:00
- actor_role: `clinic` / actor_user_id: `97052c92-910f-4061-976f-c8a991cdaaf4`
- friend_request_id_to_userB: `4d17865b-1b86-446f-bc3a-ae630aaf882b`
- beta_direct_open_status: `403` (403 expected before acceptance)
- seeded_friend_request_id_to_vet: `6ea4ac20-7572-4d5c-b4a5-819934d75f7c`
- seeded_conversation_id: `13907a7f-935d-4c31-910c-60c450215dd9`
- order_id_using_listing_goods_id: `bc015336-30a2-4f35-aa69-67ed42bb5731`
- sponsorship_id_on_pet: `a0368edd-b3e6-4f6f-b35d-17ca878f147f`
- appointment_id_with_vet: `72cbb37d-2b53-4974-9dc5-f2f6e4b17758`
- Notes: sponsorship remains pending/not surfaced on pet feed; seller-side order visibility still unavailable from Alpha side.

## Alpha Update 2026-02-12T11:50:49.288520+00:00
- actor_role: `clinic` / actor_user_id: `97052c92-910f-4061-976f-c8a991cdaaf4`
- friend_request_id_to_userB: `4d17865b-1b86-446f-bc3a-ae630aaf882b`
- beta_direct_open_status: `403` (403 expected before acceptance)
- seeded_friend_request_id_to_vet: `None`
- seeded_conversation_id: `13907a7f-935d-4c31-910c-60c450215dd9`
- order_id_using_listing_goods_id: `b24dd426-65f4-42b4-9ed6-b2ba1fa8b93d`
- sponsorship_id_on_pet: `92f5b52e-d502-41cd-b0cf-37f498acebd5`
- appointment_id_with_vet: `bb5055a5-12da-4b6d-ab59-3ac391d9dabc`
- Notes: sponsorship remains pending/not surfaced on pet feed; seller-side order visibility still unavailable from Alpha side.

## Alpha Update 2026-02-12T11:51:31.224111+00:00
- actor_role: `clinic` / actor_user_id: `97052c92-910f-4061-976f-c8a991cdaaf4`
- friend_request_id_to_userB: `4d17865b-1b86-446f-bc3a-ae630aaf882b`
- beta_direct_open_status: `403` (403 expected before acceptance)
- seeded_friend_request_id_to_vet: `None`
- seeded_conversation_id: `13907a7f-935d-4c31-910c-60c450215dd9`
- order_id_using_listing_goods_id: `5632c8f0-8214-4ea9-a768-80f0671850e9`
- sponsorship_id_on_pet: `618efb00-ebf2-4b41-a63d-a9b566af093e`
- appointment_id_with_vet: `e9599787-4d96-4b8f-8610-3de20a30bafd`
- Notes: sponsorship remains pending/not surfaced on pet feed; seller-side order visibility still unavailable from Alpha side.

## Alpha Update 2026-02-12T11:52:09.004800+00:00
- actor_role: `clinic` / actor_user_id: `97052c92-910f-4061-976f-c8a991cdaaf4`
- friend_request_id_to_userB: `4d17865b-1b86-446f-bc3a-ae630aaf882b`
- beta_direct_open_status: `403` (403 expected before acceptance)
- seeded_friend_request_id_to_vet: `None`
- seeded_conversation_id: `13907a7f-935d-4c31-910c-60c450215dd9`
- order_id_using_listing_goods_id: `99ddf036-f455-4f68-b6ff-f9dea48cfe33`
- sponsorship_id_on_pet: `46f65354-296a-4473-95e0-ba3edd708592`
- appointment_id_with_vet: `3c2a5a01-bbd3-4f8c-9caf-c1ef71e7d21f`
- Notes: sponsorship remains pending/not surfaced on pet feed; seller-side order visibility still unavailable from Alpha side.

## Alpha Update 2026-02-12T11:52:56.950243+00:00
- actor_role: `clinic` / actor_user_id: `97052c92-910f-4061-976f-c8a991cdaaf4`
- friend_request_id_to_userB: `4d17865b-1b86-446f-bc3a-ae630aaf882b`
- beta_direct_open_status: `403` (403 expected before acceptance)
- seeded_friend_request_id_to_vet: `None`
- seeded_conversation_id: `13907a7f-935d-4c31-910c-60c450215dd9`
- order_id_using_listing_goods_id: `e297fe7b-0437-4187-80ed-c95e532c7c3e`
- sponsorship_id_on_pet: `408bf590-4614-4950-b2d6-229d1a9966bf`
- appointment_id_with_vet: `30700eed-2e94-4d03-8f5c-c57748dfbc47`
- Notes: sponsorship remains pending/not surfaced on pet feed; seller-side order visibility still unavailable from Alpha side.

## Alpha Update 2026-02-12T11:53:13.145774+00:00
- actor_role: `clinic` / actor_user_id: `97052c92-910f-4061-976f-c8a991cdaaf4`
- friend_request_id_to_userB: `4d17865b-1b86-446f-bc3a-ae630aaf882b`
- beta_direct_open_status: `403` (403 expected before acceptance)
- seeded_friend_request_id_to_vet: `None`
- seeded_conversation_id: `13907a7f-935d-4c31-910c-60c450215dd9`
- order_id_using_listing_goods_id: `63cf6c06-207b-403d-ade1-72b345aa034b`
- sponsorship_id_on_pet: `aa3a7643-8a13-4b91-9087-8c6796cafcae`
- appointment_id_with_vet: `b1925acc-3b2a-42a0-8712-e0d43af3bed2`
- Notes: sponsorship remains pending/not surfaced on pet feed; seller-side order visibility still unavailable from Alpha side.
