# Petsy Dashboard — API Handbook (Developer-Focused)

_Last updated: 2026-02-11_

Base URL (local):
- `http://127.0.0.1:8000/api`

Auth:
- Bearer token via `Authorization: Bearer <access_token>`

---

## 1) Authentication

### Login
`POST /auth/login`

Request:
```json
{
  "email": "qa.admin@petsy.com",
  "password": "Pass@123456"
}
```

Response (example):
```json
{
  "access_token": "<jwt>",
  "token_type": "bearer",
  "user": {
    "id": "...",
    "email": "qa.admin@petsy.com",
    "role": "admin",
    "is_admin": true,
    "username": "...",
    "user_code": "..."
  }
}
```

### Current user
`GET /auth/me`

---

## 2) Notifications

### List notifications
`GET /notifications?limit=20&offset=0&type=role_request&unread_only=true`

Response shape:
```json
{
  "items": [],
  "total": 0,
  "limit": 20,
  "offset": 0,
  "has_more": false
}
```

### Unread count
`GET /notifications/unread-count`

### Mark one read
`PUT /notifications/{id}/read`

### Mark all read
`PUT /notifications/read-all`

### Clear all
`DELETE /notifications/clear-all`

---

## 3) Friends & Social

### Search users
`GET /friends/search?q=ali`

Response item example:
```json
{
  "id": "user-id",
  "name": "Ali",
  "username": "ali_123",
  "user_code": "P-9X2M",
  "relationship": "none",
  "mutual_count": 2
}
```

### Friend list
`GET /friends`

### Requests list
`GET /friends/requests`

### Send friend request
`POST /friends/requests`
```json
{ "target_user_id": "<user-id>" }
```

### Accept/Reject request
`PUT /friends/requests/{request_id}`
```json
{ "action": "accept" }
```
or
```json
{ "action": "reject" }
```

### Block user
`POST /friends/{target_user_id}/block`

### Unblock user
`DELETE /friends/{target_user_id}/block`

### List blocked users
`GET /friends/blocked`

### Report user
`POST /friends/report`
```json
{
  "target_user_id": "<user-id>",
  "reason": "spam",
  "notes": "optional details"
}
```

---

## 4) Conversations / Messaging

### Start direct conversation (friends-only)
`POST /conversations/direct/{other_user_id}`

### Start/open general direct conversation endpoint
`POST /conversations`

Important server checks:
- blocked-user check (both directions)
- recipient DM privacy check (`allow_direct_messages`)
- returns `403` when not allowed

Error example:
```json
{ "detail": "Cannot message this user" }
```

---

## 5) User Settings (Privacy)

### Read settings
`GET /user-settings`

### Update settings
`PUT /user-settings`
```json
{
  "allow_friend_requests": "everyone",
  "allow_direct_messages": "friends_only"
}
```

Accepted values:
- `allow_friend_requests`: `everyone | nobody`
- `allow_direct_messages`: `everyone | friends_only`

---

## 6) Role Requests

### Create role request
`POST /role-requests`
```json
{
  "target_role": "vet",
  "reason": "I am a licensed veterinarian"
}
```

### My role requests
`GET /role-requests/my`

### Admin: all role requests
`GET /admin/role-requests`

### Admin: approve/reject role request
`PUT /admin/role-requests/{request_id}`
```json
{ "action": "approve" }
```
or
```json
{ "action": "reject" }
```

---

## 7) Admin APIs

### Dashboard stats
`GET /admin/stats`

Includes moderation counters:
- `openMarketplaceReports`
- `pendingRoleRequests`
- `openFriendReports`

### Users list
`GET /admin/users`

User item includes safety fields:
- `friend_reports_count`
- `friend_reports_open_count`
- `is_blocked_by_admin`

### Update/delete user
- `PUT /admin/users/{user_id}`
- `DELETE /admin/users/{user_id}`

### Admin block/unblock user
- `POST /admin/users/{user_id}/block`
- `DELETE /admin/users/{user_id}/block`

### Friend reports moderation queue
`GET /admin/friend-reports?status=open&target_user_id=<id>`

### Review friend report
`PUT /admin/friend-reports/{report_id}`
```json
{ "action": "resolve" }
```
Actions:
- `resolve`
- `reject`
- `block_target`

### Audit logs
`GET /admin/audit-logs?limit=200&action=review_friend_report&q=friend&from_date=2026-02-10&to_date=2026-02-12`

Supports:
- `limit` (max 1000)
- `action` (`all` or specific)
- `q` text search
- `from_date`, `to_date` date filtering

---

## 8) Error patterns

Common status codes:
- `400` validation/input errors
- `401` unauthenticated
- `403` unauthorized/forbidden by role/privacy
- `404` resource not found
- `500` unexpected server error

Example forbidden response:
```json
{ "detail": "Forbidden" }
```

---

## 9) cURL quick examples

### Login + save token
```bash
TOKEN=$(curl -s http://127.0.0.1:8000/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"qa.admin@petsy.com","password":"Pass@123456"}' | jq -r .access_token)
```

### Get admin stats
```bash
curl -s http://127.0.0.1:8000/api/admin/stats \
  -H "Authorization: Bearer $TOKEN" | jq
```

### Query audit logs
```bash
curl -s "http://127.0.0.1:8000/api/admin/audit-logs?limit=100&action=review_friend_report&from_date=2026-02-10&to_date=2026-02-12" \
  -H "Authorization: Bearer $TOKEN" | jq
```

---

## 10) Suggested next additions
- Postman collection (`/docs/postman/Petsy.postman_collection.json`)
- Contract tests for auth/privacy/RBAC edge cases
- Endpoint changelog with version tags
