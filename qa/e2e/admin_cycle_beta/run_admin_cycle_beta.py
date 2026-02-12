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

ADMIN_EMAIL = "admin@petsy.com"
ADMIN_PASSWORD = "admin123"
DEFAULT_PASSWORD = "E2E-AdminBeta#2026!"

OUT = Path(__file__).resolve().parent
RAW = OUT / "raw"
OUT.mkdir(parents=True, exist_ok=True)
RAW.mkdir(parents=True, exist_ok=True)


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
    r = requests.request(method, f"{base}{path}", headers=headers, json=json_payload, params=params, timeout=30)
    return r.status_code, safe_json(r)


def sanitize_path(path):
    return path.strip('/').replace('/', '_').replace('{', '').replace('}', '').replace('?', '_')


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
    (RAW / f"{raw_idx:03d}_{method.lower()}_{sanitize_path(path)}.json").write_text(json.dumps(rec, indent=2), encoding="utf-8")


def local_token_for(user_id):
    return jwt.encode({"sub": user_id}, JWT_SECRET, algorithm=JWT_ALG)


def login(base, email, password, steps, raw_idx):
    st, body = request("POST", base, "/auth/login", json_payload={"email": email, "password": password})
    log_step(steps, raw_idx, "POST", "/auth/login", st, {"email": email, "password": "***"}, None, body)
    token = body.get("access_token") if st == 200 and isinstance(body, dict) else None
    user = body.get("user") if st == 200 and isinstance(body, dict) else None
    return token, user


def signup(base, email, name, phone, steps, raw_idx):
    payload = {"email": email, "name": name, "password": DEFAULT_PASSWORD, "phone": phone}
    st, body = request("POST", base, "/auth/signup", json_payload=payload)
    log_step(steps, raw_idx, "POST", "/auth/signup", st, {**payload, "password": "***"}, None, body)
    if st != 200 or not isinstance(body, dict) or not body.get("user_id"):
        raise RuntimeError(f"Signup failed for {email}: {st} {body}")
    return body["user_id"]


