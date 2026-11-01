# حالة إطلاق سوريا — Petsy

## مكتمل
- أمن seed + CORS + JWT إنتاج
- نسخ احتياطي Mongo يومي + مراقبة صحة API
- Design System عربي (ألوان دمشق/زيتون + Tajawal)
- هبوط `/welcome` + دخول عربي + تبويبات 5
- `https://admin.petsy.company` SSL
- COD + ShamCash (مرجع/QR + تأكيد يدوي) بدون Stripe/PayPal
- عمولة منصة 5% كأجرة خدمة
- تحقق بائع/بيطري عبر API أدمن
- طوابير أدمن + سياسة شرعية + تحليلات
- محتوى أولي (تبنّي/ضائع/سوق/بيطرة)
- شروط / خصوصية / استرجاع عربية
- مسار Google Play موثّق (EAS preview APK)

## قبل الإطلاق العام
- ضبط SMTP حقيقي (المتغيرات موجودة فارغة في `.env`)
- رفع موارد VPS إن لزم
- مراجعة فقهية/قانونية محلية للمستندات
- بناء EAS ورفع Internal testing: `cd frontend && eas build -p android --profile preview`
