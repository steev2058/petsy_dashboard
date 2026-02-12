import os
import uuid
from datetime import datetime

import jwt
import pytest
from fastapi.testclient import TestClient

os.environ.setdefault("MONGO_URL", "mongodb://localhost:27017")
os.environ.setdefault("DB_NAME", "petsy_test")

from backend import server  # noqa: E402


class InsertResult:
    def __init__(self, inserted_id=None):
        self.inserted_id = inserted_id


class UpdateResult:
    def __init__(self, matched_count=0, modified_count=0):
        self.matched_count = matched_count
        self.modified_count = modified_count


class FakeCursor:
    def __init__(self, rows):
        self.rows = list(rows)

    def sort(self, key, direction):
        reverse = direction == -1
        self.rows.sort(key=lambda r: r.get(key), reverse=reverse)
        return self

    async def to_list(self, n):
        return list(self.rows)[:n]


class FakeCollection:
    def __init__(self):
        self.rows = []

    async def insert_one(self, doc):
        self.rows.append(dict(doc))
        return InsertResult(doc.get("id"))

    def _match(self, row, query):
        for k, v in (query or {}).items():
            if isinstance(v, dict) and "$elemMatch" in v:
                arr = row.get(k) or []
                subq = v["$elemMatch"]
                if not any(all((item or {}).get(sk) == sv for sk, sv in subq.items()) for item in arr):
                    return False
            elif row.get(k) != v:
                return False
        return True

    async def find_one(self, query):
        for row in self.rows:
            if self._match(row, query):
                return dict(row)
        return None

    def find(self, query):
        return FakeCursor([dict(r) for r in self.rows if self._match(r, query)])

    async def update_one(self, query, update, upsert=False):
        for i, row in enumerate(self.rows):
            if self._match(row, query):
                if "$set" in update:
                    row.update(update["$set"])
                self.rows[i] = row
                return UpdateResult(matched_count=1, modified_count=1)
        return UpdateResult(matched_count=0, modified_count=0)


class FakeDB:
    def __init__(self):
        self.users = FakeCollection()
        self.orders = FakeCollection()
        self.notifications = FakeCollection()


@pytest.fixture()
def client_and_db(monkeypatch):
    fake_db = FakeDB()
    monkeypatch.setattr(server, "db", fake_db)
    return TestClient(server.app), fake_db


def _token_for(user_id: str) -> str:
    return jwt.encode({"sub": user_id}, server.SECRET_KEY, algorithm=server.ALGORITHM)


def _auth_header(user_id: str):
    return {"Authorization": f"Bearer {_token_for(user_id)}"}


def _seed_users(db):
    buyer_id = str(uuid.uuid4())
    seller_id = str(uuid.uuid4())
    other_seller_id = str(uuid.uuid4())

    db.users.rows.extend(
        [
            {"id": buyer_id, "email": "buyer@test.com", "role": "user", "is_admin": False},
            {"id": seller_id, "email": "seller@test.com", "role": "market_owner", "is_admin": False},
            {"id": other_seller_id, "email": "other@test.com", "role": "market_owner", "is_admin": False},
        ]
    )
    return buyer_id, seller_id, other_seller_id


def _seed_order(db, buyer_id: str, seller_id: str, status="confirmed"):
    order_id = str(uuid.uuid4())
    db.orders.rows.append(
        {
            "id": order_id,
            "user_id": buyer_id,
            "items": [
                {
                    "product_id": "listing-1",
                    "name": "Leash",
                    "price": 10.0,
                    "quantity": 1,
                    "seller_user_id": seller_id,
                }
            ],
            "total": 10.0,
            "status": status,
            "shipping_address": "Addr",
            "shipping_city": "Amman",
            "shipping_phone": "+962",
            "payment_method": "cash_on_delivery",
            "created_at": datetime.utcnow(),
        }
    )
    return order_id


def test_seller_order_transition_happy_path_and_buyer_visibility(client_and_db):
    client, db = client_and_db
    buyer_id, seller_id, _ = _seed_users(db)
    order_id = _seed_order(db, buyer_id, seller_id, status="confirmed")

    r = client.put(
        f"/api/orders/sales/{order_id}/status",
        headers=_auth_header(seller_id),
        json={"to_status": "shipped", "reason": "Dropped at courier"},
    )
    assert r.status_code == 200
    assert r.json()["status"] == "shipped"

    buyer_order = client.get(f"/api/orders/{order_id}", headers=_auth_header(buyer_id))
    assert buyer_order.status_code == 200
    assert buyer_order.json()["status"] == "shipped"

    assert len(db.notifications.rows) == 1
    notif = db.notifications.rows[0]
    assert notif["user_id"] == buyer_id
    assert notif["type"] == "order"
    assert notif["data"]["status"] == "shipped"


def test_seller_cannot_transition_unrelated_order(client_and_db):
    client, db = client_and_db
    buyer_id, seller_id, other_seller_id = _seed_users(db)
    order_id = _seed_order(db, buyer_id, other_seller_id, status="confirmed")

    r = client.put(
        f"/api/orders/sales/{order_id}/status",
        headers=_auth_header(seller_id),
        json={"to_status": "shipped"},
    )
    assert r.status_code == 403

    current = next(o for o in db.orders.rows if o["id"] == order_id)
    assert current["status"] == "confirmed"
    assert db.notifications.rows == []


def test_seller_invalid_transition_rejected(client_and_db):
    client, db = client_and_db
    buyer_id, seller_id, _ = _seed_users(db)
    order_id = _seed_order(db, buyer_id, seller_id, status="pending")

    r = client.put(
        f"/api/orders/sales/{order_id}/status",
        headers=_auth_header(seller_id),
        json={"to_status": "delivered"},
    )
    assert r.status_code == 400
    assert "Invalid transition" in r.json()["detail"]

    current = next(o for o in db.orders.rows if o["id"] == order_id)
    assert current["status"] == "pending"
