# QA_CHECKLIST.md

## العربية (أولاً) — GO/NO-GO

### المصادقة
- [ ] التسجيل يعمل
- [ ] التفعيل يعمل
- [ ] تسجيل الدخول يعمل
- [ ] استعادة كلمة المرور تعمل

### الأدوار
- [ ] طلب دور جديد يعمل
- [ ] موافقة admin على role request تعمل
- [ ] صلاحيات كل دور صحيحة (لا وصول غير مصرح)

### Vet Verification
- [ ] vet profile submit يعمل
- [ ] admin notification من نوع `vet_profile_verification` تصل
- [ ] deep-link يفتح `/admin/vet-profiles` مع المعرف الصحيح
- [ ] approve يضبط `active + verified=true`
- [ ] set_public=true يجعل الطبيب ظاهرًا في `/vets`
- [ ] set_public=false يخفي الطبيب
- [ ] audit log يحتوي `review_vet_profile`

### التجارة والطلبات
- [ ] إضافة منتج للسلة تعمل
- [ ] checkout يكتمل
- [ ] order history يظهر الطلب

### المجتمع والرسائل
- [ ] إنشاء منشور community يعمل
- [ ] like/comment يعملان
- [ ] الرسائل والمحادثات تعمل
- [ ] read status يتحدّث

### الإدارة
- [ ] `/admin/users` يعمل
- [ ] `/admin/products` يعمل
- [ ] `/admin/marketplace` يعمل
- [ ] `/admin/audit-logs` يعمل

### قرار الإطلاق
- [ ] **GO** إذا جميع البنود الأساسية أعلاه ناجحة
- [ ] **NO-GO** إذا فشل أي بند في Vet Verification أو Auth

---

## English Version — GO/NO-GO

### Auth
- [ ] Signup works
- [ ] Verification works
- [ ] Login works
- [ ] Forgot/reset password works

### Roles
- [ ] Role request works
- [ ] Admin approval works
- [ ] Role permissions are enforced

### Vet Verification
- [ ] Vet submit works
- [ ] Admin gets `vet_profile_verification` notification
- [ ] Deep-link opens `/admin/vet-profiles` with target profile
- [ ] Approve sets `active + verified=true`
- [ ] `set_public=true` makes vet visible in `/vets`
- [ ] `set_public=false` hides vet
- [ ] Audit log contains `review_vet_profile`

### Commerce
- [ ] Cart add works
- [ ] Checkout works
- [ ] Order history shows results

### Community/Messaging
- [ ] Community post works
- [ ] Like/comment works
- [ ] Messaging works
- [ ] Read status updates

### Admin
- [ ] `/admin/users` works
- [ ] `/admin/products` works
- [ ] `/admin/marketplace` works
- [ ] `/admin/audit-logs` works

### Release Decision
- [ ] **GO** only if all critical checks pass
- [ ] **NO-GO** if any Auth or Vet Verification check fails
