# إطلاق Android — Google Play (سوريا)

## الحالة
- المشروع Expo (`frontend/`) جاهز للبناء عبر EAS
- الهدف: Internal testing أولاً ثم إنتاج سوريا

## خطوات التنفيذ
1. تثبيت EAS CLI وتسجيل الدخول: `npm i -g eas-cli && eas login`
2. من مجلد `frontend/`: `eas build --platform android --profile preview`
3. إنشاء تطبيق في Google Play Console باسم Petsy
4. رفع AAB من EAS إلى Internal testing track
5. إضافة مختبرين في دمشق/حلب
6. بعد استقرار البيتا: ترقية إلى Production مع سياسة الخصوصية `https://petsy.company/privacy-policy`

## متطلبات المتجر
- أيقونة 512 وfeature graphic
- لقطات شاشة عربية
- تصنيف محتوى عائلي
- رابط شروط وخصوصية واسترجاع

## ملاحظات سوريا
- Google Play متاح جزئياً حسب الجهاز/VPN للمستخدمين؛ الإبقاء على توزيع sideload داخلي للبيتا مقبول
