# DEMO_SCRIPT.md

## العربية (أولاً) — سيناريو عرض 5–7 دقائق

## الهدف
عرض القيمة الأساسية بسرعة: المستخدم يطلب خدمة، الطبيب يتحقق، الإدارة تضبط الجودة.

## التحضير (قبل العرض)
- جهّز 3 حسابات: user + vet + admin.
- تأكد أن admin داخل `/admin`.
- افتح نوافذ/تبويبات جاهزة: Home, Vets, Admin Role Requests, Admin Vet Profiles.

## نص العرض (بالدقائق)

### 0:00–0:45 — دخول سريع
1. افتح `https://petsy.company`.
2. سجّل دخول user.
3. أشر إلى Home tabs (Home/Adoption/Shop/Profile).

### 0:45–1:45 — من المستخدم إلى الطبيب
1. Profile → Role Request → اختر Vet.
2. أظهر `/my-role-requests` أن الحالة Pending.
3. انتقل لحساب admin.

### 1:45–3:00 — موافقة الإدارة
1. افتح `/admin/role-requests`.
2. وافق على طلب vet.
3. افتح `/admin/vet-profiles?status=pending_verification`.
4. أظهر أن الملف موجود بالحالة pending + غير public.

### 3:00–4:15 — إكمال ملف الطبيب
1. ارجع لحساب vet وافتح `/vet-profile`.
2. املأ الحقول الأساسية + صورة.
3. اضغط Submit for verification.
4. افتح notifications بحساب admin لإظهار إشعار vet_profile_verification.

### 4:15–5:30 — التحقق والنشر
1. admin يفتح الإشعار (deep-link).
2. من `/admin/vet-profiles`: اضغط Approve.
3. اضغط Public.
4. افتح `/vets` بحساب user وأظهر الطبيب في الدليل.

### 5:30–6:30 — تجربة المستخدم النهائية
1. user يفتح صفحة الطبيب `/vet/[id]`.
2. يبدأ حجز موعد `/book-appointment/[vetId]`.
3. أظهر notifications/read status بسرعة.

### 6:30–7:00 — الإغلاق
- راجع QA GO/NO-GO:
  - Auth ✅
  - Vet verification ✅
  - Admin audit ✅

## نقاط حديث مختصرة
- “أي طبيب لا يظهر للعامة إلا بعد تحقق إداري كامل.”
- “الإشعارات تربط الإدارة مباشرة بحالة التحقق.”
- “كل قرار تحقق مسجّل في audit logs.”

---

## English Version — 5–7 Minute Launch Demo

### Goal
Show the core value quickly: user demand, vet verification, admin control.

### Timeline
1. **0:00–0:45** Login and app overview (tabs).
2. **0:45–1:45** User submits role request (Vet).
3. **1:45–3:00** Admin approves role request.
4. **3:00–4:15** Vet completes profile and submits verification.
5. **4:15–5:30** Admin opens notification deep-link, approves profile, sets public.
6. **5:30–6:30** User sees vet in `/vets` and starts booking.
7. **6:30–7:00** Wrap up with GO/NO-GO checks.

### Exact click path
- User: `Profile -> Role Request -> Vet -> Submit`
- Admin: `/admin/role-requests -> Approve`
- Vet: `/vet-profile -> fill required fields -> Submit`
- Admin: `Notifications -> open vet_profile_verification -> /admin/vet-profiles -> Approve -> Public`
- User: `/vets -> open vet -> /book-appointment/[vetId]`
