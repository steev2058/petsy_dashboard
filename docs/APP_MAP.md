# APP_MAP.md

## العربية (أولاً)

> مرجع موحّد لخريطة تطبيق Petsy بناءً على:
> 1) فحص مسارات الواجهة `frontend/app`،
> 2) مراجعة أزرار الدخول والتنقل في الكود،
> 3) فحص API في `backend/server.py`.

- **عدد الشاشات/المسارات المكتشفة:** 73 (بدون ملفات layout)
- **الأدوار:** user / vet / care_clinic / market_owner / admin
- **البيئة:** Production `https://petsy.company`
- **اللقطات (Screenshots):** `docs/screenshots/2026-02-16/README.md`

## 1) المصادقة والدخول

### `/` (Splash / bootstrap)
- **الأدوار:** الجميع
- **الوصول:** فتح التطبيق
- **الغرض:** توجيه المستخدم حسب حالة الجلسة

### `/login` `/signup` `/verify` `/forgot-password`
- **الأدوار:** الجميع
- **الوصول:** من شاشة الدخول
- **الغرض:** التسجيل/الدخول/تفعيل الحساب/استعادة كلمة المرور

## 2) التبويبات الأساسية (Bottom Tabs)

### `/home`
- **الأدوار:** مستخدم مسجّل (وقد يظهر عناصر دورية مثل admin quick links)
- **الوصول:** التبويب الرئيسي
- **الغرض:** مدخل سريع للخدمات (Vets, Community, Shop...)

### `/adoption`
- **الأدوار:** user
- **الوصول:** تبويب Adoption
- **الغرض:** استعراض حالات التبني

### `/shop`
- **الأدوار:** user / market_owner
- **الوصول:** تبويب Shop
- **الغرض:** استعراض المنتجات

### `/profile`
- **الأدوار:** كل دور بعد تسجيل الدخول
- **الوصول:** تبويب Profile
- **الغرض:** إدارة الحساب والدور والتنقل للإعدادات

## 3) الرعاية والأطباء والعيادات (Care, Vets, Clinics)

### `/vets`
- **الأدوار:** user
- **الوصول:** من Home أو Profile
- **الغرض:** دليل الأطباء العام (مشروط: active + verified + is_public)

### `/vet/[id]`
- **الأدوار:** user
- **الوصول:** من قائمة vets
- **الغرض:** صفحة الطبيب + خيارات التواصل/الحجز

### `/book-appointment/[vetId]`
- **الأدوار:** user
- **الوصول:** من صفحة الطبيب
- **الغرض:** حجز موعد

### `/my-appointments`
- **الأدوار:** user / vet
- **الوصول:** من Profile
- **الغرض:** متابعة المواعيد

### `/vet-profile`
- **الأدوار:** vet
- **الوصول:** من Profile بعد دور Vet
- **الغرض:** إعداد ملف الطبيب + إرسال للتحقق

### `/vet-care-requests`
- **الأدوار:** vet
- **الوصول:** من Profile/لوحة الطبيب
- **الغرض:** مراجعة طلبات الرعاية للطبيب

### `/clinic-care-management`
- **الأدوار:** care_clinic
- **الوصول:** من Profile
- **الغرض:** إدارة طلبات الرعاية على مستوى العيادة

## 4) الحيوانات والملفات الصحية والتتبع

### `/my-pets` `/add-pet` `/pet/[id]`
- **الأدوار:** user
- **الوصول:** من Profile
- **الغرض:** إدارة الحيوانات الخاصة بالمستخدم

### `/health-records`
- **الأدوار:** user
- **الوصول:** من profile/pet
- **الغرض:** السجل الصحي للحيوانات

### `/pet-tracking` `/tag/[code]`
- **الأدوار:** user
- **الوصول:** من Profile
- **الغرض:** تتبع Tag/QR والإبلاغ عن المسح

## 5) المجتمع، الأصدقاء، الرسائل

### `/community` `/community/[id]` `/create-post`
- **الأدوار:** user
- **الوصول:** Home/Community
- **الغرض:** منشورات المجتمع والتفاعل

### `/friends` `/blocked-users`
- **الأدوار:** user
- **الوصول:** Profile/Community
- **الغرض:** إدارة الأصدقاء والحظر

### `/messages` `/chat/[id]`
- **الأدوار:** user / vet / clinic / market_owner / admin
- **الوصول:** Home/Profile
- **الغرض:** المحادثات والرسائل المباشرة

### `/notifications`
- **الأدوار:** كل الأدوار
- **الوصول:** أيقونة الإشعارات
- **الغرض:** مركز إشعارات مع deep-link للشاشات

## 6) السوق، الطلبات، الدفع

### `/marketplace` `/marketplace/[id]`
- **الأدوار:** user / market_owner
- **الوصول:** Home أو Profile
- **الغرض:** إعلانات السوق

### `/create-marketplace-listing` `/my-marketplace-listings`
- **الأدوار:** market_owner (وأحياناً user حسب السياسة)
- **الوصول:** من marketplace
- **الغرض:** إنشاء/إدارة الإعلانات

### `/cart` `/checkout` `/order-history` `/order/[id]`
- **الأدوار:** user
- **الوصول:** Shop
- **الغرض:** سلة/دفع/متابعة الطلبات

