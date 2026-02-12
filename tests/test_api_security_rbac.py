import os
import uuid
from datetime import datetime, timedelta

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


class DeleteResult:
    def __init__(self, deleted_count=0):
        self.deleted_count = deleted_count


class FakeCursor:
    def __init__(self, rows):
        self.rows = list(rows)

    def sort(self, key, direction):
        reverse = direction == -1
        self.rows.sort(key=lambda r: r.get(key), reverse=reverse)
        return self

    def skip(self, _n):
        return self

    def limit(self, _n):
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
            if isinstance(v, dict) and "$ne" in v:
                if row.get(k) == v["$ne"]:
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
                if "$unset" in update:
                    for k in update["$unset"].keys():
                        row.pop(k, None)
                self.rows[i] = row
                return UpdateResult(matched_count=1, modified_count=1)
        if upsert:
            new_row = dict(query)
            if "$set" in update:
                new_row.update(update["$set"])
            self.rows.append(new_row)
            return UpdateResult(matched_count=0, modified_count=1)
        return UpdateResult()


class FakeDB:
    def __init__(self):
        self.users = FakeCollection()
        self.pets = FakeCollection()
        self.health_records = FakeCollection()
        self.marketplace_listings = FakeCollection()


@pytest.fixture()
def client_and_db(monkeypatch):
    fake_db = FakeDB()
    monkeypatch.setattr(server, "db", fake_db)
    return TestClient(server.app), fake_db


def _signup_and_verify(client, email, name="User", password="secret123"):
    r = client.post("/api/auth/signup", json={"email": email, "name": name, "password": password})
    assert r.status_code == 200
    payload = r.json()
    assert "user_id" in payload
    assert "verification_code" not in payload  # hardened: no code by default

    user = next(u for u in server.db.users.rows if u["email"] == email)
    vr = client.post(f"/api/auth/verify?user_id={user['id']}&code={user['verification_code']}")
    assert vr.status_code == 200

    lr = client.post("/api/auth/login", json={"email": email, "password": password})
    assert lr.status_code == 200
    return lr.json()["access_token"], user


def test_auth_code_not_leaked_by_default(client_and_db):
    client, _db = client_and_db
    r = client.post("/api/auth/signup", json={"email": "u1@test.com", "name": "U1", "password": "secret123"})
    assert r.status_code == 200
    body = r.json()
    assert "verification_code" not in body


def test_rbac_admin_endpoint_user_forbidden_admin_allowed(client_and_db):
    client, db = client_and_db

    user_token, _ = _signup_and_verify(client, "user@test.com")
    admin_token, admin_user = _signup_and_verify(client, "admin@test.com", name="Admin")
    admin_user["role"] = "admin"
    admin_user["is_admin"] = True

    r_user = client.get("/api/admin/marketplace/listings", headers={"Authorization": f"Bearer {user_token}"})
    assert r_user.status_code == 403

    r_admin = client.get("/api/admin/marketplace/listings", headers={"Authorization": f"Bearer {admin_token}"})
    assert r_admin.status_code == 200
    assert isinstance(r_admin.json(), list)


def test_health_records_require_pet_ownership(client_and_db):
    client, db = client_and_db

    token_a, user_a = _signup_and_verify(client, "a@test.com", name="A")
    token_b, user_b = _signup_and_verify(client, "b@test.com", name="B")

    pet_id = str(uuid.uuid4())
    db.pets.rows.append({"id": pet_id, "owner_id": user_a["id"], "name": "A-pet", "species": "cat", "gender": "male"})
    db.health_records.rows.append({
        "id": str(uuid.uuid4()),
        "pet_id": pet_id,
        "user_id": user_a["id"],
        "record_type": "checkup",
        "title": "Annual",
        "date": "2026-02-12",
        "created_at": datetime.utcnow(),
    })

    own = client.get(f"/api/health-records/{pet_id}", headers={"Authorization": f"Bearer {token_a}"})
    assert own.status_code == 200
    assert len(own.json()) == 1

    other = client.get(f"/api/health-records/{pet_id}", headers={"Authorization": f"Bearer {token_b}"})
    assert other.status_code == 404


def test_forgot_password_does_not_leak_reset_code(client_and_db):
    client, _ = client_and_db
    _signup_and_verify(client, "fp@test.com", name="FP")

    r = client.post("/api/auth/forgot-password", json={"email": "fp@test.com"})
    assert r.status_code == 200
    body = r.json()
    assert "reset_code" not in body
    assert "message" in body
