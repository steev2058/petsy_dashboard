# Petsy Dashboard — User Guide + Developer Summary

_Last updated: 2026-02-11_

This document is designed for:
- **End users** (pet owners, adopters, sponsors, community users)
- **Business users** (vets, market owners, care clinics)
- **Admins/moderators**
- **Developers** onboarding to the codebase

---

## 1) Product Overview

**Petsy Dashboard** is a role-based pet-care platform with:
- Pet profiles and health records
- Adoption and sponsorship workflows
- Marketplace listings + moderation
- Care requests and clinical workflows
- Notifications center with unread counts + filters
- Friends + social direct messaging with privacy controls
- Full admin control panel and moderation tooling

Supported roles:
- `user`
- `admin`
- `vet`
- `market_owner`
- `care_clinic`

---

## 2) End-User Guide (Non-technical)

## 2.1 Getting started
1. Register/login
2. Complete profile
3. Add pets
4. Explore tabs: Home, Community, Adoption, Marketplace, Messages, Profile

## 2.2 Main user flows
- **Adoption**
  - Browse adoption posts
  - Create adoption post
  - Manage your posts
- **Sponsorship**
  - Sponsor pets
  - Track sponsorship history in “My Sponsorships”
- **Marketplace**
  - Browse listings (active + sold visibility)
  - Create listing
  - Manage “My Marketplace Listings”
- **Care requests**
  - Submit care requests
  - Track status and timeline updates
- **Community and messaging**
  - Post and interact in community
  - Use friends-based direct chat

## 2.3 Notifications
Open **Notifications** to:
- See full history
- Filter notification types
- Mark individual/all read
- Clear all
- Auto-refresh every ~10s on active screen

## 2.4 Friends & chat
- Search users by name/username/user code
- Send/accept friend requests
- Open direct chat with friends
- Configure privacy:
  - Friend requests: `everyone | nobody`
  - Direct messages: `everyone | friends_only`
- Safety tools:
  - Block/unblock users
  - Report users

---

## 3) Role-Based Workflows

## 3.1 User (`user`)
- Core consumer flows
- Can submit role requests for specialized roles

## 3.2 Vet (`vet`)
- Access vet care requests dashboard
- Complete cases with required:
  - diagnosis
  - prescription

## 3.3 Care Clinic (`care_clinic`)
- Manage clinic care queues/timelines

## 3.4 Market Owner (`market_owner`)
- Access marketplace owner dashboard
- Manage operational marketplace lifecycle

## 3.5 Admin (`admin`)
- Access full admin panel
- Manage users/roles/reports/moderation
- Friend reports moderation actions:
  - resolve
  - reject
  - block target
- Audit logs for moderation/administrative actions

---

## 4) Frontend Summary

Tech stack:
- **React Native + Expo Router** (web + mobile-first behavior)
- State via `useStore`
- API client abstraction in `frontend/src/services/api.ts`

Important frontend modules:
- `frontend/app/_layout.tsx`
  - global route guards and role-based redirects
- `frontend/app/(auth)/login.tsx`
  - hardened login UX + explicit failure handling
- `frontend/app/notifications.tsx`
  - filters, pagination, deep links, polling refresh
- `frontend/app/friends.tsx`
  - requests/friends/find/blocked + privacy toggles
- `frontend/app/admin/*`
  - admin dashboards and moderation screens

Web reliability hardening included:
- backend URL resolution fallback for web
- auth token validation via `/api/auth/me` on restore
- clearer network/credential error messaging

---

## 5) Backend Summary

Tech stack:
- **FastAPI** backend (`backend/server.py`)
- MongoDB collections for domain modules
- Role checks and centralized authorization helpers

Security/RBAC patterns:
- Allowed roles list enforced server-side
- Admin-only endpoints protected
- Role-sensitive features validated server-side
- Route guards are duplicated on frontend for UX, but backend is the source of truth

Key backend capabilities added recently:
- Notifications service helpers
- Friends/privacy/block/report services
- Admin friend report queue + moderation actions
- Admin audit logs endpoint

---

## 6) API Summary (Key Endpoints)

