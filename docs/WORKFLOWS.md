# WORKFLOWS.md

## العربية (أولاً)

> هذا الملف يشرح تدفّق كل موديول: المسار السعيد + الحالات الطرفية + مسؤوليات الأدوار + API الأساسية.

## 1) Care (طلبات الرعاية)

**الأدوار:** user, vet, care_clinic, admin

### Happy Path
1. المستخدم ينشئ طلب رعاية عبر `/care-requests`.
2. الطبيب يرى الطلب في `/vet/care-requests` ويحدّث الحالة.
3. العيادة تتابع عبر `/clinic/care-requests`.
4. المستخدم يرى تطور الحالة/الجدول الزمني.

### Edge Cases
- طبيب غير مخول يحاول تحديث طلب.
- طلب غير موجود.
- رفض/إغلاق الطلب من مزود الخدمة.

### API
- `POST /care-requests`
- `GET /vet/care-requests`
- `PUT /vet/care-requests/{request_id}`
- `GET /clinic/care-requests`
- `PUT /clinic/care-requests/{request_id}`
- `GET /care-requests/{request_id}/timeline`

---

## 2) Vets (دليل الأطباء + التحقق)

**الأدوار:** user, vet, admin

### Happy Path
1. user يرسل `role-request` لدور vet.
2. admin يوافق على الطلب.
3. vet يحدّث `/vet-profile` ويضغط submit.
4. admin يراجع من `/admin/vet-profiles` (approve).
5. admin يضبط `set_public=true`.
6. يظهر الطبيب في `/vets`.

### Edge Cases
- الملف pending مسبقاً: submit يبقى idempotent ويعيد إشعار الإدارة.
- reject يتطلب ملاحظات التحقق.
- active بدون verified لا يمكن جعله public.

### API
- `POST /role-requests`
- `PUT /admin/role-requests/{request_id}`
- `GET /vet-profile/me`
- `PUT /vet-profile/me`
- `POST /vet-profile/me/submit`
- `GET /admin/vet-profiles`
- `PUT /admin/vet-profiles/{profile_id}`
- `GET /vets`
- `GET /vets/{vet_id}`

---

## 3) Clinics (إدارة العيادة)

**الأدوار:** care_clinic, admin

### Happy Path
1. الحصول على دور clinic (role-request).
2. عرض أطباء العيادة `/clinic/vets`.
3. متابعة طلبات الرعاية `/clinic/care-requests`.

### Edge Cases
- مستخدم عادي يدخل شاشة العيادة.
- عدم وجود أطباء مرتبطين.

### API
- `GET /clinic/vets`
- `GET /clinic/care-requests`
- `PUT /clinic/care-requests/{request_id}`

---

## 4) Marketplace

**الأدوار:** user, market_owner, admin

### Happy Path
1. market_owner ينشئ إعلان `/marketplace/listings`.
2. user يستعرض `/marketplace/listings` ويتواصل/يشتري.
3. المالك يدير إعلاناته (`my listings`, status updates).
4. admin يراجع البلاغات ويضبط الحالة.

### Edge Cases
- إعلان archived/sold.
- report على إعلان مخالف.
- تعديل إعلان ليس ملك المستخدم.

### API
- `POST /marketplace/listings`
- `GET /marketplace/listings`
- `GET /marketplace/listings/my`
- `PUT /marketplace/listings/{listing_id}`
- `PUT /marketplace/listings/{listing_id}/status`
- `DELETE /marketplace/listings/{listing_id}`
- `POST /marketplace/listings/{listing_id}/report`
- Admin: `GET /admin/marketplace/listings`, `GET /admin/marketplace/reports`, `PUT /admin/marketplace/listings/{listing_id}/status`

---

## 5) Adoption

**الأدوار:** user, admin

### Happy Path
1. المستخدم يفتح تبويب adoption.
2. ينشر حالة تبني من `/create-adoption-post`.
3. يتابع المهتمون الحالة من قائمة التبني.

### Edge Cases
- بيانات ناقصة في الإعلان.
- حذف/إخفاء إداري للحالات المخالفة.

### API
- تعتمد على `pets` و/أو منشورات المجتمع حسب التنفيذ في الواجهة.

---

## 6) Sponsorship

**الأدوار:** user, admin

### Happy Path
1. المستخدم يختار حيوانًا ويبدأ sponsorship.
2. يتم إنشاء السجل ومتابعة الحالة.
3. المستخدم يرى رعاياته في `/my-sponsorships`.

### Edge Cases
- تعثر الدفع.
- تحديث حالة sponsorship من الإدارة.

