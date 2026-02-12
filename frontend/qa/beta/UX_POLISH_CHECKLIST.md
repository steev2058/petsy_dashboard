# UX Polish Checklist (Beta)

Date: 2026-02-12

## Global
- [x] No lint-blocking JSX text issues
- [x] Root layout import hygiene (no unresolved deps)
- [x] Web viewport includes `viewport-fit=cover`
- [ ] Warning-only lint cleanup pass (optional pre-launch hardening)

## Auth & onboarding
- [x] Verify/auth copy render-safe
- [x] Auth route redirection in guard
- [ ] Manual keyboard + OTP focus walkthrough on device

## Navigation & guards
- [x] Protected route redirect (unauth -> login)
- [x] Auth route redirect (auth user -> home)
- [x] Role guards for vet/clinic/market_owner/admin
- [x] Role request pages blocked for specialized roles
- [ ] End-to-end role matrix with real seeded users

## Commerce
- [x] Cart/checkout copy render-safe
- [ ] Manual totals/promo/shipping edge-case pass in live API state

## Care & sponsorship
- [x] Health records copy render-safe
- [x] Sponsorship flow copy render-safe
- [x] Admin sponsorship quote rendering fixed
- [ ] Device test for long-form notes/messages and keyboard overlap

## Social/DM/privacy
- [x] Friends/messages/chat routes present and guarded
- [ ] Manual DM read/send/typing verification against websocket backend

## Admin
- [x] Admin route family inventory complete
- [x] Admin top-segment guard verified
- [ ] Manual permission denial UX verification for non-admin deep links
