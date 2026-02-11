# Test Plan + Results — 2026-02-11

## Method
- API-first QA via staging backend (`:18000`) with reproducible scripted checks.
- Frontend staging booted on separate port (`:18001`) for UI availability validation.
- Multi-account workflow: 4 accounts created and verified.

## Phase Results

### Phase 0 — Prep
- Health check: `GET /api/health` => 200 ✅

### Phase 1 — Discovery + Smoke
- `GET /api/auth/me` (authorized) => 200 ✅
- `GET /api/pets` => 200 ✅
- `GET /api/vets` => 200 ✅
- `GET /api/notifications` => 200 ✅

### Phase 2 — Auth/session
- Invalid login => 401 ✅
- Valid token session restore (`/auth/me`) => 200 ✅

### Phase 3 — RBAC matrix + backend 403 checks
- User -> `/admin/stats` => 403 ✅
- User -> `/vet/care-requests` => 403 ✅
- User -> `/market-owner/overview` => 403 ✅
- User -> `/clinic/care-requests` => 403 ✅

### Phase 4 — Notifications
- List/unread/read-all/unread-after all successful (200) ✅

### Phase 5 — Friends/privacy/messaging (3+ accounts)
- Friend request + accept flow => 200 ✅
- Privacy: DM blocked for non-friend (`friends_only`) => 403 ✅
- DM allowed for accepted friend => 200 ✅
- Report user flow => 200 ✅

### Phase 6 — Role requests workflow
- Create role request => 200 ✅
- Admin list role requests => 200 ✅
- Admin approve request (`action=approve`) => 200 ✅
- Newly approved role endpoint access (vet) => 200 ✅

### Phase 7 — Remaining modules (sample critical paths)
- Create pet => 200 ✅
- Cart add/get => 200 ✅
- Create order => 200 ✅

### Phase 8 — Admin moderation/users/audit logs
- Admin friend reports list => 200 ✅
- Resolve friend report => 200 ✅
- Admin users list => 200 ✅
- Admin audit logs => 200 ✅

### Phase 9 — Resilience/error UX (API)
- Invalid pet update => 404 ✅
- Unauth notifications => 401 ✅
- Invalid admin role action => 400 ✅

## Evidence
- See `qa/artifacts/2026-02-11/evidence/phase_results.json`