#!/usr/bin/env python3
import json
import time
from datetime import datetime, timezone
from pathlib import Path

import jwt
import requests

BASES = ["http://127.0.0.1:8001/api", "http://127.0.0.1:8000/api"]
JWT_SECRET = "petsy-secret-key-2026"
JWT_ALG = "HS256"

OUT = Path(__file__).resolve().parent
RAW = OUT / "raw"
OUT.mkdir(parents=True, exist_ok=True)
RAW.mkdir(parents=True, exist_ok=True)

PROVIDER_EMAIL = "demo.vet@petsy.com"
PROVIDER_PASSWORD = "demo123"
BETA_PASSWORD = "E2E-BetaClinic#2026!"


def now_iso():
    return datetime.now(timezone.utc).isoformat()


def pick_base():
    for b in BASES:
        try:
            r = requests.get(f"{b}/health", timeout=4)
            if r.status_code == 200:
                return b
        except Exception:
            pass
    raise RuntimeError("No API reachable on 8001/8000")


def safe_json(resp):
    try:
        return resp.json()
    except Exception:
        return {"raw": resp.text}


def request(method, base, path, token=None, json_payload=None, params=None):
    headers = {}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    r = requests.request(method, f"{base}{path}", headers=headers, json=json_payload, params=params, timeout=25)
    return r.status_code, safe_json(r)


def log_step(steps, raw_idx, method, path, status, request_payload=None, params=None, response=None):
    rec = {
        "ts": now_iso(),
        "method": method,
        "path": path,
        "status": status,
        "request": request_payload,
        "params": params,
        "response": response,
    }
    steps.append(rec)
    (RAW / f"{raw_idx:03d}_{method.lower()}_{path.strip('/').replace('/', '_').replace('{', '').replace('}', '')}.json").write_text(
        json.dumps(rec, indent=2), encoding="utf-8"
    )


def auth_login(base, email, password, steps, raw_idx):
    st, body = request("POST", base, "/auth/login", json_payload={"email": email, "password": password})
    log_step(steps, raw_idx, "POST", "/auth/login", st, {"email": email, "password": "***"}, None, body)
    if st == 200 and isinstance(body, dict) and body.get("access_token"):
        return body["access_token"], body.get("user", {})
    return None, None


def signup_user(base, email, name, password, phone, steps, raw_idx):
    st, body = request("POST", base, "/auth/signup", json_payload={
        "email": email,
        "name": name,
        "password": password,
        "phone": phone,
    })
    log_step(steps, raw_idx, "POST", "/auth/signup", st, {"email": email, "password": "***", "name": name}, None, body)
    if st != 200 or not isinstance(body, dict) or not body.get("user_id"):
        raise RuntimeError(f"Signup failed for {email}: {st} {body}")
    return body["user_id"]


def local_token_for(user_id):
    return jwt.encode({"sub": user_id}, JWT_SECRET, algorithm=JWT_ALG)


