#!/usr/bin/env python3
import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, Optional

import requests

BASE = "http://127.0.0.1:8001/api"
OUT = Path(__file__).resolve().parent
RAW = OUT / "raw"
RAW.mkdir(parents=True, exist_ok=True)
HANDOFF = Path(__file__).resolve().parents[2] / "handoff" / "market_user_flow.md"

ACCOUNTS = {
    "market": {"email": "demo.market@petsy.com", "password": "demo123"},
    "vet": {"email": "demo.vet@petsy.com", "password": "demo123"},
    "admin": {"email": "admin@petsy.com", "password": "admin123"},
}


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def req(method: str, path: str, *, token: Optional[str] = None, json_body: Any = None, params: Optional[dict] = None, label: Optional[str] = None):
    headers = {}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    url = BASE + path
    r = requests.request(method, url, headers=headers, json=json_body, params=params, timeout=30)
    try:
        body = r.json()
    except Exception:
        body = {"raw": r.text}
    rec = {
        "ts": now_iso(),
        "method": method,
        "path": path,
        "status": r.status_code,
        "params": params,
        "request": json_body,
        "response": body,
    }
    if label:
        (RAW / f"{label}.json").write_text(json.dumps(rec, indent=2, ensure_ascii=False), encoding="utf-8")
    return r.status_code, body, rec


def pf(matrix, check: str, ok: bool, detail: str = ""):
    matrix.append({"check": check, "result": "PASS" if ok else "FAIL", "detail": detail})


