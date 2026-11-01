#!/usr/bin/env python3
"""Seed Syria beta content for Petsy (idempotent-ish by email/title markers)."""
import asyncio
import os
import uuid
from datetime import datetime, timedelta, timezone

from motor.motor_asyncio import AsyncIOMotorClient
from passlib.context import CryptContext

pwd = CryptContext(schemes=["bcrypt"], deprecated="auto")
MONGO = os.environ.get("MONGO_URL", "mongodb://127.0.0.1:27017")
DB_NAME = os.environ.get("DB_NAME", "petsy_db")


def oid():
    return str(uuid.uuid4())


async def main():
    client = AsyncIOMotorClient(MONGO)
    db = client[DB_NAME]
    now = datetime.now(timezone.utc).isoformat()

    await db.platform_settings.update_one(
        {"id": "sharia_policy"},
        {
            "$set": {
                "id": "sharia_policy",
                "enabled": True,
                "no_riba": True,
                "banned_keywords": [
                    "خمر",
                    "كحول",
                    "beer",
                    "wine",
                    "alcohol",
                    "خنزير",
                    "pork",
                    "قمار",
                    "يانصيب",
                    "gambling",
                    "ربا",
                ],
                "banned_categories": ["alcohol", "pork", "gambling", "riba_finance"],
                "updated_at": now,
            }
        },
        upsert=True,
    )

    sellers = [
        {
            "email": "seller.damascus@petsy.company",
            "name": "متجر دمشق للحيوانات",
            "city": "دمشق",
            "role": "market_owner",
        },
        {
            "email": "seller.aleppo@petsy.company",
            "name": "سوق حلب للحيوانات",
            "city": "حلب",
            "role": "market_owner",
        },
    ]
    vets = [
        {
            "email": "vet.damascus@petsy.company",
            "name": "د. سارة البيطار",
            "city": "دمشق",
            "clinic": "عيادة الشام البيطرية",
        },
        {
            "email": "vet.aleppo@petsy.company",
            "name": "د. أحمد الحلبي",
            "city": "حلب",
            "clinic": "عيادة حلب البيطرية",
        },
        {
            "email": "vet.latakia@petsy.company",
            "name": "د. ليلى الساحلية",
            "city": "اللاذقية",
            "clinic": "عيادة الساحل",
        },
    ]

    user_ids = {}
    for s in sellers + [
        {"email": v["email"], "name": v["name"], "city": v["city"], "role": "vet"} for v in vets
    ]:
        existing = await db.users.find_one({"email": s["email"]})
        if existing:
            user_ids[s["email"]] = existing["id"]
            continue
        uid = oid()
        user_ids[s["email"]] = uid
        await db.users.insert_one(
            {
                "id": uid,
                "email": s["email"],
                "name": s["name"],
                "password_hash": pwd.hash("PetsySyria2026!"),
                "phone": "+963900000000",
                "city": s["city"],
                "language": "ar",
                "is_verified": True,
                "is_admin": False,
                "role": s["role"],
                "seller_verified": s["role"] == "market_owner",
                "vet_verified": s["role"] == "vet",
                "created_at": now,
            }
        )

    products = [
        ("طعام قطط جاف 2كغ", 45000, "دمشق", "food"),
        ("طوق وكلبشة", 18000, "دمشق", "accessories"),
        ("رمل قطط 10ل", 22000, "حلب", "supplies"),
        ("شامبو حيوانات لطيف", 15000, "حلب", "grooming"),
        ("قفص نقل صغير", 65000, "دمشق", "accessories"),
        ("ألعاب قطط مجموعة", 12000, "اللاذقية", "toys"),
        ("طعام كلاب 3كغ", 52000, "حلب", "food"),
        ("فرشاة تنظيف", 9000, "دمشق", "grooming"),
    ]
    for title, price, city, cat in products:
        marker = f"[syria-seed] {title}"
        if await db.products.find_one({"name": marker}):
            continue
        owner_email = "seller.damascus@petsy.company" if city == "دمشق" else "seller.aleppo@petsy.company"
        await db.products.insert_one(
            {
                "id": oid(),
                "name": marker,
                "description": f"منتج تجريبي لبيتا سوريا — {title}",
                "price": price,
                "currency": "SYP",
                "category": cat,
                "city": city,
                "stock": 25,
                "images": [],
                "seller_id": user_ids[owner_email],
                "status": "approved",
                "payment_methods": ["cash_on_delivery", "shamcash"],
                "created_at": now,
            }
        )

    adoptions = [
        ("قط شيرازي للتبني", "قط", "دمشق"),
        ("كلب صغير ودود", "كلب", "حلب"),
        ("قطة منزلية هادئة", "قط", "دمشق"),
        ("أرنب أليف", "أرنب", "حمص"),
        ("طائر كناري", "طائر", "اللاذقية"),
        ("قطة كاليلو للرعاية", "قط", "دمشق"),
        ("كلب حراسة للتبني", "كلب", "حلب"),
        ("سلحفاة أليفة", "زواحف", "طرطوس"),
    ]
    for title, species, city in adoptions:
        marker = f"[syria-seed] {title}"
        if await db.pets.find_one({"name": marker}):
            continue
        await db.pets.insert_one(
            {
                "id": oid(),
                "name": marker,
                "species": species,
                "breed": "محلي",
                "age": "1-2",
                "gender": "unknown",
                "description": "منشور تبنّي تجريبي لبيتا سوريا — رعاية ورحمة.",
                "status": "adoption",
                "location": city,
                "city": city,
                "vaccinated": True,
                "neutered": False,
                "owner_id": user_ids["seller.damascus@petsy.company"],
                "likes": 0,
                "views": 0,
                "created_at": now,
            }
        )

    lost = [
        ("قطة بيضاء مفقودة — المزة", "دمشق", "lost"),
        ("كلب بني موجود — الشهباء", "حلب", "found"),
        ("ببغاء مفقود — المشروع", "دمشق", "lost"),
        ("قطة رمادية موجودة — الأوقاف", "حمص", "found"),
    ]
    for title, city, kind in lost:
        marker = f"[syria-seed] {title}"
        if await db.lost_found.find_one({"title": marker}):
            continue
        await db.lost_found.insert_one(
            {
                "id": oid(),
                "title": marker,
                "description": "بلاغ تجريبي لبيتا سوريا",
                "type": kind,
                "city": city,
                "status": "open",
                "user_id": user_ids["seller.damascus@petsy.company"],
                "created_at": now,
            }
        )

    for v in vets:
        uid = user_ids[v["email"]]
        if await db.vet_profiles.find_one({"user_id": uid}):
            continue
        await db.vet_profiles.insert_one(
            {
                "id": oid(),
                "user_id": uid,
                "clinic_name": v["clinic"],
                "city": v["city"],
                "bio": "عيادة بيطرية ضمن بيتا Petsy سوريا",
                "specialties": ["عام", "تلقيح"],
                "status": "approved",
                "verified": True,
                "consultation_note": "الاستشارة عبر المنصة لا تغني عن الكشف المباشر عند الحاجة",
                "created_at": now,
            }
        )

    # sample community posts
    posts = [
        "نصيحة: افحص طوق كلبك قبل الخروج في الشوارع المزدحمة",
        "من يوصي بعيادة جيدة في دمشق للتلقيح؟",
        "تم تبنّي قطة اليوم عبر Petsy — شكراً للمجتمع",
    ]
    for body in posts:
        marker = f"[syria-seed] {body}"
        if await db.community_posts.find_one({"content": marker}):
            continue
        await db.community_posts.insert_one(
            {
                "id": oid(),
                "content": marker,
                "user_id": user_ids["seller.damascus@petsy.company"],
                "likes": 0,
                "comments_count": 0,
                "created_at": now,
            }
        )

    print("Syria seed complete")
    client.close()


if __name__ == "__main__":
    asyncio.run(main())
