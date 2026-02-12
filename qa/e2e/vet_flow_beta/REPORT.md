# Beta Vet/User Deep Flow Report (20260212T120139Z)

- Base: `http://127.0.0.1:8001/api`
- Marker: `beta-vet-flow-20260212T120139Z`
- Beta user: `beta.vetflow.1770897699@example.com` (`8de895c8-8aaf-42ba-b87b-cd9ff8d1e7b8`)
- Vet user: `demo.vet@petsy.com` (`1382dcc7-3cd5-4be2-b4e9-8bad76a7d864`)

## PASS/FAIL Matrix
- [x] Beta normal user established — **PASS**
- [x] User has exactly 3 pets — **PASS**
- [x] 3 appointments created across 3 pets — **PASS**
- [x] Cancel appointment supported and reflected — **PASS**
- [x] Reschedule appointment supported — **PASS**
- [x] Vet can view counterpart appointments — **PASS**
- [x] Two-way chat follow-up user<->vet — **PASS**
- [x] Care request lifecycle (accept/start/complete) — **PASS**
- [x] Health records/timeline synced per pet — **PASS**
- [x] User notifications received for updates — **PASS**

## Key IDs
- conversation_id: `4b51fd2b-e0a9-4179-a62a-19048e7b3feb`
- pets: `f4f86b97-8773-42ca-bda7-fbe3292c65af, 8b587bd9-2569-4921-b2a6-663c11fd6add, ee622311-41f3-4d1b-854d-8fa86688be23`
- appointments: `743191c1-35ab-4584-8c2d-e706030141db, c6d4de91-1431-4830-9218-727c62ae8991, db745433-efb2-412b-908f-3eeb3a8f86c2`
- cancelled_appointment_id: `db745433-efb2-412b-908f-3eeb3a8f86c2`
- care_requests: `9771b7cf-f05c-433c-848a-02bb4912b0d4, 376ada76-f43e-4943-b6e6-f4ea5989e577, 21c3e205-6653-4ded-9af0-0132d0a4344f`

## Blockers
- None