def main():
    base = pick_base()
    run_id = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    marker = f"beta-clinic-cycle-{run_id}"

    steps = []
    raw_idx = 1
    blockers = []

    # Provider actor (Alpha-side simulation) for status transitions
    provider_token, provider_user = auth_login(base, PROVIDER_EMAIL, PROVIDER_PASSWORD, steps, raw_idx)
    raw_idx += 1
    if not provider_token:
        raise RuntimeError("Failed provider login")

    # Beta normal user + optional outsider user (privacy)
    nonce = int(time.time())
    beta_email = f"beta.clinic.{nonce}@example.com"
    outsider_email = f"outsider.clinic.{nonce}@example.com"

    beta_user_id = signup_user(base, beta_email, "Beta Clinic User", BETA_PASSWORD, "+962700002222", steps, raw_idx)
    raw_idx += 1
    outsider_user_id = signup_user(base, outsider_email, "Outsider User", BETA_PASSWORD, "+962700003333", steps, raw_idx)
    raw_idx += 1

    beta_token = local_token_for(beta_user_id)
    outsider_token = local_token_for(outsider_user_id)

    st, body = request("GET", base, "/auth/me", token=beta_token)
    log_step(steps, raw_idx, "GET", "/auth/me", st, None, None, body)
    raw_idx += 1
    if st != 200:
        raise RuntimeError("Beta local token invalid")

    st, body = request("GET", base, "/auth/me", token=outsider_token)
    log_step(steps, raw_idx, "GET", "/auth/me", st, None, None, body)
    raw_idx += 1
    if st != 200:
        raise RuntimeError("Outsider local token invalid")

    pets = []
    pet_specs = [
        ("Milo", "cat", "Vomiting + lethargy", "high"),
        ("Luna", "dog", "Mild cough", "normal"),
        ("Kiwi", "bird", "Reduced appetite", "urgent"),
    ]

    for i, (name, species, symptoms, priority) in enumerate(pet_specs, start=1):
        payload = {
            "name": f"{name}-{run_id[-6:]}",
            "species": species,
            "gender": "male" if i % 2 else "female",
            "status": "owned",
            "description": f"{marker}-pet-{i}",
            "location": "Amman",
        }
        st, body = request("POST", base, "/pets", token=beta_token, json_payload=payload)
        log_step(steps, raw_idx, "POST", "/pets", st, payload, None, body)
        raw_idx += 1
        if st == 200 and isinstance(body, dict) and body.get("id"):
            pets.append({
                "id": body["id"],
                "name": body.get("name"),
                "symptoms": symptoms,
                "priority": priority,
            })

    st, my_pets = request("GET", base, "/pets/my", token=beta_token)
    log_step(steps, raw_idx, "GET", "/pets/my", st, None, None, my_pets)
    raw_idx += 1

    care_requests = []
    for i, p in enumerate(pets, start=1):
        payload = {
            "pet_id": p["id"],
            "title": f"Clinic care #{i} {marker}",
            "description": f"Symptoms: {p['symptoms']} ({marker})",
            "location": "Amman",
            "priority": p["priority"],
        }
        st, body = request("POST", base, "/care-requests", token=beta_token, json_payload=payload)
        log_step(steps, raw_idx, "POST", "/care-requests", st, payload, None, body)
        raw_idx += 1
        if st == 200 and isinstance(body, dict) and body.get("id"):
            care_requests.append({"id": body["id"], "pet_id": p["id"], "priority": p["priority"]})

    # Clinic processes each request: accept -> start -> complete
    for i, cr in enumerate(care_requests, start=1):
        for action, extra in [
            ("accept", {}),
            ("start", {"vet_notes": f"Exam started ({marker})"}),
            ("complete", {
                "diagnosis": f"Dx-{i}-{marker}",
                "prescription": f"Rx-{i}-{marker}",
                "vet_notes": f"Follow-up in {i+1} days ({marker})",
            }),
        ]:
            payload = {"action": action, **extra}
            st, body = request("PUT", base, f"/vet/care-requests/{cr['id']}", token=provider_token, json_payload=payload)
            log_step(steps, raw_idx, "PUT", f"/vet/care-requests/{cr['id']}", st, payload, None, body)
            raw_idx += 1

    timeline_checks = []
    for cr in care_requests:
        st, body = request("GET", base, f"/care-requests/{cr['id']}/timeline", token=beta_token)
        log_step(steps, raw_idx, "GET", f"/care-requests/{cr['id']}/timeline", st, None, None, body)
        raw_idx += 1
        statuses = []
        if isinstance(body, list):
            statuses = [x.get("status") for x in body if isinstance(x, dict)]
        timeline_checks.append({
            "request_id": cr["id"],
            "status": st,
            "statuses": statuses,
            "ok": st == 200 and all(s in statuses for s in ["pending", "accepted", "in_progress", "completed"]),
        })

    # Notification visibility for user
    st, beta_notif = request("GET", base, "/notifications", token=beta_token)
    log_step(steps, raw_idx, "GET", "/notifications", st, None, None, beta_notif)
    raw_idx += 1

    # Chat / follow-up between user and clinic provider
    st, body = request("POST", base, "/friends/requests", token=beta_token, json_payload={"target_user_id": provider_user.get("id")})
    log_step(steps, raw_idx, "POST", "/friends/requests", st, {"target_user_id": provider_user.get("id")}, None, body)
    raw_idx += 1

    st, inbox = request("GET", base, "/friends/requests", token=provider_token)
    log_step(steps, raw_idx, "GET", "/friends/requests", st, None, None, inbox)
    raw_idx += 1

    fr_id = None
    incoming = inbox.get("incoming", []) if isinstance(inbox, dict) else []
    for fr in incoming:
        if isinstance(fr, dict) and (fr.get("from_user_id") == beta_user_id or ((fr.get("user") or {}).get("id") == beta_user_id)):
            fr_id = fr.get("id")
            break
    if fr_id:
        st, body = request("PUT", base, f"/friends/requests/{fr_id}", token=provider_token, json_payload={"action": "accept"})
        log_step(steps, raw_idx, "PUT", f"/friends/requests/{fr_id}", st, {"action": "accept"}, None, body)
        raw_idx += 1

    st, dconv = request("POST", base, f"/conversations/direct/{provider_user.get('id')}", token=beta_token)
    log_step(steps, raw_idx, "POST", f"/conversations/direct/{provider_user.get('id')}", st, None, None, dconv)
    raw_idx += 1

    conv_id = dconv.get("conversation_id") if isinstance(dconv, dict) else None
    beta_msg = f"Beta follow-up question ({marker})"
    clinic_msg = f"Provider response with care advice ({marker})"
    if conv_id:
        st, body = request("POST", base, f"/conversations/{conv_id}/messages", token=beta_token, params={"content": beta_msg})
        log_step(steps, raw_idx, "POST", f"/conversations/{conv_id}/messages", st, None, {"content": beta_msg}, body)
        raw_idx += 1

        st, body = request("POST", base, f"/conversations/{conv_id}/messages", token=provider_token, params={"content": clinic_msg})
        log_step(steps, raw_idx, "POST", f"/conversations/{conv_id}/messages", st, None, {"content": clinic_msg}, body)
        raw_idx += 1

        st, chat_rows = request("GET", base, f"/conversations/{conv_id}/messages", token=beta_token)
        log_step(steps, raw_idx, "GET", f"/conversations/{conv_id}/messages", st, None, None, chat_rows)
        raw_idx += 1
    else:
        chat_rows = []

    # Privacy guards
    privacy = {}
    # outsider cannot read beta timeline
    if care_requests:
        target_cr = care_requests[0]["id"]
        st, body = request("GET", base, f"/care-requests/{target_cr}/timeline", token=outsider_token)
        log_step(steps, raw_idx, "GET", f"/care-requests/{target_cr}/timeline", st, None, None, body)
        raw_idx += 1
        privacy["outsider_cannot_read_beta_timeline"] = st in (401, 403, 404)

        # outsider cannot mutate beta request
        st, body = request("PUT", base, f"/vet/care-requests/{target_cr}", token=outsider_token, json_payload={"action": "accept"})
        log_step(steps, raw_idx, "PUT", f"/vet/care-requests/{target_cr}", st, {"action": "accept"}, None, body)
        raw_idx += 1
        privacy["outsider_cannot_mutate_beta_request"] = st in (401, 403, 404)

    st, body = request("GET", base, "/vet/care-requests", token=beta_token)
    log_step(steps, raw_idx, "GET", "/vet/care-requests", st, None, None, body)
    raw_idx += 1
    privacy["normal_user_cannot_list_vet_queue"] = st in (401, 403)

    # Health records visible for own pets after completion
    health_ok = True
    for p in pets:
        st, body = request("GET", base, f"/health-records/{p['id']}", token=beta_token)
        log_step(steps, raw_idx, "GET", f"/health-records/{p['id']}", st, None, None, body)
        raw_idx += 1
        has_visit = st == 200 and isinstance(body, list) and any(
            isinstance(r, dict) and r.get("record_type") == "vet_visit" for r in body
        )
        health_ok = health_ok and has_visit

    # Evaluation
    exact_three_pets = st == 200 and isinstance(my_pets, list) and len(my_pets) == 3
    care_created_three = len(care_requests) == 3
    timeline_ok = all(x["ok"] for x in timeline_checks) if timeline_checks else False

    notif_items = beta_notif.get("items", []) if isinstance(beta_notif, dict) else []
    notif_ok = isinstance(notif_items, list) and any(
        isinstance(n, dict) and n.get("type") == "care_request" for n in notif_items
    )

    two_way_chat_ok = isinstance(chat_rows, list) and any(isinstance(m, dict) and m.get("content") == beta_msg for m in chat_rows) and any(
        isinstance(m, dict) and m.get("content") == clinic_msg for m in chat_rows
    )

    matrix = [
        {"check": "Beta user established", "result": "PASS"},
        {"check": "Exactly 3 pets created", "result": "PASS" if exact_three_pets else "FAIL"},
        {"check": "3 care requests submitted with varied priority/symptoms", "result": "PASS" if care_created_three else "FAIL"},
        {"check": "Timeline shows pending->accepted->in_progress->completed", "result": "PASS" if timeline_ok else "FAIL"},
        {"check": "Notifications include care_request updates", "result": "PASS" if notif_ok else "FAIL"},
        {"check": "Two-way chat/follow-up user<->provider", "result": "PASS" if two_way_chat_ok else "FAIL"},
        {"check": "Health records reflect completed care", "result": "PASS" if health_ok else "FAIL"},
        {"check": "Privacy: outsider cannot read user clinic timeline", "result": "PASS" if privacy.get("outsider_cannot_read_beta_timeline") else "FAIL"},
        {"check": "Privacy: outsider cannot mutate user care request", "result": "PASS" if privacy.get("outsider_cannot_mutate_beta_request") else "FAIL"},
        {"check": "Privacy: normal user cannot access vet queue", "result": "PASS" if privacy.get("normal_user_cannot_list_vet_queue") else "FAIL"},
    ]

    for row in matrix:
        if row["result"] == "FAIL":
            blockers.append(row["check"])

    evidence = {
        "run_id": run_id,
        "base": base,
        "marker": marker,
        "users": {
            "beta": {"id": beta_user_id, "email": beta_email, "role": "user"},
            "outsider": {"id": outsider_user_id, "email": outsider_email, "role": "user"},
            "provider": {"id": provider_user.get("id"), "email": provider_user.get("email"), "role": provider_user.get("role")},
        },
        "entities": {
            "pets": pets,
            "care_requests": care_requests,
            "conversation_id": conv_id,
        },
        "timeline_checks": timeline_checks,
        "privacy": privacy,
        "matrix": matrix,
        "blockers": blockers,
        "step_count": len(steps),
    }

    (OUT / "evidence.json").write_text(json.dumps(evidence, indent=2), encoding="utf-8")
    (OUT / "pass_fail_matrix.json").write_text(json.dumps(matrix, indent=2), encoding="utf-8")

    report_lines = [
        f"# Clinic Cycle Beta Report ({run_id})",
        "",
        f"- Base: `{base}`",
        f"- Marker: `{marker}`",
        f"- Beta user: `{beta_email}` (`{beta_user_id}`)",
        f"- Outsider user: `{outsider_email}` (`{outsider_user_id}`)",
        f"- Provider actor: `{provider_user.get('email')}` (`{provider_user.get('id')}`)",
        "",
        "## PASS/FAIL Matrix",
    ]
    for row in matrix:
        report_lines.append(f"- [{'x' if row['result']=='PASS' else ' '}] {row['check']} — **{row['result']}**")

    report_lines += ["", "## Key IDs", f"- conversation_id: `{conv_id}`", f"- care_requests: `{', '.join([x['id'] for x in care_requests])}`", "", "## Blockers"]
    if blockers:
        report_lines.extend([f"- {b}" for b in blockers])
    else:
        report_lines.append("- none")

    (OUT / "REPORT.md").write_text("\n".join(report_lines) + "\n", encoding="utf-8")

    step_log_lines = [
        f"# Step Log ({run_id})",
        "",
        f"Total steps: **{len(steps)}**",
        "",
    ]
    for i, s in enumerate(steps, start=1):
        step_log_lines.append(f"{i}. `{s['method']} {s['path']}` -> **{s['status']}**")
    (OUT / "step_log.md").write_text("\n".join(step_log_lines) + "\n", encoding="utf-8")

    (OUT / "final_status.json").write_text(json.dumps({
        "status": "GO" if len(blockers) == 0 else "NO-GO",
        "run_id": run_id,
        "blockers": blockers,
        "matrix": matrix,
    }, indent=2), encoding="utf-8")


if __name__ == "__main__":
    main()