def main():
    base = pick_base()
    run_id = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    marker = f"beta-admin-cycle-{run_id}"

    steps = []
    raw_idx = 1
    blockers = []

    admin_token, admin_user = login(base, ADMIN_EMAIL, ADMIN_PASSWORD, steps, raw_idx)
    raw_idx += 1
    if not admin_token:
        raise RuntimeError("Admin login failed")

    nonce = int(time.time())
    beta_email = f"beta.user.{nonce}@example.com"
    vet_email = f"beta.vet.{nonce}@example.com"
    clinic_email = f"beta.clinic.{nonce}@example.com"
    market_email = f"beta.market.{nonce}@example.com"
    target_email = f"beta.target.{nonce}@example.com"

    beta_id = signup(base, beta_email, "Beta User", "+962700011111", steps, raw_idx); raw_idx += 1
    vet_id = signup(base, vet_email, "Beta Vet", "+962700011112", steps, raw_idx); raw_idx += 1
    clinic_id = signup(base, clinic_email, "Beta Clinic", "+962700011113", steps, raw_idx); raw_idx += 1
    market_id = signup(base, market_email, "Beta Market", "+962700011114", steps, raw_idx); raw_idx += 1
    target_id = signup(base, target_email, "Beta Target", "+962700011115", steps, raw_idx); raw_idx += 1

    beta_token = local_token_for(beta_id)
    vet_token = local_token_for(vet_id)
    clinic_token = local_token_for(clinic_id)
    market_token = local_token_for(market_id)
    target_token = local_token_for(target_id)

    actors = {
        "beta_user": beta_token,
        "vet_actor": vet_token,
        "clinic_actor": clinic_token,
        "market_actor": market_token,
    }

    for name, tok in actors.items():
        st, body = request("GET", base, "/auth/me", token=tok)
        log_step(steps, raw_idx, "GET", f"/auth/me#{name}", st, None, None, body)
        raw_idx += 1

    # 1) Non-admin denied on admin endpoints
    admin_endpoints = [
        ("GET", "/admin/stats", None),
        ("GET", "/admin/users", None),
        ("GET", "/admin/audit-logs", None),
        ("GET", "/admin/marketplace/reports", None),
        ("GET", "/admin/role-requests", None),
    ]
    denial_results = []
    for actor_name, tok in actors.items():
        for method, path, payload in admin_endpoints:
            st, body = request(method, base, path, token=tok, json_payload=payload)
            log_step(steps, raw_idx, method, f"{path}#{actor_name}", st, payload, None, body)
            raw_idx += 1
            denial_results.append({"actor": actor_name, "endpoint": path, "status": st, "denied": st in (401, 403)})

    # 2) Trigger moderation events for admin and verify effects to users
    # 2a) friend report moderation
    friend_report_payload = {"target_user_id": target_id, "reason": "abuse", "notes": marker}
    st, body = request("POST", base, "/friends/report", token=beta_token, json_payload=friend_report_payload)
    log_step(steps, raw_idx, "POST", "/friends/report", st, friend_report_payload, None, body)
    raw_idx += 1

    st, friend_reports = request("GET", base, f"/admin/friend-reports?target_user_id={target_id}&status=open", token=admin_token)
    log_step(steps, raw_idx, "GET", f"/admin/friend-reports?target_user_id={target_id}&status=open", st, None, None, friend_reports)
    raw_idx += 1
    report_id = None
    if st == 200 and isinstance(friend_reports, list):
        for r in friend_reports:
            if isinstance(r, dict) and (r.get("target_user") or {}).get("id") == target_id and (r.get("reported_by") or {}).get("id") == beta_id:
                report_id = r.get("id")
                break

    if report_id:
        st, body = request("PUT", base, f"/admin/friend-reports/{report_id}", token=admin_token, json_payload={"action": "block_target"})
        log_step(steps, raw_idx, "PUT", f"/admin/friend-reports/{report_id}", st, {"action": "block_target"}, None, body)
        raw_idx += 1

    st, body = request("POST", base, f"/conversations/direct/{target_id}", token=beta_token)
    log_step(steps, raw_idx, "POST", f"/conversations/direct/{target_id}", st, None, None, body)
    raw_idx += 1
    dm_blocked = st == 403

    # 2b) marketplace report + admin listing moderation
    listing_payload = {
        "title": f"Beta listing {marker}",
        "description": f"Listing to moderate {marker}",
        "price": 42,
        "category": "pets",
        "location": "Amman",
        "images": [],
        "contact_phone": "+962700099001",
    }
    st, listing = request("POST", base, "/marketplace/listings", token=market_token, json_payload=listing_payload)
    log_step(steps, raw_idx, "POST", "/marketplace/listings", st, listing_payload, None, listing)
    raw_idx += 1
    listing_id = listing.get("id") if st == 200 and isinstance(listing, dict) else None

    st, body = request("POST", base, f"/marketplace/listings/{listing_id}/report", token=beta_token, json_payload={"reason": "fraud", "notes": marker})
    log_step(steps, raw_idx, "POST", f"/marketplace/listings/{listing_id}/report", st, {"reason": "fraud", "notes": marker}, None, body)
    raw_idx += 1

    st, reports = request("GET", base, "/admin/marketplace/reports", token=admin_token)
    log_step(steps, raw_idx, "GET", "/admin/marketplace/reports", st, None, None, reports)
    raw_idx += 1

    st, body = request("PUT", base, f"/admin/marketplace/listings/{listing_id}/status", token=admin_token, json_payload={"status": "archived"})
    log_step(steps, raw_idx, "PUT", f"/admin/marketplace/listings/{listing_id}/status", st, {"status": "archived"}, None, body)
    raw_idx += 1

    st, public_listings = request("GET", base, "/marketplace/listings", token=beta_token)
    log_step(steps, raw_idx, "GET", "/marketplace/listings", st, None, None, public_listings)
    raw_idx += 1
    listing_hidden_public = st == 200 and isinstance(public_listings, list) and all((x or {}).get("id") != listing_id for x in public_listings)

    st, my_listings = request("GET", base, "/marketplace/listings/my", token=market_token)
    log_step(steps, raw_idx, "GET", "/marketplace/listings/my", st, None, None, my_listings)
    raw_idx += 1
    owner_sees_archived = False
    if st == 200 and isinstance(my_listings, list):
        owner_sees_archived = any((x or {}).get("id") == listing_id and (x or {}).get("status") == "archived" for x in my_listings)

    # 2c) role requests (vet/clinic/market) + admin approve/reject
    role_changes = []
    role_request_ids = {}
    for actor_name, uid, tok, target_role, action in [
        ("vet_actor", vet_id, vet_token, "vet", "approve"),
        ("clinic_actor", clinic_id, clinic_token, "care_clinic", "approve"),
        ("market_actor", market_id, market_token, "market_owner", "reject"),
    ]:
        payload = {"target_role": target_role, "reason": f"{marker}-{actor_name}"}
        st, body = request("POST", base, "/role-requests", token=tok, json_payload=payload)
        log_step(steps, raw_idx, "POST", "/role-requests", st, payload, None, body)
        raw_idx += 1
        rid = body.get("id") if isinstance(body, dict) else None
        role_request_ids[actor_name] = rid

        st, body = request("PUT", base, f"/admin/role-requests/{rid}", token=admin_token, json_payload={"action": action})
        log_step(steps, raw_idx, "PUT", f"/admin/role-requests/{rid}", st, {"action": action}, None, body)
        raw_idx += 1

        st, me = request("GET", base, "/auth/me", token=tok)
        log_step(steps, raw_idx, "GET", f"/auth/me#{actor_name}_post_role", st, None, None, me)
        raw_idx += 1

        st2, mine = request("GET", base, "/role-requests/my", token=tok)
        log_step(steps, raw_idx, "GET", f"/role-requests/my#{actor_name}", st2, None, None, mine)
        raw_idx += 1

        role_changes.append({
            "actor": actor_name,
            "target_role": target_role,
            "admin_action": action,
            "auth_me_role": me.get("role") if isinstance(me, dict) else None,
            "request_visible": st2 == 200 and isinstance(mine, list) and any((x or {}).get("id") == rid for x in mine),
            "request_status": next(((x or {}).get("status") for x in (mine if isinstance(mine, list) else []) if (x or {}).get("id") == rid), None),
        })

    # 3) Notification propagation checks
    st, admin_notifs = request("GET", base, "/notifications", token=admin_token)
    log_step(steps, raw_idx, "GET", "/notifications#admin", st, None, None, admin_notifs)
    raw_idx += 1

    st, beta_notifs = request("GET", base, "/notifications", token=beta_token)
    log_step(steps, raw_idx, "GET", "/notifications#beta", st, None, None, beta_notifs)
    raw_idx += 1

    st, market_notifs = request("GET", base, "/notifications", token=market_token)
    log_step(steps, raw_idx, "GET", "/notifications#market", st, None, None, market_notifs)
    raw_idx += 1

    st, vet_notifs = request("GET", base, "/notifications", token=vet_token)
    log_step(steps, raw_idx, "GET", "/notifications#vet", st, None, None, vet_notifs)
    raw_idx += 1

    st, clinic_notifs = request("GET", base, "/notifications", token=clinic_token)
    log_step(steps, raw_idx, "GET", "/notifications#clinic", st, None, None, clinic_notifs)
    raw_idx += 1

    admin_items = admin_notifs.get("items", []) if isinstance(admin_notifs, dict) else []
    market_items = market_notifs.get("items", []) if isinstance(market_notifs, dict) else []
    vet_items = vet_notifs.get("items", []) if isinstance(vet_notifs, dict) else []
    clinic_items = clinic_notifs.get("items", []) if isinstance(clinic_notifs, dict) else []

    admin_got_event_notifs = any(isinstance(n, dict) and n.get("type") in {"admin", "role_request"} for n in admin_items)
    market_got_listing_update = any(isinstance(n, dict) and n.get("type") == "marketplace" and (n.get("data") or {}).get("listing_id") == listing_id for n in market_items)
    vet_got_role_update = any(isinstance(n, dict) and n.get("type") == "role_request" for n in vet_items)
    clinic_got_role_update = any(isinstance(n, dict) and n.get("type") == "role_request" for n in clinic_items)

    # 4) auditability from non-admin perspective
    st, body = request("GET", base, "/admin/audit-logs", token=beta_token)
    log_step(steps, raw_idx, "GET", "/admin/audit-logs#beta", st, None, None, body)
    raw_idx += 1
    audit_logs_denied_non_admin = st in (401, 403)

    role_auditability = all(r["request_visible"] and r["request_status"] in {"approved", "rejected"} for r in role_changes)

    non_admin_denials_ok = all(x["denied"] for x in denial_results)
    role_effects_ok = (
        next((r for r in role_changes if r["actor"] == "vet_actor"), {}).get("auth_me_role") == "vet"
        and next((r for r in role_changes if r["actor"] == "clinic_actor"), {}).get("auth_me_role") == "care_clinic"
        and next((r for r in role_changes if r["actor"] == "market_actor"), {}).get("auth_me_role") != "market_owner"
    )

    matrix = [
        {"check": "Non-admin actors denied on admin endpoints", "result": "PASS" if non_admin_denials_ok else "FAIL"},
        {"check": "Friend report moderated: admin block_target prevents DM", "result": "PASS" if dm_blocked else "FAIL"},
        {"check": "Marketplace moderation reflected: archived hidden from public", "result": "PASS" if listing_hidden_public else "FAIL"},
        {"check": "Marketplace moderation reflected to owner listing state", "result": "PASS" if owner_sees_archived else "FAIL"},
        {"check": "Role-request admin actions reflected in user roles/status", "result": "PASS" if role_effects_ok and role_auditability else "FAIL"},
        {"check": "Notification propagation after admin actions", "result": "PASS" if admin_got_event_notifs and market_got_listing_update and vet_got_role_update and clinic_got_role_update else "FAIL"},
        {"check": "Non-admin cannot access admin audit logs", "result": "PASS" if audit_logs_denied_non_admin else "FAIL"},
    ]

    for row in matrix:
        if row["result"] == "FAIL":
            blockers.append(row["check"])

    evidence = {
        "run_id": run_id,
        "base": base,
        "marker": marker,
        "users": {
            "admin": {"id": admin_user.get("id"), "email": ADMIN_EMAIL, "role": "admin"},
            "beta_user": {"id": beta_id, "email": beta_email, "role": "user"},
            "vet_actor": {"id": vet_id, "email": vet_email},
            "clinic_actor": {"id": clinic_id, "email": clinic_email},
            "market_actor": {"id": market_id, "email": market_email},
            "target_user": {"id": target_id, "email": target_email},
        },
        "entities": {
            "friend_report_id": report_id,
            "market_listing_id": listing_id,
            "role_request_ids": role_request_ids,
        },
        "denial_results": denial_results,
        "role_changes": role_changes,
        "notifications": {
            "admin_got_event_notifs": admin_got_event_notifs,
            "market_got_listing_update": market_got_listing_update,
            "vet_got_role_update": vet_got_role_update,
            "clinic_got_role_update": clinic_got_role_update,
        },
        "checks": {
            "dm_blocked": dm_blocked,
            "listing_hidden_public": listing_hidden_public,
            "owner_sees_archived": owner_sees_archived,
            "audit_logs_denied_non_admin": audit_logs_denied_non_admin,
        },
        "matrix": matrix,
        "blockers": blockers,
        "step_count": len(steps),
    }

    (OUT / "evidence.json").write_text(json.dumps(evidence, indent=2), encoding="utf-8")
    (OUT / "pass_fail_matrix.json").write_text(json.dumps(matrix, indent=2), encoding="utf-8")

    report_lines = [
        f"# Admin Governance Beta Report ({run_id})",
        "",
        f"- Base: `{base}`",
        f"- Marker: `{marker}`",
        f"- Admin: `{ADMIN_EMAIL}` (`{admin_user.get('id')}`)",
        f"- Beta user: `{beta_email}` (`{beta_id}`)",
        f"- Vet actor: `{vet_email}` (`{vet_id}`)",
        f"- Clinic actor: `{clinic_email}` (`{clinic_id}`)",
        f"- Market actor: `{market_email}` (`{market_id}`)",
        f"- Target user: `{target_email}` (`{target_id}`)",
        "",
        "## PASS/FAIL Matrix",
    ]
    for row in matrix:
        report_lines.append(f"- [{'x' if row['result']=='PASS' else ' '}] {row['check']} — **{row['result']}**")

    report_lines += [
        "",
        "## Key IDs",
        f"- friend_report_id: `{report_id}`",
        f"- market_listing_id: `{listing_id}`",
        f"- role_request_ids: `{json.dumps(role_request_ids)}`",
        "",
        "## Blockers",
    ]
    if blockers:
        report_lines.extend([f"- {b}" for b in blockers])
    else:
        report_lines.append("- none")

    (OUT / "REPORT.md").write_text("\n".join(report_lines) + "\n", encoding="utf-8")

    step_log_lines = [f"# Step Log ({run_id})", "", f"Total steps: **{len(steps)}**", ""]
    for i, s in enumerate(steps, start=1):
        step_log_lines.append(f"{i}. `{s['method']} {s['path']}` -> **{s['status']}**")
    (OUT / "step_log.md").write_text("\n".join(step_log_lines) + "\n", encoding="utf-8")

    (OUT / "final_status.json").write_text(json.dumps({
        "status": "GO" if not blockers else "NO-GO",
        "run_id": run_id,
        "blockers": blockers,
        "matrix": matrix,
    }, indent=2), encoding="utf-8")


if __name__ == "__main__":
    main()
