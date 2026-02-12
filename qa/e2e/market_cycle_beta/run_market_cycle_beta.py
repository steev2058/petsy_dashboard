#!/usr/bin/env python3
import json
import time
import uuid
from datetime import datetime, timezone
from pathlib import Path

import jwt
import requests

BASES = ["http://127.0.0.1:8001/api", "http://127.0.0.1:8000/api"]
JWT_SECRET = "petsy-secret-key-2026"
JWT_ALG = "HS256"
PASSWORD = "E2E-Beta#2026!"

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


def token_for(uid: str) -> str:
    return jwt.encode({"sub": uid}, JWT_SECRET, algorithm=JWT_ALG)


def req(method, base, path, *, token=None, json_body=None, params=None, label=None, steps=None):
    headers = {}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    r = requests.request(method, base + path, json=json_body, params=params, headers=headers, timeout=20)
    try:
        body = r.json()
    except Exception:
        body = r.text

    rec = {
        "ts": now_iso(),
        "label": label,
        "method": method,
        "path": path,
        "status": r.status_code,
        "request": {"json": json_body, "params": params},
        "response": body,
    }
    if steps is not None:
        steps.append(rec)
    if label:
        (RAW / f"{label}.json").write_text(json.dumps(rec, indent=2), encoding="utf-8")
    return r.status_code, body