> Note: this is a practical summary for onboarding, not an OpenAPI replacement.

## 6.1 Auth
- `POST /api/auth/login`
- `GET /api/auth/me`

## 6.2 Notifications
- `GET /api/notifications`
- `GET /api/notifications/unread-count`
- `PUT /api/notifications/{id}/read`
- `PUT /api/notifications/read-all`
- `DELETE /api/notifications/clear-all`

## 6.3 Friends/social
- `GET /api/friends/search`
- `GET /api/friends`
- `GET /api/friends/requests`
- `POST /api/friends/requests`
- `PUT /api/friends/requests/{request_id}`
- `POST /api/friends/{target_user_id}/block`
- `DELETE /api/friends/{target_user_id}/block`
- `GET /api/friends/blocked`
- `POST /api/friends/report`

## 6.4 Conversations/chat
- `POST /api/conversations/direct/{other_user_id}` (friends-only)
- `POST /api/conversations` (privacy + block checks enforced)

## 6.5 Role requests
- `POST /api/role-requests`
- `GET /api/role-requests/my`
- `GET /api/admin/role-requests`
- `PUT /api/admin/role-requests/{request_id}`

## 6.6 Admin moderation
- `GET /api/admin/stats`
- `GET /api/admin/users`
- `PUT /api/admin/users/{user_id}`
- `DELETE /api/admin/users/{user_id}`
- `POST /api/admin/users/{user_id}/block`
- `DELETE /api/admin/users/{user_id}/block`
- `GET /api/admin/friend-reports`
- `PUT /api/admin/friend-reports/{report_id}`
- `GET /api/admin/audit-logs`

---

## 7) “All Cases” Test Scenarios (Launch-facing)

## 7.1 Authentication
- Valid login works
- Invalid credentials show explicit error
- Session restore validates token

## 7.2 RBAC/Authorization
- Non-admin blocked from admin routes
- Specialized routes gated by role
- Role-request pages blocked for already-specialized/admin users

## 7.3 Notifications
- List/filter/pagination/deep-link
- mark read/read-all/clear-all
- badge count updates
- polling refresh while screen active

## 7.4 Friends & privacy
- Search users + mutual count visible
- Request flow (send/accept/reject)
- `allow_friend_requests=nobody` blocks incoming requests
- `allow_direct_messages=friends_only` blocks non-friend chat creation
- block removes relationships and pending requests
- blocked users hidden from relevant discovery paths

## 7.5 Admin moderation
- Friend reports appear in queue
- resolve/reject/block_target update status correctly
- user safety controls (admin block/unblock)
- audit logs record major admin actions

## 7.6 Marketplace + care + role requests
- Listing lifecycle and moderation actions
- care request creation/update/completion validation
- role request approve/reject and user role update

---

## 8) Developer Onboarding

## 8.1 Repo structure (high-level)
- `frontend/` — Expo app (web + mobile)
- `backend/` — FastAPI app

## 8.2 Run locally
- Start backend (uvicorn)
- Start frontend (Expo web)
- Verify:
  - backend `/api/health` = 200
  - frontend root `/` = 200

## 8.3 Recommended dev conventions
- Keep authorization in backend first
- Keep frontend guards for UX and fast redirects
- Add tests for new role/security paths before release
- Prefer explicit user feedback for network/auth failures

## 8.4 Production readiness checklist
- Process supervision (systemd/pm2) for backend/frontend
- Centralized logs + alerting
- Secret rotation
- Backup/restore drills
- Regression suite run before each release

---

## 9) Public Introduction Blurb (for demos)

**Petsy Dashboard** is a full-featured pet platform combining pet care, adoption, sponsorship, marketplace, social messaging, and role-based professional/admin workflows. It supports strong privacy controls, moderation tooling, and production-style operational patterns—designed for both everyday pet owners and managed partner operations.

---

## 10) Next Documentation Add-ons (optional)

If needed, we can add:
- Full OpenAPI endpoint reference with request/response examples
- Sequence diagrams for major flows (adoption, care, moderation)
- Postman collection + environment file
- QA test matrix spreadsheet template