### `/market-owner-dashboard`
- **الأدوار:** market_owner
- **الوصول:** Profile
- **الغرض:** ملخص مبيعات وحالة المتجر

## 7) التبني، الرعاية، الرعاية الممولة (Sponsorship)

### `/create-adoption-post`
- **الأدوار:** user/admin
- **الوصول:** adoption
- **الغرض:** نشر حالة تبني

### `/sponsorships` `/sponsor/[petId]` `/my-sponsorships` `/create-sponsorship-post`
- **الأدوار:** user / admin
- **الوصول:** من Home/Profile
- **الغرض:** تمويل الحيوانات ومتابعة الرعايات

## 8) خرائط/طوارئ/مفقودات

### `/petsy-map`
- **الأدوار:** user
- **الوصول:** Home
- **الغرض:** عرض مواقع مرتبطة بالحيوانات

### `/emergency`
- **الأدوار:** user
- **الوصول:** Home/Profile
- **الغرض:** جهات اتصال طوارئ

### `/lost-found` `/lost-found/[id]`
- **الأدوار:** user
- **الوصول:** Home
- **الغرض:** بلاغات الحيوانات المفقودة/المعثور عليها

## 9) الإعدادات والخصوصية

### `/settings` `/edit-profile` `/change-password` `/delete-account`
- **الأدوار:** كل المستخدمين
- **الوصول:** Profile
- **الغرض:** إدارة الحساب

### `/privacy-settings` `/chat-preferences`
- **الأدوار:** كل المستخدمين
- **الوصول:** Settings
- **الغرض:** التحكم بالخصوصية والرسائل

### صفحات معلومات
- `/about` `/help-support` `/privacy-policy` `/terms`

## 10) الأدوار والطلبات

### `/role-request` `/my-role-requests`
- **الأدوار:** user
- **الوصول:** Profile
- **الغرض:** طلب الترقية إلى vet / market_owner / care_clinic

## 11) الذكاء الاصطناعي

### `/ai-assistant`
- **الأدوار:** user
- **الوصول:** Home/Profile
- **الغرض:** مساعد أسئلة عامة عن الحيوانات

## 12) الإدارة (Admin)

### `/admin`
- **الأدوار:** admin
- **الغرض:** لوحة تحكم الإدارة

### إدارة المستخدمين والأمان
- `/admin/users`
- **يشمل:** تعديل المستخدم، حظر/فك حظر، auth-fields

### إدارة الأطباء والتحقق
- `/admin/role-requests`
- `/admin/vet-profiles`
- `/admin/vets` (واجهة توجيه لطابور التحقق)

### إدارة العمليات
- `/admin/orders`
- `/admin/products`
- `/admin/marketplace`
- `/admin/appointments`
- `/admin/community`
- `/admin/sponsorships`
- `/admin/payments`
- `/admin/locations`
- `/admin/friend-reports`
- `/admin/audit-logs`
- `/admin/settings`

---

## English Version

Canonical app map for Petsy, built from route scan + backend API scan.

- **Discovered screens/routes:** 73 (excluding layout files)
- **Roles:** user / vet / care_clinic / market_owner / admin

### Auth
`/`, `/login`, `/signup`, `/verify`, `/forgot-password`

### Main tabs
`/home`, `/adoption`, `/shop`, `/profile`

### Care/Vets/Clinics
`/vets`, `/vet/[id]`, `/book-appointment/[vetId]`, `/my-appointments`, `/vet-profile`, `/vet-care-requests`, `/clinic-care-management`

### Pets/Health/Tracking
`/my-pets`, `/add-pet`, `/pet/[id]`, `/health-records`, `/pet-tracking`, `/tag/[code]`

### Community/Friends/Messaging
`/community`, `/community/[id]`, `/create-post`, `/friends`, `/blocked-users`, `/messages`, `/chat/[id]`, `/notifications`

### Marketplace/Orders/Payments
`/marketplace`, `/marketplace/[id]`, `/create-marketplace-listing`, `/my-marketplace-listings`, `/cart`, `/checkout`, `/order-history`, `/order/[id]`, `/market-owner-dashboard`

### Adoption/Sponsorship
`/create-adoption-post`, `/sponsorships`, `/sponsor/[petId]`, `/my-sponsorships`, `/create-sponsorship-post`

### Maps/Emergency/Lost&Found
`/petsy-map`, `/emergency`, `/lost-found`, `/lost-found/[id]`

### Settings/Privacy
`/settings`, `/edit-profile`, `/change-password`, `/delete-account`, `/privacy-settings`, `/chat-preferences`, `/about`, `/help-support`, `/privacy-policy`, `/terms`

### Role Requests
`/role-request`, `/my-role-requests`

### AI
`/ai-assistant`

### Admin
`/admin` + all `/admin/*` pages including users, role-requests, vet-profiles, orders, products, marketplace, audit-logs, etc.

## UX Complexity Notes / ملاحظات تعقيد UX

1. Vet onboarding spans multiple screens (role request + profile + admin verification queue) and can be confusing without a progress banner.
2. Admin has both `/admin/vets` and `/admin/vet-profiles`; users may not know that vet verification is only in vet-profiles queue.
3. Many features are role-gated but entry points are spread across Home/Profile; adding role-based “My Work” shortcuts would simplify navigation.
