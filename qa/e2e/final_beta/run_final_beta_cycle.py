#!/usr/bin/env python3
import json
from datetime import datetime, timezone
from pathlib import Path
import requests

BASE = "http://127.0.0.1:8001/api"
OUT = Path(__file__).resolve().parent
OUT.mkdir(parents=True, exist_ok=True)

ACCOUNTS = {
    "admin": ("admin@petsy.com", "admin123"),
    "vet": ("demo.vet@petsy.com", "demo123"),
    "clinic": ("demo.clinic@petsy.com", "demo123"),
    "market": ("demo.market@petsy.com", "demo123"),
}


def now():
    return datetime.now(timezone.utc).isoformat()


def log_step(steps, method, path, status, request=None, response=None):
    steps.append({
        "ts": now(),
        "method": method,
        "path": path,
        "status": status,
        "request": request,
        "response": response,
    })


def call(method, path, token=None, **kwargs):
    headers = kwargs.pop("headers", {})
    if token:
        headers["Authorization"] = f"Bearer {token}"
    r = requests.request(method, BASE + path, headers=headers, timeout=20, **kwargs)
    try:
        body = r.json()
    except Exception:
        body = r.text
    return r.status_code, body


def main():
    run_id = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    marker = f"beta-final-{run_id}"
    steps = []
    tokens, users = {}, {}

    # 1) Login with seeded accounts
    for role, (email, password) in ACCOUNTS.items():
        req = {"email": email, "password": "***"}
        st, body = call("POST", "/auth/login", json={"email": email, "password": password})
        log_step(steps, "POST", "/auth/login", st, req, body)
        if st == 200 and isinstance(body, dict):
            tokens[role] = body.get("access_token")
            users[role] = body.get("user", {})

    # IDs
    market_user_id = users.get("market", {}).get("id")
    vet_user_id = users.get("vet", {}).get("id")

    # 2) Reciprocal chat (clinic -> market, market responds)
    st, body = call("POST", "/friends/requests", token=tokens["clinic"], json={"target_user_id": market_user_id})
    log_step(steps, "POST", "/friends/requests", st, {"target_user_id": market_user_id}, body)

    st, body = call("GET", "/friends/requests", token=tokens["market"])
    log_step(steps, "GET", "/friends/requests", st, None, body)
    req_id = None
    if st == 200 and isinstance(body, dict):
        incoming = body.get("incoming") or []
        if incoming:
            req_id = incoming[0].get("id")

    if req_id:
        st, body = call("PUT", f"/friends/requests/{req_id}", token=tokens["market"], json={"action": "accept"})
        log_step(steps, "PUT", f"/friends/requests/{req_id}", st, {"action": "accept"}, body)

    st, body = call("POST", f"/conversations/direct/{market_user_id}", token=tokens["clinic"])
    log_step(steps, "POST", f"/conversations/direct/{market_user_id}", st, None, body)
    conversation_id = body.get("conversation_id") if isinstance(body, dict) else None

    clinic_msg = f"Clinic says hi ({marker})"
    market_msg = f"Market acknowledges ({marker})"
    if conversation_id:
        st, body = call("POST", f"/conversations/{conversation_id}/messages", token=tokens["clinic"], params={"content": clinic_msg})
        log_step(steps, "POST", f"/conversations/{conversation_id}/messages", st, {"content": clinic_msg}, body)

        st, body = call("GET", f"/conversations/{conversation_id}/messages", token=tokens["market"])
        log_step(steps, "GET", f"/conversations/{conversation_id}/messages", st, None, body)

        st, body = call("POST", f"/conversations/{conversation_id}/messages", token=tokens["market"], params={"content": market_msg})
        log_step(steps, "POST", f"/conversations/{conversation_id}/messages", st, {"content": market_msg}, body)

        st, body = call("GET", f"/conversations/{conversation_id}/messages", token=tokens["clinic"])
        log_step(steps, "GET", f"/conversations/{conversation_id}/messages", st, None, body)

    # 3) Seller perspective of purchase
    st, body = call("POST", "/marketplace/listings", token=tokens["market"], json={
        "title": f"Beta Reciprocal Item {marker}",
        "description": "Final beta reciprocal listing",
        "category": "accessories",
        "price": 33.75,
        "location": "Amman",
        "condition": "new",
    })
    log_step(steps, "POST", "/marketplace/listings", st, {"title": f"Beta Reciprocal Item {marker}"}, body)
    listing_id = body.get("id") if isinstance(body, dict) else None

    st, body = call("POST", "/orders", token=tokens["clinic"], json={
        "items": [{"product_id": listing_id, "name": f"Beta Reciprocal Item {marker}", "price": 33.75, "quantity": 1}],
        "total": 33.75,
        "shipping_address": "QA Street 42",
        "shipping_city": "Amman",
        "shipping_phone": "+962700000001",
        "payment_method": "cash_on_delivery",
        "notes": f"order-check-{marker}",
    })
    log_step(steps, "POST", "/orders", st, {"items": [{"product_id": listing_id, "quantity": 1}], "total": 33.75}, body)
    order_id = body.get("id") if isinstance(body, dict) else None

    st, body = call("GET", "/orders/sales", token=tokens["market"])
    log_step(steps, "GET", "/orders/sales", st, None, body)

    # 4) Sponsorship lifecycle observation
    st, body = call("POST", "/pets", token=tokens["market"], json={
        "name": f"MarketPet-{marker}",
        "species": "dog",
        "gender": "male",
        "status": "owned",
    })
    log_step(steps, "POST", "/pets", st, {"name": f"MarketPet-{marker}", "species": "dog", "gender": "male"}, body)
    pet_id = body.get("id") if isinstance(body, dict) else None

    st, body = call("POST", "/sponsorships", token=tokens["clinic"], json={
        "pet_id": pet_id,
        "amount": 12.0,
        "message": f"support-{marker}",
        "is_anonymous": False,
        "is_recurring": False,
    })
    log_step(steps, "POST", "/sponsorships", st, {"pet_id": pet_id, "amount": 12.0}, body)
    sponsorship_id = body.get("id") if isinstance(body, dict) else None

    st, body = call("GET", f"/sponsorships/pet/{pet_id}", token=tokens["market"])
    log_step(steps, "GET", f"/sponsorships/pet/{pet_id}", st, None, body)

    if sponsorship_id:
        st, body = call("PUT", f"/sponsorships/{sponsorship_id}/status", token=tokens["market"], json={"status": "completed"})
        log_step(steps, "PUT", f"/sponsorships/{sponsorship_id}/status", st, {"status": "completed"}, body)

    st, body = call("GET", f"/sponsorships/pet/{pet_id}", token=tokens["market"])
    log_step(steps, "GET", f"/sponsorships/pet/{pet_id}", st, None, body)

    # 5) Vet/provider perspective of appointment
    st, body = call("POST", "/appointments", token=tokens["clinic"], json={
        "vet_id": vet_user_id,
        "pet_id": pet_id,
        "date": "2026-02-22",
        "time": "09:30",
        "reason": f"reciprocal-appointment-{marker}",
    })
    log_step(steps, "POST", "/appointments", st, {"vet_id": vet_user_id, "pet_id": pet_id}, body)
    appointment_id = body.get("id") if isinstance(body, dict) else None

    st, body = call("GET", "/appointments", token=tokens["vet"])
    log_step(steps, "GET", "/appointments", st, None, body)

    # Assertions / matrix
    def has_msg(messages, text):
        return isinstance(messages, list) and any((m.get("content") == text) for m in messages if isinstance(m, dict))

    # pull last relevant message sets
    market_seen = [s for s in steps if s["method"] == "GET" and s["path"].endswith("/messages") and s["status"] == 200]
    chat_ok = False
    if len(market_seen) >= 2:
        chat_ok = has_msg(market_seen[0]["response"], clinic_msg) and has_msg(market_seen[-1]["response"], market_msg)

    sales_resp = next((s["response"] for s in steps if s["method"] == "GET" and s["path"] == "/orders/sales"), [])
    seller_order_ok = isinstance(sales_resp, list) and any((o.get("id") == order_id) for o in sales_resp if isinstance(o, dict))

    sp_lists = [s["response"] for s in steps if s["method"] == "GET" and s["path"] == f"/sponsorships/pet/{pet_id}"]
    sponsorship_visible_pending = isinstance(sp_lists[0], list) and any((x.get("id") == sponsorship_id and x.get("status") == "pending") for x in sp_lists[0] if isinstance(x, dict)) if sp_lists else False
    sponsorship_completed_visible = isinstance(sp_lists[-1], list) and any((x.get("id") == sponsorship_id and x.get("status") == "completed") for x in sp_lists[-1] if isinstance(x, dict)) if sp_lists else False

    vet_appts = next((s["response"] for s in steps if s["method"] == "GET" and s["path"] == "/appointments"), [])
    vet_view_ok = isinstance(vet_appts, list) and any((a.get("id") == appointment_id and a.get("vet_id") == vet_user_id) for a in vet_appts if isinstance(a, dict))

    matrix = [
        {"check": "Seeded role logins (admin/vet/clinic/market)", "result": "PASS" if len(tokens) == 4 else "FAIL"},
        {"check": "Reciprocal chat accept/respond (clinic <-> market)", "result": "PASS" if chat_ok else "FAIL"},
        {"check": "Seller perspective sees purchase via /orders/sales", "result": "PASS" if seller_order_ok else "FAIL"},
        {"check": "Sponsorship owner sees pending lifecycle state", "result": "PASS" if sponsorship_visible_pending else "FAIL"},
        {"check": "Sponsorship transitions to completed and remains visible", "result": "PASS" if sponsorship_completed_visible else "FAIL"},
        {"check": "Vet/provider sees counterpart appointment", "result": "PASS" if vet_view_ok else "FAIL"},
    ]

    payload = {
        "run_id": run_id,
        "base": BASE,
        "marker": marker,
        "users": {k: {"id": users[k].get("id"), "email": users[k].get("email"), "role": users[k].get("role")} for k in users},
        "entities": {
            "conversation_id": conversation_id,
            "listing_id": listing_id,
            "order_id": order_id,
            "pet_id": pet_id,
            "sponsorship_id": sponsorship_id,
            "appointment_id": appointment_id,
        },
        "steps": steps,
        "matrix": matrix,
    }

    (OUT / "evidence.json").write_text(json.dumps(payload, indent=2), encoding="utf-8")

    lines = [
        f"# Final Beta Reciprocal Full-Cycle Report ({run_id})",
        "",
        f"- Base: `{BASE}`",
        f"- Marker: `{marker}`",
        "",
        "## PASS/FAIL Matrix",
    ]
    for row in matrix:
        lines.append(f"- [{'x' if row['result']=='PASS' else ' '}] {row['check']} — **{row['result']}**")

    lines += [
        "",
        "## Key Entity IDs",
        f"- conversation_id: `{conversation_id}`",
        f"- listing_id: `{listing_id}`",
        f"- order_id: `{order_id}`",
        f"- pet_id: `{pet_id}`",
        f"- sponsorship_id: `{sponsorship_id}`",
        f"- appointment_id: `{appointment_id}`",
        "",
        "## Notes",
        "- This run uses seeded role accounts only.",
        "- Seller visibility validated via newly added `/orders/sales` endpoint.",
        "- Sponsorship lifecycle validated via owner visibility + status transition endpoint.",
        "- Vet perspective validated via broadened `/appointments` query (vet_id visibility).",
    ]
    (OUT / "REPORT.md").write_text("\n".join(lines) + "\n", encoding="utf-8")


if __name__ == "__main__":
    main()
