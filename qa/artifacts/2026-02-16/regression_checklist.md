# Regression checklist

- [ ] Non-vet users cannot access `/api/vet-profile/me`
- [ ] Vet users can save profile draft repeatedly
- [ ] Submit blocked when required fields missing
- [ ] `/api/vets` excludes draft/pending/rejected/suspended
- [ ] `/api/vets` excludes unverified or non-public profiles
- [ ] Admin reject requires verification notes
- [ ] Admin cannot set profile public when not active+verified
- [ ] Role request approval for vet auto-creates pending profile
- [ ] Home vet banners match profile state
- [ ] Admin queue filter tabs return expected statuses
- [ ] Admin block/unblock still works from users page
- [ ] Legacy `/admin/vets` no longer supports manual Add Vet flow
