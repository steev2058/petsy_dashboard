# Route Inventory (Beta QA)

Date: 2026-02-12  
Branch: `qa/beta-petsy-launch-20260212`

## Method
- Enumerated Expo routes via:
  - `find frontend/app -type f \( -name '*.tsx' -o -name '*.ts' \) | sort`
- Cross-checked access control in `frontend/app/_layout.tsx` route guard.

## Route Groups

### Public routes
- `/` (splash)
- `/(auth)/login`
- `/(auth)/signup`
- `/(auth)/forgot-password`
- `/(auth)/verify`
- `/(tabs)/home`
- `/(tabs)/adoption`
- `/(tabs)/shop`
- `/community`, `/community/[id]`
- `/marketplace`, `/marketplace/[id]`
- `/pet/[id]`, `/vet/[id]`
- `/lost-found`, `/lost-found/[id]`
- `/petsy-map`, `/about`, `/terms`, `/privacy-policy`

### Auth-required routes (guarded)
- Messaging/social: `/messages`, `/chat/[id]`, `/friends`, `/blocked-users`, `/chat-preferences`
- Account: `/settings`, `/edit-profile`, `/change-password`, `/delete-account`, `/privacy-settings`
- Pets/care: `/my-pets`, `/add-pet`, `/health-records`, `/my-appointments`, `/book-appointment/[vetId]`, `/pet-tracking`
- Commerce: `/cart`, `/checkout`, `/order-history`, `/order/[id]`, `/favorites`
- Content creation: `/create-post`, `/create-adoption-post`, `/create-marketplace-listing`, `/create-sponsorship-post`
- Sponsorship: `/sponsorships`, `/my-sponsorships`, `/sponsor/[petId]`
- Notifications: `/notifications`
- Role request: `/role-request`, `/my-role-requests`

### Role-restricted routes (guarded)
- Vet-only (+admin): `/vet-care-requests`
- Care clinic-only (+admin): `/clinic-care-management`
- Market owner-only (+admin): `/market-owner-dashboard`
- Admin-only: `/admin/*`

### Role-request restrictions
- Specialized roles (`vet`, `market_owner`, `care_clinic`, `admin`) are redirected away from:
  - `/role-request`
  - `/my-role-requests`

## Notes
- Guard logic is centralized and active in `app/_layout.tsx`.
- Admin child routes rely on top-level segment `admin` and are correctly protected.