### API
- `POST /sponsorships`
- `GET /sponsorships/pet/{pet_id}`
- `GET /sponsorships/my`
- `PUT /sponsorships/{sponsorship_id}/status`

---

## 7) Community

**الأدوار:** user, admin

### Happy Path
1. إنشاء منشور `/community`.
2. تفاعل (like/comment).
3. الإبلاغ عن إساءة عند الحاجة.

### Edge Cases
- مستخدم محظور.
- بلاغات متعددة على نفس المنشور.

### API
- `POST /community`
- `GET /community`
- `GET /community/post/{post_id}`
- `POST /community/{post_id}/like`
- `POST /community/{post_id}/comments`
- `GET /community/{post_id}/comments`
- `POST /community/{post_id}/report`
- Admin: `GET /admin/community`, `DELETE /admin/community/{post_id}`

---

## 8) Friends & Messaging

**الأدوار:** كل الأدوار المسجلة

### Happy Path
1. البحث عن أصدقاء + إرسال طلب.
2. قبول الطلب.
3. فتح محادثة مباشرة.
4. تبادل الرسائل + read status.

### Edge Cases
- رفض الطلب.
- حظر مستخدم.
- report على إساءة.

### API
- `GET /friends/search`
- `GET /friends/requests`
- `POST /friends/requests`
- `PUT /friends/requests/{request_id}`
- `POST /conversations/direct/{other_user_id}`
- `GET /conversations/{conversation_id}/messages`
- `POST /conversations/{conversation_id}/messages`
- `POST /conversations/{conversation_id}/read`

---

## 9) Notifications

**الأدوار:** كل الأدوار

### Happy Path
1. فتح شاشة notifications.
2. الضغط على إشعار → deep-link للشاشة المرتبطة.
3. mark read أو clear.

### Edge Cases
- route غير صالح في payload.
- إشعار قديم يشير لمعرف محذوف.

### API
- `GET /notifications`
- `GET /notifications/unread-count`
- `PUT /notifications/{notification_id}/read`
- `PUT /notifications/read-all`
- `DELETE /notifications/clear-all`

---

## 10) Settings & Privacy

**الأدوار:** كل الأدوار

### Happy Path
1. تعديل الملف الشخصي.
2. تغيير كلمة المرور.
3. تحديث الخصوصية/تفضيلات الدردشة.

### Edge Cases
- كلمة مرور حالية غير صحيحة.
- حذف الحساب مع جلسة غير صالحة.

### API
- `GET /auth/me`
- `PUT /auth/update`
- `POST /auth/change-password`
- `POST /auth/delete-account`
- `GET /user-settings`
- `PUT /user-settings`

---

## 11) Admin Operations

**الأدوار:** admin فقط

### Happy Path
1. متابعة dashboards وطلبات الأدوار.
2. إدارة vet verification queue.
3. إدارة users/orders/products/community/marketplace.
4. مراجعة audit logs.

### Edge Cases
- admin يحظر نفسه (ممنوع).
- تعديل مستخدم غير موجود.
- reject vet profile بدون notes (مرفوض).

### API (مختصر)
- `GET /admin/stats`
- `GET/PUT/DELETE /admin/users...`
- `GET/PUT /admin/users/{user_id}/auth-fields`
- `GET/PUT /admin/role-requests...`
- `GET/PUT /admin/vet-profiles...`
- `GET /admin/audit-logs`
- `GET /admin/orders`, `PUT /admin/orders/{order_id}`
- `GET/POST/PUT/DELETE /admin/products...`

---

## UX Complexity Notes

1. Vet onboarding يحتاج “progress state” واضح (Requested → Profile Ready → Pending Review → Verified → Public).
2. تعدد نقاط الدخول (Home + Profile + Admin subpages) قد يربك المستخدم الجديد.
3. Marketplace وShop متداخلان مفاهيميًا؛ يفضّل تسمية أوضح داخل الواجهة.

---

## English Version

This file describes module workflows: happy path, edge cases, roles, and key APIs.

- Care: request lifecycle across user/vet/clinic with timeline endpoints.
- Vets: role request -> profile submit -> admin verify -> set public -> visible in `/vets`.
- Clinics: clinic-specific care management.
- Marketplace: listing lifecycle + reporting + admin moderation.
- Adoption/Sponsorship: posting and contribution flows.
- Community: post, like, comment, report.
- Friends/Messaging: requests, direct conversation, read state.
- Notifications: list, open deep link, read/clear.
- Settings/Privacy: profile, password, account deletion, preferences.
- Admin: full moderation and operations.

Main complexity risks:
1) multi-step vet onboarding, 2) scattered entry points, 3) overlapping Shop/Marketplace mental model.
