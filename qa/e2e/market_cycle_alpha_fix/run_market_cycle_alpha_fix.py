#!/usr/bin/env python3
import json
import time
from datetime import datetime, timezone
from pathlib import Path

import jwt
import requests

BASES = ["http://127.0.0.1:8010/api", "http://127.0.0.1:8001/api", "http://127.0.0.1:8000/api"]
JWT_SECRET = "petsy-secret-key-2026"
JWT_ALG = "HS256"
PASSWORD = "AlphaFix#2026!"

OUT = Path(__file__).resolve().parent
RAW = OUT / "raw"
OUT.mkdir(parents=True, exist_ok=True)
RAW.mkdir(parents=True, exist_ok=True)


def now_iso():
    return datetime.now(timezone.utc).isoformat()


def pick_base():
    for b in BASES:
        try:
            r = requests.get(b + "/health", timeout=3)
            if r.status_code == 200:
                return b
        except Exception:
            pass
    raise RuntimeError("No API reachable on 8001/8000")


def token_for(uid: str):
    return jwt.encode({"sub": uid}, JWT_SECRET, algorithm=JWT_ALG)


def req(method, base, path, *, token=None, json_body=None, params=None, label=None, steps=None):
    headers = {}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    r = requests.request(method, base + path, json=json_body, params=params, headers=headers, timeout=25)
    try:
        body = r.json()
    except Exception:
        body = r.text

    row = {
        "ts": now_iso(),
        "label": label,
        "method": method,
        "path": path,
        "status": r.status_code,
        "request": {"json": json_body, "params": params},
        "response": body,
    }
    if steps is not None:
        steps.append(row)
    if label:
        (RAW / f"{label}.json").write_text(json.dumps(row, indent=2), encoding="utf-8")
    return r.status_code, body