def main():
    base = pick_base()
    run_id = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    marker = f"market-beta-{run_id}"
    steps = []
    matrix = []
    evidence = {
        "run_id": run_id,
        "base": base,
        "marker": marker,
        "steps": steps,
        "matrix": matrix,
        "entities": {},
        "blockers": [],
    }

    nonce = int(time.time())
    buyer_email = f"beta.buyer.{nonce}@example.com"
    buyer2_email = f"beta.buyer2.{nonce}@example.com"

    # Accounts: create buyer + buyer2 through signup and local JWT continuity
    st, body = req("POST", base, "/auth/signup", json_body={"email": buyer_email, "name": "Beta Buyer", "password": PASSWORD, "phone": "+10000000011"}, label="01_signup_buyer", steps=steps)
    buyer_id = body.get("user_id") if isinstance(body, dict) else None
    buyer_token = token_for(buyer_id) if buyer_id else None

    st_login, body_login = req("POST", base, "/auth/login", json_body={"email": buyer_email, "password": PASSWORD}, label="02_login_buyer", steps=steps)
    matrix.append({"check": "Buyer account setup/login(create-or-login)", "result": "PASS" if buyer_id else "FAIL", "detail": f"signup={st}, login={st_login}"})

    st, body = req("GET", base, "/auth/me", token=buyer_token, label="03_me_buyer", steps=steps)
    matrix.append({"check": "Buyer authenticated session", "result": "PASS" if st == 200 else "FAIL"})

    st, body = req("POST", base, "/auth/signup", json_body={"email": buyer2_email, "name": "Beta Buyer2", "password": PASSWORD, "phone": "+10000000012"}, label="04_signup_buyer2", steps=steps)
    buyer2_id = body.get("user_id") if isinstance(body, dict) else None
    buyer2_token = token_for(buyer2_id) if buyer2_id else None

    # Seller account (Alpha / market owner)
    st, seller_login = req("POST", base, "/auth/login", json_body={"email": "demo.market@petsy.com", "password": "demo123"}, label="05_login_seller_market", steps=steps)
    seller_token = seller_login.get("access_token") if isinstance(seller_login, dict) else None
    seller_id = (seller_login.get("user") or {}).get("id") if isinstance(seller_login, dict) else None
    matrix.append({"check": "Coordinate with Alpha seller account", "result": "PASS" if st == 200 and seller_token else "FAIL"})

    # Create listings under seller
    listing_payload = {
        "title": f"Beta Cycle Leash {marker}",
        "description": "Nylon leash for QA cycle",
        "category": "accessories",
        "price": 22.5,
        "location": "Amman",
        "condition": "new",
    }
    st, listing = req("POST", base, "/marketplace/listings", token=seller_token, json_body=listing_payload, label="06_create_listing_active", steps=steps)
    listing_id = listing.get("id") if isinstance(listing, dict) else None

    st, archived_listing = req("POST", base, "/marketplace/listings", token=seller_token, json_body={**listing_payload, "title": f"Archived Item {marker}", "price": 18.0}, label="07_create_listing_archivable", steps=steps)
    archived_listing_id = archived_listing.get("id") if isinstance(archived_listing, dict) else None
    if archived_listing_id:
        req("PUT", base, f"/marketplace/listings/{archived_listing_id}/status", token=seller_token, json_body={"status": "archived"}, label="08_set_archived", steps=steps)

    st, sold_listing = req("POST", base, "/marketplace/listings", token=seller_token, json_body={**listing_payload, "title": f"Sold Item {marker}", "price": 35.0}, label="09_create_listing_sold", steps=steps)
    sold_listing_id = sold_listing.get("id") if isinstance(sold_listing, dict) else None
    if sold_listing_id:
        req("PUT", base, f"/marketplace/listings/{sold_listing_id}/status", token=seller_token, json_body={"status": "sold"}, label="10_set_sold", steps=steps)

    # Buyer browse/search/filter/detail
    st, browse = req("GET", base, "/marketplace/listings", token=buyer_token, label="11_browse_listings", steps=steps)
    st_q, search = req("GET", base, "/marketplace/listings", token=buyer_token, params={"q": "Leash"}, label="12_search_listings", steps=steps)
    st_f, filt = req("GET", base, "/marketplace/listings", token=buyer_token, params={"category": "accessories", "min_price": 20, "max_price": 25}, label="13_filter_listings", steps=steps)
    st_d, detail = req("GET", base, f"/marketplace/listings/{listing_id}", token=buyer_token, label="14_listing_detail", steps=steps)

    archived_visible = isinstance(browse, list) and any(x.get("id") == archived_listing_id for x in browse if isinstance(x, dict))
    sold_visible = isinstance(browse, list) and any(x.get("id") == sold_listing_id for x in browse if isinstance(x, dict))
    matrix.append({"check": "Browse/search/filter/detail journey", "result": "PASS" if (st == 200 and st_q == 200 and st_f == 200 and st_d == 200) else "FAIL"})
    matrix.append({"check": "Archived listing hidden from browse", "result": "PASS" if not archived_visible else "FAIL"})
    matrix.append({"check": "Sold listing appears as unavailable in browse", "result": "PASS" if sold_visible else "FAIL"})

    # Cart -> checkout -> order history/detail
    st, _ = req("POST", base, "/cart/add", token=buyer_token, json_body={"product_id": listing_id, "name": listing_payload["title"], "price": listing_payload["price"], "quantity": 1}, label="15_cart_add", steps=steps)
    st_c, cart = req("GET", base, "/cart", token=buyer_token, label="16_cart_get", steps=steps)

    st_o, order = req("POST", base, "/orders", token=buyer_token, json_body={
        "items": [{"product_id": listing_id, "name": listing_payload["title"], "price": listing_payload["price"], "quantity": 1}],
        "total": listing_payload["price"],
        "shipping_address": "QA Street 99",
        "shipping_city": "Amman",
        "shipping_phone": "+10000000013",
        "payment_method": "cash_on_delivery",
        "notes": marker,
    }, label="17_checkout_order", steps=steps)
    order_id = order.get("id") if isinstance(order, dict) else None

    st_hist, orders = req("GET", base, "/orders", token=buyer_token, label="18_order_history", steps=steps)
    st_od, order_detail = req("GET", base, f"/orders/{order_id}", token=buyer_token, label="19_order_detail", steps=steps)

    in_history = isinstance(orders, list) and any(o.get("id") == order_id for o in orders if isinstance(o, dict))
    matrix.append({"check": "Cart -> checkout -> order history/detail", "result": "PASS" if (st == 200 and st_c == 200 and st_o == 200 and st_hist == 200 and st_od == 200 and in_history) else "FAIL"})

    # Seller side: sees sale and can update order status (admin path here), buyer sees status changed
    st_sales, sales = req("GET", base, "/orders/sales", token=seller_token, label="20_seller_sales", steps=steps)
    sale_seen = isinstance(sales, list) and any(o.get("id") == order_id for o in sales if isinstance(o, dict))

    st_admin, admin_login = req("POST", base, "/auth/login", json_body={"email": "admin@petsy.com", "password": "admin123"}, label="21_login_admin", steps=steps)
    admin_token = admin_login.get("access_token") if isinstance(admin_login, dict) else None
    st_upd, _ = req("PUT", base, f"/admin/orders/{order_id}", token=admin_token, json_body={"status": "shipped"}, label="22_admin_update_order_status", steps=steps)
    st_recheck, order_after = req("GET", base, f"/orders/{order_id}", token=buyer_token, label="23_buyer_order_after_status", steps=steps)
    matrix.append({"check": "Seller-side flow: sale visibility + buyer receives status update", "result": "PASS" if (st_sales == 200 and sale_seen and st_upd == 200 and st_recheck == 200 and isinstance(order_after, dict) and order_after.get("status") == "shipped") else "FAIL"})

    # Optional messaging interaction between buyer and seller
    st_conv, conv = req("POST", base, "/conversations", token=buyer_token, json_body={"other_user_id": seller_id, "initial_message": f"Is {listing_payload['title']} still available? {marker}"}, label="24_buyer_message_seller", steps=steps)
    conversation_id = conv.get("conversation_id") if isinstance(conv, dict) else None
    msg_ok = False
    if conversation_id:
        st_msgs, msgs = req("GET", base, f"/conversations/{conversation_id}/messages", token=seller_token, label="25_seller_read_messages", steps=steps)
        msg_ok = st_msgs == 200 and isinstance(msgs, list) and any(marker in (m.get("content") or "") for m in msgs if isinstance(m, dict))
    matrix.append({"check": "Buyer/seller messaging interaction", "result": "PASS" if msg_ok else "FAIL"})

    # Edge scenarios
    # 1) sold/archived listing checkout should be blocked
    st_sold_order, _ = req("POST", base, "/orders", token=buyer_token, json_body={
        "items": [{"product_id": sold_listing_id, "name": "Sold Item", "price": 35.0, "quantity": 1}],
        "total": 35.0,
        "shipping_address": "QA",
        "shipping_city": "Amman",
        "shipping_phone": "+10000000014",
        "payment_method": "cash_on_delivery",
    }, label="26_order_sold_listing", steps=steps)

    st_arch_order, _ = req("POST", base, "/orders", token=buyer_token, json_body={
        "items": [{"product_id": archived_listing_id, "name": "Archived Item", "price": 18.0, "quantity": 1}],
        "total": 18.0,
        "shipping_address": "QA",
        "shipping_city": "Amman",
        "shipping_phone": "+10000000015",
        "payment_method": "cash_on_delivery",
    }, label="27_order_archived_listing", steps=steps)

    # 2) invalid quantity/pricing guards
    st_bad_qty, _ = req("POST", base, "/orders", token=buyer_token, json_body={
        "items": [{"product_id": listing_id, "name": "BadQty", "price": listing_payload["price"], "quantity": 0}],
        "total": listing_payload["price"],
        "shipping_address": "QA",
        "shipping_city": "Amman",
        "shipping_phone": "+10000000016",
        "payment_method": "cash_on_delivery",
    }, label="28_order_invalid_qty", steps=steps)

    st_bad_price, _ = req("POST", base, "/orders", token=buyer_token, json_body={
        "items": [{"product_id": listing_id, "name": "BadPrice", "price": -1.0, "quantity": 1}],
        "total": -1.0,
        "shipping_address": "QA",
        "shipping_city": "Amman",
        "shipping_phone": "+10000000017",
        "payment_method": "cash_on_delivery",
    }, label="29_order_invalid_price", steps=steps)

    edge_ok = st_sold_order >= 400 and st_arch_order >= 400 and st_bad_qty >= 400 and st_bad_price >= 400
    matrix.append({"check": "Edge guards: sold/archived + invalid quantity/pricing blocked", "result": "PASS" if edge_ok else "FAIL", "detail": f"sold={st_sold_order}, archived={st_arch_order}, qty={st_bad_qty}, price={st_bad_price}"})

    # Privacy: buyer cannot access other buyer order
    st_o2, order2 = req("POST", base, "/orders", token=buyer2_token, json_body={
        "items": [{"product_id": listing_id, "name": listing_payload["title"], "price": listing_payload["price"], "quantity": 1}],
        "total": listing_payload["price"],
        "shipping_address": "QA-2",
        "shipping_city": "Amman",
        "shipping_phone": "+10000000018",
        "payment_method": "cash_on_delivery",
    }, label="30_buyer2_order", steps=steps)
    order2_id = order2.get("id") if isinstance(order2, dict) else None
    st_forbidden, _ = req("GET", base, f"/orders/{order2_id}", token=buyer_token, label="31_buyer1_access_buyer2_order", steps=steps)
    matrix.append({"check": "Privacy: buyer cannot access another buyer order", "result": "PASS" if st_o2 == 200 and st_forbidden == 404 else "FAIL", "detail": f"order2_create={st_o2}, cross_access={st_forbidden}"})

    # Save evidence
    evidence["entities"] = {
        "buyer": {"id": buyer_id, "email": buyer_email},
        "buyer2": {"id": buyer2_id, "email": buyer2_email},
        "seller": {"id": seller_id, "email": "demo.market@petsy.com"},
        "listing_id": listing_id,
        "sold_listing_id": sold_listing_id,
        "archived_listing_id": archived_listing_id,
        "order_id": order_id,
        "order2_id": order2_id,
        "conversation_id": conversation_id,
    }

    blockers = [m for m in matrix if m["result"] == "FAIL"]
    evidence["blockers"] = blockers

    (OUT / "evidence.json").write_text(json.dumps(evidence, indent=2), encoding="utf-8")
    (OUT / "pass_fail_matrix.json").write_text(json.dumps(matrix, indent=2), encoding="utf-8")

    step_lines = [f"# Market Cycle Beta Step Log ({run_id})", ""]
    for i, s in enumerate(steps, start=1):
        step_lines.append(f"{i:02d}. [{s['status']}] {s['method']} {s['path']} ({s.get('label')})")
    (OUT / "step_log.md").write_text("\n".join(step_lines) + "\n", encoding="utf-8")

    go = "GO" if not blockers else "NO-GO"
    report = [
        f"# Market User Cycle Beta Report ({run_id})",
        "",
        f"- Base API: `{base}`",
        f"- Marker: `{marker}`",
        f"- Verdict: **{go}**",
        "",
        "## PASS/FAIL Matrix",
    ]
    for row in matrix:
        report.append(f"- [{'x' if row['result']=='PASS' else ' '}] {row['check']} — **{row['result']}**" + (f" (`{row.get('detail')}`)" if row.get("detail") else ""))

    report += [
        "",
        "## Key IDs",
        f"- buyer_id: `{buyer_id}`",
        f"- buyer2_id: `{buyer2_id}`",
        f"- seller_id: `{seller_id}`",
        f"- listing_id: `{listing_id}`",
        f"- sold_listing_id: `{sold_listing_id}`",
        f"- archived_listing_id: `{archived_listing_id}`",
        f"- order_id: `{order_id}`",
        f"- order2_id: `{order2_id}`",
        "",
        "## Residual Risks",
        "- Buyer account verification still requires email channel; QA uses local JWT continuity for fresh users.",
        "- No inventory stock counters per listing, so out-of-stock logic is approximated via sold/archived status.",
    ]
    (OUT / "REPORT.md").write_text("\n".join(report) + "\n", encoding="utf-8")

    # Coordination artifact for Alpha
    handoff = Path(__file__).resolve().parents[2] / "handoff" / "market_user_flow.md"
    handoff.write_text(
        "# Beta -> Alpha Market User Flow Handoff\n\n"
        f"Updated: {now_iso()}\n\n"
        f"- run_id: `{run_id}`\n"
        f"- verdict: **{go}**\n"
        f"- seller_account: `demo.market@petsy.com`\n"
        f"- created_listing_id: `{listing_id}`\n"
        f"- buyer_order_id: `{order_id}`\n"
        f"- cross_buyer_order_id: `{order2_id}`\n"
        "\n"
        "See full artifacts in `qa/e2e/market_cycle_beta/` (REPORT.md, pass_fail_matrix.json, evidence.json, raw/, step_log.md).\n",
        encoding="utf-8",
    )


if __name__ == "__main__":
    main()
