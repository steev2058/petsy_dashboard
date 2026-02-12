import io
import os
import uuid
from datetime import datetime

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

    async def to_list(self, n):
        return list(self.rows)[:n]


class FakeCollection:
    def __init__(self):
        self.rows = []

    def _match(self, row, query):
        query = query or {}
        for k, v in query.items():
            if isinstance(v, dict) and "$or" in v:
                if not any(self._match(row, item) for item in v["$or"]):
                    return False
            elif k == "$or":
                if not any(self._match(row, item) for item in v):
                    return False
            else:
                if row.get(k) != v:
                    return False
        return True

    async def insert_one(self, doc):
        self.rows.append(dict(doc))
        return InsertResult(doc.get("id"))

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
                return UpdateResult(1, 1)
        if upsert:
            new_row = dict(query)
            if "$set" in update:
                new_row.update(update["$set"])
            self.rows.append(new_row)
            return UpdateResult(0, 1)
        return UpdateResult(0, 0)

    async def delete_one(self, query):
        for i, row in enumerate(self.rows):
            if self._match(row, query):
                self.rows.pop(i)
                return DeleteResult(1)
        return DeleteResult(0)


class FakeDB:
    def __init__(self):
        self.users = FakeCollection()
        self.care_requests = FakeCollection()
        self.care_request_events = FakeCollection()
        self.health_records = FakeCollection()
        self.appointments = FakeCollection()
        self.medical_attachments = FakeCollection()
        self.appointment_reminders = FakeCollection()
        self.notifications = FakeCollection()


@pytest.fixture()
def client_and_db(tmp_path, monkeypatch):
    fake_db = FakeDB()
    monkeypatch.setattr(server, "db", fake_db)
    monkeypatch.setattr(server, "MEDICAL_UPLOAD_ROOT", tmp_path / "medical")
    return TestClient(server.app), fake_db


def _seed_user(fake_db, email, role="user", is_admin=False):
    user_id = str(uuid.uuid4())
    user = {
        "id": user_id,
        "email": email,
        "name": email.split("@")[0],
        "password": "hashed",
        "is_verified": True,
        "role": role,
        "is_admin": is_admin,
        "created_at": datetime.utcnow(),
    }
    fake_db.users.rows.append(user)
    token = server.create_access_token({"sub": user_id})
    return user, token


def test_medical_upload_list_download_delete_authorization(client_and_db):
    client, db = client_and_db
    owner, owner_token = _seed_user(db, "owner@test.com", role="user")
    vet, vet_token = _seed_user(db, "vet@test.com", role="vet")
    stranger, stranger_token = _seed_user(db, "stranger@test.com", role="user")

    care_request_id = str(uuid.uuid4())
    db.care_requests.rows.append({
        "id": care_request_id,
        "requested_by": owner["id"],
        "assigned_vet_id": vet["id"],
        "pet_id": "pet-1",
        "status": "accepted",
        "created_at": datetime.utcnow(),
    })

    upload = client.post(
        "/api/medical-attachments/upload",
        data={"care_request_id": care_request_id},
        files={"file": ("lab-report.pdf", io.BytesIO(b"pdf-content"), "application/pdf")},
        headers={"Authorization": f"Bearer {owner_token}"},
    )
    assert upload.status_code == 200
    attachment_id = upload.json()["id"]

    listed_for_vet = client.get(
        f"/api/medical-attachments?care_request_id={care_request_id}",
        headers={"Authorization": f"Bearer {vet_token}"},
    )
    assert listed_for_vet.status_code == 200
    assert len(listed_for_vet.json()) == 1

    blocked = client.get(
        f"/api/medical-attachments?care_request_id={care_request_id}",
        headers={"Authorization": f"Bearer {stranger_token}"},
    )
    assert blocked.status_code == 403

    downloaded = client.get(
        f"/api/medical-attachments/{attachment_id}/download",
        headers={"Authorization": f"Bearer {vet_token}"},
    )
    assert downloaded.status_code == 200
    assert downloaded.content == b"pdf-content"

    deleted = client.delete(
        f"/api/medical-attachments/{attachment_id}",
        headers={"Authorization": f"Bearer {owner_token}"},
    )
    assert deleted.status_code == 200


def test_medical_attachment_validation_and_attach_endpoint(client_and_db):
    client, db = client_and_db
    owner, owner_token = _seed_user(db, "owner2@test.com", role="user")

    apt_id = str(uuid.uuid4())
    db.appointments.rows.append({
        "id": apt_id,
        "user_id": owner["id"],
        "vet_id": "vet-x",
        "pet_id": "pet-a",
        "date": "2026-02-14",
        "time": "14:00",
    })

    bad = client.post(
        "/api/medical-attachments/upload",
        data={"appointment_id": apt_id},
        files={"file": ("script.exe", io.BytesIO(b"MZ"), "application/octet-stream")},
        headers={"Authorization": f"Bearer {owner_token}"},
    )
    assert bad.status_code == 400

    upload = client.post(
        "/api/medical-attachments/upload",
        data={"appointment_id": apt_id},
        files={"file": ("note.txt", io.BytesIO(b"ok"), "text/plain")},
        headers={"Authorization": f"Bearer {owner_token}"},
    )
    assert upload.status_code == 200
    attachment_id = upload.json()["id"]

    record_id = str(uuid.uuid4())
    db.health_records.rows.append({
        "id": record_id,
        "pet_id": "pet-a",
        "user_id": owner["id"],
        "created_at": datetime.utcnow(),
    })

    attach = client.post(
        f"/api/medical-attachments/{attachment_id}/attach",
        json={"health_record_id": record_id},
        headers={"Authorization": f"Bearer {owner_token}"},
    )
    assert attach.status_code == 200
    body = attach.json()
    assert body["health_record_id"] == record_id


def test_simulate_appointment_reminder_creates_evidence(client_and_db):
    client, db = client_and_db
    owner, owner_token = _seed_user(db, "owner3@test.com", role="user")

    apt_id = str(uuid.uuid4())
    db.appointments.rows.append({
        "id": apt_id,
        "user_id": owner["id"],
        "vet_id": "vet-10",
        "date": "2026-02-20",
        "time": "09:30",
    })

    res = client.post(
        f"/api/appointments/{apt_id}/reminders/simulate",
        headers={"Authorization": f"Bearer {owner_token}"},
    )
    assert res.status_code == 200
    payload = res.json()
    assert payload["status"] == "sent"
    assert len(db.appointment_reminders.rows) == 1
    assert len(db.notifications.rows) == 1