def main():
    base = pick_base()
    run_id = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    marker = f"alpha-fix-{run_id}"
    steps = []
    matrix = []

    nonce = int(time.time())
    buyer_email = f"alpha.fix.buyer.{nonce}@example.com"
    buyer2_email = f"alpha.fix.buyer2.{nonce}@example.com"

    st, seller_login = req("POST", base, "/auth/login", json_body={"email": "demo.market@petsy.com", "password": "demo123"}, label="01_login_seller", steps=steps)
    seller_token = seller_login.get("access_token") if isinstance(seller_login, dict) else None
    seller_id = (seller_login.get("user") or {}).get("id") if isinstance(seller_login, dict) else None
    matrix.append({"check": "Seller (market_owner) login", "result": "PASS" if st == 200 and seller_token and seller_id else "FAIL"})

    st, body = req("POST", base, "/auth/signup", json_body={"email": buyer_email, "name": "Alpha Fix Buyer", "password": PASSWORD}, label="02_signup_buyer", steps=steps)
    buyer_id = body.get("user_id") if isinstance(body, dict) else None
    buyer_token = token_for(buyer_id) if buyer_id else None

    st2, body2 = req("POST", base, "/auth/signup", json_body={"email": buyer2_email, "name": "Alpha Fix Buyer2", "password": PASSWORD}, label="03_signup_buyer2", steps=steps)
    buyer2_id = body2.get("user_id") if isinstance(body2, dict) else None
    buyer2_token = token_for(buyer2_id) if buyer2_id else None

    matrix.append({"check": "Buyer accounts provisioned", "result": "PASS" if buyer_id and buyer2_id else "FAIL"})

    listing_payload = {
        "title": f"Alpha Fix Listing {marker}",
        "description": "Seller transition fix listing",
        "category": "accessories",
        "price": 26.0,
        "location": "Amman",
        "condition": "new",
    }
    st, listing = req("POST", base, "/marketplace/listings", token=seller_token, json_body=listing_payload, label="04_create_listing", steps=steps)
    listing_id = listing.get("id") if isinstance(listing, dict) else None
    matrix.append({"check": "Seller listing creation", "result": "PASS" if st == 200 and listing_id else "FAIL"})

    st, order = req("POST", base, "/orders", token=buyer_token, json_body={
        "items": [{"product_id": listing_id, "name": listing_payload["title"], "price": listing_payload["price"], "quantity": 1}],
        "total": listing_payload["price"],
        "shipping_address": "QA Street 7",
        "shipping_city": "Amman",
        "shipping_phone": "+10000000055",
        "payment_method": "cash_on_delivery",
        "notes": marker,
    }, label="05_buyer_checkout", steps=steps)
    order_id = order.get("id") if isinstance(order, dict) else None

    st_admin, admin_login = req("POST", base, "/auth/login", json_body={"email": "admin@petsy.com", "password": "admin123"}, label="06_login_admin", steps=steps)
    admin_token = admin_login.get("access_token") if isinstance(admin_login, dict) else None
    st_confirm, _ = req("PUT", base, f"/admin/orders/{order_id}", token=admin_token, json_body={"status": "confirmed"}, label="07_seed_confirmed_status", steps=steps)

    st_sales, sales = req("GET", base, "/orders/sales", token=seller_token, label="07_seller_sales", steps=steps)
    sale_seen = isinstance(sales, list) and any((o or {}).get("id") == order_id for o in sales)
    matrix.append({"check": "Seller can see sold order in /orders/sales", "result": "PASS" if st_sales == 200 and sale_seen else "FAIL"})

    st_ship, ship = req("PUT", base, f"/orders/sales/{order_id}/status", token=seller_token, json_body={"to_status": "shipped", "reason": "handoff to courier"}, label="08_seller_transition_confirmed_to_shipped", steps=steps)
    shipped_ok = st_ship == 200 and isinstance(ship, dict) and ship.get("status") == "shipped"
    matrix.append({"check": "Seller scoped transition confirmed->shipped", "result": "PASS" if shipped_ok else "FAIL", "detail": f"status={st_ship}"})

    st_hist, hist = req("GET", base, "/orders", token=buyer_token, label="09_buyer_order_history_after_ship", steps=steps)
    buyer_hist_shipped = isinstance(hist, list) and any((o or {}).get("id") == order_id and (o or {}).get("status") == "shipped" for o in hist)

    st_detail, detail = req("GET", base, f"/orders/{order_id}", token=buyer_token, label="10_buyer_order_detail_after_ship", steps=steps)
    buyer_detail_shipped = st_detail == 200 and isinstance(detail, dict) and detail.get("status") == "shipped"
    matrix.append({"check": "Buyer sees updated status in history/detail", "result": "PASS" if st_hist == 200 and buyer_hist_shipped and buyer_detail_shipped else "FAIL"})

    st_notif, notif = req("GET", base, "/notifications", token=buyer_token, params={"notif_type": "order", "limit": 50}, label="11_buyer_notifications", steps=steps)
    notif_items = (notif or {}).get("items", []) if isinstance(notif, dict) else []
    notif_ok = any((n.get("data") or {}).get("order_id") == order_id and (n.get("data") or {}).get("status") == "shipped" for n in notif_items if isinstance(n, dict))
    matrix.append({"check": "Buyer receives order notification", "result": "PASS" if st_notif == 200 and notif_ok else "FAIL"})

    st_other_order, other_order = req("POST", base, "/orders", token=buyer2_token, json_body={
        "items": [{"product_id": listing_id, "name": listing_payload["title"], "price": listing_payload["price"], "quantity": 1}],
        "total": listing_payload["price"],
        "shipping_address": "QA Street 8",
        "shipping_city": "Amman",
        "shipping_phone": "+10000000056",
        "payment_method": "cash_on_delivery",
        "notes": marker + "-2",
    }, label="12_other_buyer_checkout", steps=steps)
    other_order_id = other_order.get("id") if isinstance(other_order, dict) else None

    st_other_transition, _ = req("PUT", base, f"/orders/sales/{other_order_id}/status", token=buyer_token, json_body={"to_status": "shipped"}, label="13_non_seller_attempt_transition", steps=steps)
    matrix.append({"check": "AuthZ: unrelated actor cannot transition seller order", "result": "PASS" if st_other_transition == 403 else "FAIL", "detail": f"status={st_other_transition}"})

    st_invalid, _ = req("PUT", base, f"/orders/sales/{order_id}/status", token=seller_token, json_body={"to_status": "confirmed"}, label="14_invalid_transition_shipped_to_confirmed", steps=steps)
    matrix.append({"check": "Guardrail: invalid transition rejected", "result": "PASS" if st_invalid == 400 else "FAIL", "detail": f"status={st_invalid}"})

    blockers = [m for m in matrix if m["result"] == "FAIL"]
    verdict = "GO" if not blockers else "NO-GO"

    evidence = {
        "run_id": run_id,
        "base": base,
        "marker": marker,
        "entities": {
            "seller_id": seller_id,
            "buyer_id": buyer_id,
            "buyer2_id": buyer2_id,
            "listing_id": listing_id,
            "order_id": order_id,
            "other_order_id": other_order_id,
        },
        "matrix": matrix,
        "blockers": blockers,
        "steps": steps,
        "verdict": verdict,
    }

    (OUT / "evidence.json").write_text(json.dumps(evidence, indent=2), encoding="utf-8")
    (OUT / "pass_fail_matrix.json").write_text(json.dumps(matrix, indent=2), encoding="utf-8")
    (OUT / "raw_snippets.md").write_text("\n".join([f"- {s['label']}: {s['status']} {s['method']} {s['path']}" for s in steps]) + "\n", encoding="utf-8")

    report = [
        f"# Market Cycle Alpha Fix Report ({run_id})",
        "",
        f"- Base API: `{base}`",
        f"- Marker: `{marker}`",
        f"- Verdict: **{verdict}**",
        "",
        "## PASS/FAIL Matrix",
    ]
    for row in matrix:
        report.append(f"- [{'x' if row['result']=='PASS' else ' '}] {row['check']} — **{row['result']}**" + (f" (`{row.get('detail')}`)" if row.get("detail") else ""))

    report += [
        "",
        "## Blockers",
    ]
    if blockers:
        for b in blockers:
            report.append(f"- {b['check']} ({b.get('detail', '')})")
    else:
        report.append("- None")

    report += [
        "",
        "## Artifacts",
        "- pass_fail_matrix.json",
        "- evidence.json",
        "- raw/*.json",
        "- raw_snippets.md",
    ]

    (OUT / "REPORT.md").write_text("\n".join(report) + "\n", encoding="utf-8")
    print(verdict)


if __name__ == "__main__":
    main()