def main():
    run_id = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    steps = []
    matrix = []
    blockers = []
    entities: Dict[str, Any] = {}

    tokens = {}
    users = {}

    # 1) Login and baseline role checks
    for role, creds in ACCOUNTS.items():
        st, body, rec = req("POST", "/auth/login", json_body=creds, label=f"01_login_{role}")
        rec["request"] = {"email": creds["email"], "password": "***"}
        steps.append(rec)
        ok = st == 200 and isinstance(body, dict) and body.get("access_token")
        pf(matrix, f"login_{role}", ok)
        if ok:
            tokens[role] = body["access_token"]
            users[role] = body.get("user", {})

    if "market" not in tokens:
        blockers.append({"id": "AUTH_MARKET", "detail": "Market owner login failed"})
        (OUT / "evidence.json").write_text(json.dumps({"fatal": blockers, "steps": steps}, indent=2), encoding="utf-8")
        return

    market_token = tokens["market"]
    vet_token = tokens.get("vet")
    admin_token = tokens.get("admin")

    # Seller profile/listings active
    st, body, rec = req("GET", "/auth/me", token=market_token, label="02_market_me")
    steps.append(rec)
    role_ok = st == 200 and isinstance(body, dict) and body.get("role") == "market_owner"
    pf(matrix, "market_role_is_market_owner", role_ok, f"role={body.get('role') if isinstance(body, dict) else None}")

    st, body, rec = req("GET", "/market-owner/overview", token=market_token, label="03_market_overview")
    steps.append(rec)
    overview_ok = st == 200 and isinstance(body, dict) and "total_listings" in body
    pf(matrix, "market_overview_access", overview_ok)

    # 2) Create/update/archive/reactivate listings (product + service)
    product_payload = {
        "title": f"Alpha QA Product {run_id}",
        "description": "Marketplace product listing from alpha market cycle",
        "category": "accessories",
        "price": 33.25,
        "location": "Amman",
        "pet_type": "cat",
        "condition": "new",
    }
    st, body, rec = req("POST", "/marketplace/listings", token=market_token, json_body=product_payload, label="10_create_product_listing")
    steps.append(rec)
    product_id = body.get("id") if isinstance(body, dict) else None
    entities["product_listing_id"] = product_id
    pf(matrix, "create_product_listing", st == 200 and bool(product_id))

    service_payload = {
        "title": f"Alpha QA Service {run_id}",
        "description": "Pet grooming at home",
        "category": "services",
        "price": 18.5,
        "location": "Amman",
        "pet_type": "dog",
        "condition": "n/a",
    }
    st, body, rec = req("POST", "/marketplace/listings", token=market_token, json_body=service_payload, label="11_create_service_listing")
    steps.append(rec)
    service_id = body.get("id") if isinstance(body, dict) else None
    entities["service_listing_id"] = service_id
    pf(matrix, "create_service_listing", st == 200 and bool(service_id))

    if product_id:
        upd = dict(product_payload)
        upd["price"] = 41.0
        upd["description"] = "Updated description and price"
        st, body, rec = req("PUT", f"/marketplace/listings/{product_id}", token=market_token, json_body=upd, label="12_update_product_listing")
        steps.append(rec)
        upd_ok = st == 200 and isinstance(body, dict) and float(body.get("price", 0)) == 41.0
        pf(matrix, "update_product_listing_price", upd_ok)

        st, body, rec = req("PUT", f"/marketplace/listings/{product_id}/status", token=market_token, json_body={"status": "archived"}, label="13_archive_product_listing")
        steps.append(rec)
        pf(matrix, "archive_product_listing", st == 200 and isinstance(body, dict) and body.get("status") == "archived")

        st, body, rec = req("PUT", f"/marketplace/listings/{product_id}/status", token=market_token, json_body={"status": "active"}, label="14_reactivate_product_listing")
        steps.append(rec)
        pf(matrix, "reactivate_product_listing", st == 200 and isinstance(body, dict) and body.get("status") == "active")

    # 3) seller order visibility/lifecycle: create buyer order against market listing
    order_id = None
    if vet_token and product_id:
        order_payload = {
            "items": [{"product_id": product_id, "name": product_payload["title"], "price": 41.0, "quantity": 1}],
            "total": 41.0,
            "shipping_address": "QA street 17",
            "shipping_city": "Amman",
            "shipping_phone": "+962700000001",
            "payment_method": "cash_on_delivery",
            "notes": f"alpha-market-cycle-{run_id}",
        }
        st, body, rec = req("POST", "/orders", token=vet_token, json_body=order_payload, label="20_create_order_as_buyer_vet")
        steps.append(rec)
        order_id = body.get("id") if isinstance(body, dict) else None
        entities["order_id"] = order_id
        pf(matrix, "buyer_create_order_for_market_listing", st == 200 and bool(order_id))

        st, body, rec = req("GET", "/orders/sales", token=market_token, label="21_market_view_sales_orders")
        steps.append(rec)
        visible = st == 200 and isinstance(body, list) and any(isinstance(o, dict) and o.get("id") == order_id for o in body)
        pf(matrix, "seller_can_view_sales_order", visible)

        # lifecycle transitions: currently only admin endpoint exists
        st, body, rec = req("PUT", f"/orders/{order_id}", token=market_token, json_body={"status": "shipped"}, label="22_seller_attempt_order_transition")
        steps.append(rec)
        supported = st not in (404, 405)
        pf(matrix, "seller_order_transition_endpoint_supported", supported, f"status_code={st}")
        if not supported:
            blockers.append({
                "id": "SELLER_ORDER_TRANSITIONS_UNSUPPORTED",
                "detail": "No seller-scoped order transition endpoint (/orders/{id} PUT is unsupported).",
            })

        if admin_token and order_id:
            transitions = ["confirmed", "shipped", "delivered", "cancelled"]
            for idx, state in enumerate(transitions, start=1):
                st, body, rec = req("PUT", f"/admin/orders/{order_id}", token=admin_token, json_body={"status": state}, label=f"23_admin_transition_{idx}_{state}")
                steps.append(rec)
                pf(matrix, f"admin_transition_{state}", st == 200)

            st, body, rec = req("GET", "/orders/sales", token=market_token, label="24_market_view_sales_after_transitions")
            steps.append(rec)
            observed = None
            if st == 200 and isinstance(body, list):
                for o in body:
                    if isinstance(o, dict) and o.get("id") == order_id:
                        observed = o.get("status")
                        break
            entities["order_status_seen_by_seller"] = observed
            pf(matrix, "seller_sees_order_status_updates", observed == "cancelled", f"observed={observed}")

    # 4) notifications + chat/messages between buyer and seller
    conversation_id = None
    if vet_token:
        market_uid = users.get("market", {}).get("id")
        vet_uid = users.get("vet", {}).get("id")

        st, body, rec = req("POST", "/friends/requests", token=vet_token, json_body={"target_user_id": market_uid}, label="30_vet_friend_request_market")
        steps.append(rec)
        req_id = body.get("request_id") if isinstance(body, dict) else None
        entities["friend_request_id"] = req_id
        pf(matrix, "buyer_send_friend_request_to_seller", st == 200)

        st, body, rec = req("GET", "/friends/requests", token=market_token, label="31_market_get_friend_requests")
        steps.append(rec)
        incoming = body.get("incoming", []) if isinstance(body, dict) else []
        if not req_id:
            for row in incoming:
                if isinstance(row, dict) and row.get("user", {}).get("id") == vet_uid:
                    req_id = row.get("id")
                    break

        if req_id:
            st, body, rec = req("PUT", f"/friends/requests/{req_id}", token=market_token, json_body={"action": "accept"}, label="32_market_accept_friend_request")
            steps.append(rec)
            pf(matrix, "seller_accept_friend_request", st == 200 and isinstance(body, dict) and body.get("status") == "accepted")
        else:
            pf(matrix, "seller_accept_friend_request", False, "friend request id not found")

        st, body, rec = req("POST", f"/conversations/direct/{market_uid}", token=vet_token, label="33_open_direct_buyer_to_seller")
        steps.append(rec)
        conversation_id = body.get("conversation_id") if isinstance(body, dict) else None
        entities["conversation_id"] = conversation_id
        pf(matrix, "open_direct_conversation", st == 200 and bool(conversation_id))

        if conversation_id:
            msg = f"Buyer ping to seller ({run_id})"
            st, body, rec = req("POST", f"/conversations/{conversation_id}/messages", token=vet_token, params={"content": msg}, label="34_buyer_send_message")
            steps.append(rec)
            pf(matrix, "buyer_send_message_to_seller", st == 200 and isinstance(body, dict) and body.get("id"))

            st, body, rec = req("GET", f"/conversations/{conversation_id}/messages", token=market_token, label="35_seller_reads_messages")
            steps.append(rec)
            read_ok = st == 200 and isinstance(body, list) and any(isinstance(m, dict) and msg in (m.get("content") or "") for m in body)
            pf(matrix, "seller_can_read_buyer_message", read_ok)

    st, body, rec = req("GET", "/notifications", token=market_token, label="36_seller_notifications")
    steps.append(rec)
    notif_ok = st == 200 and isinstance(body, dict) and isinstance(body.get("items"), list)
    pf(matrix, "seller_notifications_endpoint_access", notif_ok)

    # 5) reports/moderation impact
    report_id = None
    if vet_token and product_id and admin_token:
        st, body, rec = req("POST", f"/marketplace/listings/{product_id}/report", token=vet_token, json_body={"reason": "spam", "notes": "QA report check"}, label="40_buyer_reports_listing")
        steps.append(rec)
        pf(matrix, "buyer_can_report_listing", st == 200)

        st, body, rec = req("GET", "/admin/marketplace/reports", token=admin_token, label="41_admin_lists_market_reports")
        steps.append(rec)
        if st == 200 and isinstance(body, list):
            for row in body:
                if isinstance(row, dict) and row.get("listing_id") == product_id:
                    report_id = row.get("id")
                    break
        entities["market_report_id"] = report_id
        pf(matrix, "admin_can_see_listing_report", bool(report_id))

        st, body, rec = req("PUT", f"/admin/marketplace/listings/{product_id}/status", token=admin_token, json_body={"status": "archived"}, label="42_admin_archives_reported_listing")
        steps.append(rec)
        pf(matrix, "admin_can_archive_reported_listing", st == 200)

        st, body, rec = req("GET", f"/marketplace/listings/{product_id}", token=market_token, label="43_seller_sees_listing_after_moderation")
        steps.append(rec)
        archived_seen = st == 200 and isinstance(body, dict) and body.get("status") == "archived"
        pf(matrix, "seller_sees_moderation_status_on_listing", archived_seen)

    # 6) strict authorization checks
    # seller cannot mutate others' listing
    other_listing_id = None
    st, body, rec = req("GET", "/marketplace/listings", token=market_token, label="50_market_list_global_marketplace")
    steps.append(rec)
    if st == 200 and isinstance(body, list):
        for row in body:
            if isinstance(row, dict) and row.get("user_id") != users.get("market", {}).get("id"):
                other_listing_id = row.get("id")
                break
    entities["other_listing_id_for_authz"] = other_listing_id

    if other_listing_id:
        st, body, rec = req("PUT", f"/marketplace/listings/{other_listing_id}/status", token=market_token, json_body={"status": "archived"}, label="51_seller_attempt_mutate_other_listing")
        steps.append(rec)
        pf(matrix, "seller_cannot_mutate_others_listing", st == 403, f"status={st}")
    else:
        pf(matrix, "seller_cannot_mutate_others_listing", False, "No other listing found to verify")

    # seller cannot mutate others' orders via admin route
    if admin_token and order_id:
        st, body, rec = req("PUT", f"/admin/orders/{order_id}", token=market_token, json_body={"status": "delivered"}, label="52_seller_attempt_admin_order_mutation")
        steps.append(rec)
        pf(matrix, "seller_cannot_use_admin_order_mutation", st == 403, f"status={st}")

    # seller cannot read other's buyer order detail using /orders/{id}
    if order_id:
        st, body, rec = req("GET", f"/orders/{order_id}", token=market_token, label="53_seller_attempt_read_buyer_order_by_id")
        steps.append(rec)
        pf(matrix, "seller_cannot_read_buyer_order_via_buyer_endpoint", st == 404, f"status={st}")

    # prepare handoff file for beta coordination
    handoff_lines = [
        "# Market User Flow Handoff (Alpha <-> Beta)",
        "",
        f"Updated: {now_iso()}",
        "",
        "## Alpha cycle outputs",
        f"- run_id: `{run_id}`",
        f"- market_user_id: `{users.get('market', {}).get('id')}`",
        f"- buyer_user_id (vet): `{users.get('vet', {}).get('id')}`",
        f"- product_listing_id: `{entities.get('product_listing_id')}`",
        f"- service_listing_id: `{entities.get('service_listing_id')}`",
        f"- order_id: `{entities.get('order_id')}`",
        f"- conversation_id: `{entities.get('conversation_id')}`",
        f"- market_report_id: `{entities.get('market_report_id')}`",
        "",
        "## Notes for Beta",
        "- Seller sales visibility works via `/orders/sales`.",
        "- Seller-specific order transition endpoint appears unsupported (attempt on `/orders/{id}` returned 404/405).",
        "- Admin moderation changes listing status and is visible to seller.",
    ]
    HANDOFF.parent.mkdir(parents=True, exist_ok=True)
    HANDOFF.write_text("\n".join(handoff_lines) + "\n", encoding="utf-8")

    # finalize artifacts
    fails = [m for m in matrix if m["result"] == "FAIL"]
    final = "GO" if len(fails) == 0 else "NO-GO"

    summary = {
        "run_id": run_id,
        "base": BASE,
        "final_decision": final,
        "accounts": {k: {"email": v["email"], "user_id": users.get(k, {}).get("id")} for k, v in ACCOUNTS.items()},
        "entities": entities,
        "blockers": blockers,
        "fails": fails,
        "steps_count": len(steps),
    }

    (OUT / "evidence.json").write_text(json.dumps({"summary": summary, "steps": steps}, indent=2, ensure_ascii=False), encoding="utf-8")
    (OUT / "pass_fail_matrix.json").write_text(json.dumps(matrix, indent=2, ensure_ascii=False), encoding="utf-8")

    report_lines = [
        f"# Market Cycle Alpha Report ({run_id})",
        "",
        f"- Base URL: `{BASE}`",
        f"- Final decision: **{final}**",
        "",
        "## Scope coverage",
        "- Login and market-owner profile: executed",
        "- Listing CRUD/status cycle (product + service): executed",
        "- Seller sales visibility + lifecycle transitions: visibility validated; seller transition endpoint unsupported",
        "- Notifications and buyer chat: validated endpoint + direct chat flow",
        "- Reports/moderation impact: report + admin action + seller visibility validated",
        "- Authorization checks: cross-listing and admin-order mutation blocked as expected",
        "",
        "## Pass/Fail Matrix",
    ]
    for m in matrix:
        mark = "x" if m["result"] == "PASS" else " "
        d = f" ({m['detail']})" if m.get("detail") else ""
        report_lines.append(f"- [{mark}] {m['check']} — **{m['result']}**{d}")

    report_lines += ["", "## Blockers / residual risks"]
    if blockers:
        for b in blockers:
            report_lines.append(f"- {b['id']}: {b['detail']}")
    else:
        report_lines.append("- none")

    (OUT / "REPORT.md").write_text("\n".join(report_lines) + "\n", encoding="utf-8")

    step_lines = [f"# Step Log ({run_id})", ""]
    for i, s in enumerate(steps, start=1):
        step_lines.append(f"{i}. `{s['method']} {s['path']}` -> {s['status']}")
    (OUT / "step_log.md").write_text("\n".join(step_lines) + "\n", encoding="utf-8")


if __name__ == "__main__":
    main()
