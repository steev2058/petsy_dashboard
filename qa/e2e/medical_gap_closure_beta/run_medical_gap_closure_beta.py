#!/usr/bin/env python3
import json
import time
from datetime import datetime, timezone, timedelta
from pathlib import Path

import jwt
import requests

BASES = ["http://127.0.0.1:8001/api", "http://127.0.0.1:8000/api"]
JWT_SECRET = "petsy-secret-key-2026"
JWT_ALG = "HS256"
OUT = Path(__file__).resolve().parent
OUT.mkdir(parents=True, exist_ok=True)

VET_EMAIL = "demo.vet@petsy.com"
VET_PASSWORD = "demo123"
USER_PASSWORD = "GapClose#2026!"


def now_iso():
    return datetime.now(timezone.utc).isoformat()


def pick_base():
    for b in BASES:
        try:
            if requests.get(f"{b}/health", timeout=4).status_code == 200:
                return b
        except Exception:
            pass
    raise RuntimeError("No API reachable on 8001/8000")


def call(method, base, path, token=None, json_payload=None, params=None):
    headers = {}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    r = requests.request(method, f"{base}{path}", headers=headers, json=json_payload, params=params, timeout=35)
    try:
        body = r.json()
    except Exception:
        body = r.text
    return r.status_code, body


def log(steps, method, path, status, req=None, res=None):
    steps.append({"ts": now_iso(), "method": method, "path": path, "status": status, "request": req, "response": res})


def login(base, email, password, steps):
    st, body = call("POST", base, "/auth/login", json_payload={"email": email, "password": password})
    log(steps, "POST", "/auth/login", st, {"email": email, "password": "***"}, body)
    if st == 200 and isinstance(body, dict):
        return body.get("access_token"), body.get("user", {})
    return None, None


