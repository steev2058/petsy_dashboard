# SIMPLE_TEST_GUIDE.md

## العربية (أولاً)

> دليل اختبار بسيط لغير التقنيين. اتبع الخطوات حرفيًا.

## A) إذا كنت مستخدمًا عاديًا (User)

1. افتح `https://petsy.company` → **توقع:** تظهر شاشة الدخول.
2. اضغط Sign up وأنشئ حسابًا جديدًا → **توقع:** رسالة إرسال كود التفعيل.
3. فعّل الحساب ثم Login → **توقع:** الدخول للصفحة الرئيسية.
4. افتح تبويب **Home** واضغط **Vets** → **توقع:** قائمة أطباء.
5. افتح طبيبًا واضغط حجز موعد → **توقع:** شاشة حجز الموعد.
6. اذهب إلى **Shop** وافتح منتجًا → **توقع:** تفاصيل المنتج.
7. أضف المنتج للسلة ثم افتح **Cart** → **توقع:** المنتج موجود.
8. اضغط Checkout (اختبار فقط) → **توقع:** شاشة الدفع/تأكيد الطلب.
9. افتح **Community** وأنشئ منشورًا قصيرًا → **توقع:** المنشور يظهر في القائمة.
10. افتح **Messages** → **توقع:** تظهر المحادثات أو رسالة لا توجد محادثات.
11. افتح **Notifications** واضغط إشعارًا → **توقع:** انتقال للشاشة المرتبطة.
12. افتح **Profile > Edit Profile** وعدّل الاسم → **توقع:** حفظ التغيير.

**رسائل فشل شائعة**
- “Invalid credentials” (بيانات دخول خاطئة)
- “Profile suspended. Contact admin.”
- “Only verified active profiles can be public” (إدارية)

---

## B) إذا كنت طبيبًا (Vet)

1. ادخل بحسابك.
2. Profile → Role Request → اختر Vet → **توقع:** الطلب pending.
3. انتظر موافقة الإدارة ثم افتح `/vet-profile`.
4. املأ البيانات الأساسية (الاسم/الخبرة/المدينة/الهاتف) → **توقع:** حفظ ناجح.
5. اضغط Submit for verification → **توقع:** الحالة pending_verification.
6. افتح `/my-role-requests` → **توقع:** الطلب approved.
7. افتح `/my-appointments` → **توقع:** ظهور المواعيد إن وجدت.
8. افتح `/vet-care-requests` → **توقع:** قائمة طلبات الرعاية (أو فارغة).
9. عدّل أي حقل في vet profile ثم submit مرة ثانية → **توقع:** يقبل الإرسال (idempotent) ويرسل إشعار للإدارة.
10. بعد قبول الإدارة + Public، افحص `/vets` بحساب مستخدم عادي → **توقع:** ظهور الطبيب.

---

## C) إذا كنت مشرفًا (Admin)

1. Login بحساب admin.
2. افتح `/admin` → **توقع:** لوحة الإدارة.
3. افتح `/admin/role-requests` → وافق على طلب vet → **توقع:** status approved.
4. افتح `/admin/vet-profiles?status=pending_verification` → **توقع:** يظهر الملف الجديد.
5. اضغط Approve → **توقع:** status active + verified=true.
6. اضغط Public → **توقع:** is_public=true.
7. افتح `/admin/audit-logs?action=review_vet_profile` → **توقع:** سجل المراجعة موجود.
8. افتح `/admin/users` وابحث عن المستخدم → **توقع:** يظهر دوره الحالي.
9. افتح `/admin/products` وأضف منتجًا بصورة من uploader → **توقع:** حفظ ناجح.
10. افتح `/admin/marketplace` → **توقع:** عرض listings/reports.
11. افتح `/admin/community` واحذف منشورًا مخالفًا → **توقع:** يختفي من القائمة.
12. افتح `/notifications` في admin واضغط إشعار vet profile → **توقع:** انتقال لطابور vet profiles مع profile_id.

---

## English Version

Simple non-technical testing scripts.

### A) Normal User
1. Open `https://petsy.company` -> login page appears.
2. Sign up -> verification message appears.
3. Verify + login -> home appears.
4. Open Vets -> list appears.
5. Open one vet -> appointment screen opens.
6. Open Shop and one product -> details appear.
7. Add to cart -> cart contains item.
8. Checkout -> payment/order screen appears.
9. Create Community post -> post appears.
10. Open Messages -> conversations list appears.
11. Open Notifications and tap one -> deep-link opens correct screen.
12. Edit profile name -> save succeeds.

### B) Vet
1. Request Vet role.
2. After approval, open `/vet-profile`.
3. Fill required profile fields.
4. Submit for verification -> pending_verification.
5. Re-submit while pending -> should still succeed (idempotent).
6. After admin approve + public -> appears in `/vets`.

### C) Admin
1. Open `/admin` dashboard.
2. Approve vet role request in `/admin/role-requests`.
3. Review in `/admin/vet-profiles`.
4. Approve + set public.
5. Verify audit log `review_vet_profile` exists.
6. Open admin notification and ensure deep-link opens the vet queue target.