def main():
    base = pick_base()
    run_id = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    marker = f"medical-gap-close-{run_id}"
    steps = []

    vet_token, vet_user = login(base, VET_EMAIL, VET_PASSWORD, steps)
    if not vet_token:
        raise RuntimeError("Vet login failed")

    nonce = int(time.time())
    email = f"beta.med.gap.{nonce}@example.com"
    st, body = call("POST", base, "/auth/signup", json_payload={"email": email, "name": "Beta Med Gap", "password": USER_PASSWORD})
    log(steps, "POST", "/auth/signup", st, {"email": email, "password": "***"}, body)
    if st != 200 or not isinstance(body, dict) or not body.get("user_id"):
        raise RuntimeError(f"Signup failed: {st} {body}")
    user_id = body["user_id"]
    user_token = jwt.encode({"sub": user_id}, JWT_SECRET, algorithm=JWT_ALG)

    pets = []
    for i, name in enumerate(["Milo", "Luna", "Kiwi"], start=1):
        st, p = call("POST", base, "/pets", token=user_token, json_payload={
            "name": f"{name}-{run_id[-4:]}", "species": "dog" if i != 3 else "cat", "gender": "male",
            "status": "owned", "description": f"{marker}-pet-{i}", "location": "Amman"
        })
        log(steps, "POST", "/pets", st, {"name": name}, p)
        if st == 200 and isinstance(p, dict):
            pets.append(p)

    st, mypets = call("GET", base, "/pets/my", token=user_token)
    log(steps, "GET", "/pets/my", st, None, mypets)

    target_pet_id = pets[0]["id"]
    attachments = [
        "data:image/jpeg;base64,ZmFrZS1hdHRhY2gtMQ==",
        "data:image/jpeg;base64,ZmFrZS1hdHRhY2gtMg==",
    ]

    st, req = call("POST", base, "/care-requests", token=user_token, json_payload={
        "pet_id": target_pet_id,
        "title": f"Follow-up review {marker}",
        "description": "Pet still coughing after meds.",
        "location": "Amman",
        "priority": "high",
        "follow_up_context": "Symptoms improved for 2 days then returned.",
        "follow_up_due_date": (datetime.now(timezone.utc).date() + timedelta(days=7)).isoformat(),
        "reminder_enabled": True,
        "attachments": attachments,
    })
    log(steps, "POST", "/care-requests", st, {"pet_id": target_pet_id, "attachments": 2}, req)
    request_id = req.get("id") if st == 200 and isinstance(req, dict) else None

    st, vet_queue = call("GET", base, "/vet/care-requests", token=vet_token)
    log(steps, "GET", "/vet/care-requests", st, None, vet_queue)
    matching = None
    if st == 200 and isinstance(vet_queue, list) and request_id:
        for r in vet_queue:
            if r.get("id") == request_id:
                matching = r
                break

    st1, a1 = call("PUT", base, f"/vet/care-requests/{request_id}", token=vet_token, json_payload={"action": "accept"})
    st2, a2 = call("PUT", base, f"/vet/care-requests/{request_id}", token=vet_token, json_payload={"action": "start"})
    st3, a3 = call("PUT", base, f"/vet/care-requests/{request_id}", token=vet_token, json_payload={"action": "complete", "diagnosis": "Upper respiratory inflammation", "prescription": "Continue antibiotics 5 days", "vet_notes": "Hydration + steam"})
    log(steps, "PUT", f"/vet/care-requests/{request_id}", st1, {"action": "accept"}, a1)
    log(steps, "PUT", f"/vet/care-requests/{request_id}", st2, {"action": "start"}, a2)
    log(steps, "PUT", f"/vet/care-requests/{request_id}", st3, {"action": "complete"}, a3)

    st, timeline = call("GET", base, f"/care-requests/{request_id}/timeline", token=user_token)
    log(steps, "GET", f"/care-requests/{request_id}/timeline", st, None, timeline)

    st, records = call("GET", base, f"/health-records/{target_pet_id}", token=user_token)
    log(steps, "GET", f"/health-records/{target_pet_id}", st, None, records)

    st, notifications = call("GET", base, "/notifications", token=user_token)
    log(steps, "GET", "/notifications", st, None, notifications)

    # Permission check: another user cannot read timeline
    st, other = call("POST", base, "/auth/signup", json_payload={"email": f"other.med.gap.{nonce}@example.com", "name": "Other", "password": USER_PASSWORD})
    other_id = other.get("user_id") if st == 200 and isinstance(other, dict) else None
    other_token = jwt.encode({"sub": other_id}, JWT_SECRET, algorithm=JWT_ALG) if other_id else None
    st_perm, perm_body = call("GET", base, f"/care-requests/{request_id}/timeline", token=other_token)
    log(steps, "GET", f"/care-requests/{request_id}/timeline", st_perm, {"as": "other_user"}, perm_body)

    checks = []
    checks.append(("3-pet user setup", st == 200 and isinstance(mypets, list) and len(mypets) == 3))
    checks.append(("User can create follow-up care request with attachments", request_id is not None and st == 200))
    checks.append(("Vet queue sees attachments + follow-up context", bool(matching) and isinstance(matching.get("attachments"), list) and len(matching.get("attachments", [])) == 2 and bool(matching.get("follow_up_context"))))
    checks.append(("Reminder/follow-up fields persisted", bool(matching) and matching.get("reminder_enabled") is True and bool(matching.get("follow_up_due_date"))))
    checks.append(("Vet complete flow succeeds", st1 == 200 and st2 == 200 and st3 == 200 and isinstance(a3, dict) and a3.get("status") == "completed"))
    checks.append(("Health record receives attachment continuity", isinstance(records, list) and any((r.get("attachments") and len(r.get("attachments")) >= 2 and r.get("record_type") == "vet_visit") for r in records if isinstance(r, dict))))
    checks.append(("Timeline reflects lifecycle", isinstance(timeline, list) and all(s in [e.get("status") for e in timeline if isinstance(e, dict)] for s in ["pending", "accepted", "in_progress", "completed"])))
    notif_items = notifications.get("items", []) if isinstance(notifications, dict) else []
    checks.append(("Notifications include care/reminder updates", any((n.get("type") == "care_request") for n in notif_items if isinstance(n, dict))))
    checks.append(("Permission UX backend guard (other user denied timeline)", st_perm == 403))

    matrix = [{"check": c, "result": "PASS" if ok else "FAIL"} for c, ok in checks]
    blockers = [c for c, ok in checks if not ok]

    evidence = {
        "run_id": run_id,
        "base": base,
        "marker": marker,
        "users": {
            "beta_user": {"id": user_id, "email": email},
            "vet": {"id": vet_user.get("id"), "email": vet_user.get("email")},
            "other_user_id": other_id,
        },
        "pet_ids": [p.get("id") for p in pets],
        "care_request_id": request_id,
        "matrix": matrix,
        "blockers": blockers,
        "steps": steps,
    }

    (OUT / "pass_fail_matrix.json").write_text(json.dumps(matrix, indent=2), encoding="utf-8")
    (OUT / "evidence.json").write_text(json.dumps(evidence, indent=2), encoding="utf-8")

    report = [
        f"# Medical Gap Closure — Beta UX ({run_id})",
        "",
        f"- Base: `{base}`",
        f"- Marker: `{marker}`",
        f"- User: `{email}` ({user_id})",
        f"- Vet: `{vet_user.get('email')}` ({vet_user.get('id')})",
        "",
        "## PASS / FAIL Matrix",
    ]
    report.extend([f"- [{'x' if row['result']=='PASS' else ' '}] {row['check']} — **{row['result']}**" for row in matrix])
    report += ["", "## Blockers", *( [f"- {b}" for b in blockers] if blockers else ["- None"] )]
    (OUT / "REPORT.md").write_text("\n".join(report) + "\n", encoding="utf-8")


if __name__ == "__main__":
    main()
