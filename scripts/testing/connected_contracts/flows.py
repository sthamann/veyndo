"""Native order/app events through guarded durable Slack flows, retries and restart uncertainty."""
import copy
import json
import uuid
from testing.reference_connector import Store
from testing.connected_contracts.client import wait


def run(client, runtime, tenant, h):
    api, action, passed = client.api, client.action, client.passed
    provider, connector, folder, key = runtime.provider, runtime.connector, runtime.folder, runtime.key
    normalized = api(
        "/api/automation/import-condition",
        {
            "type": "andContainer",
            "children": [
                {
                    "type": "customerGroup",
                    "value": {"customerGroupIds": ["consumer"], "operator": "!="},
                },
                {
                    "type": "notContainer",
                    "children": [
                        {"type": "customerLoggedIn", "value": {"isLoggedIn": True}}
                    ],
                },
            ],
        },
        h,
    )["condition"]
    assert normalized["children"][0]["values"] == ["consumer"]
    api(
        "/api/automation/import-condition",
        {"type": "unknownUpstreamRule"},
        h,
        expected=400,
    )
    names = {l: "Flow notification" for l in ["en", "de", "fr", "es"]}
    flow = {
        "name": names,
        "active": True,
        "event": "order.placed",
        "condition": {
            "type": "andContainer",
            "children": [
                {"type": "cartCartAmount", "operator": ">", "amount": 1},
                {"type": "customerLoggedIn", "isLoggedIn": False},
            ],
        },
        "action": "app_action",
        "instruction": {l: "Order {orderNumber} · {totalPrice} EUR" for l in names},
        "locale": "en-GB",
        "appAction": {"app": "slack", "action": "post_order", "arguments": {}},
    }
    for forbidden in ["status", "configure", "disconnect"]:
        blocked = copy.deepcopy(flow)
        blocked["appAction"]["action"] = forbidden
        api(
            "/api/automation/flows/rejected_" + forbidden,
            {"revision": 0, "data": blocked},
            h,
            "PUT",
            expected=400,
        )
    api(
        "/api/automation/flows/order_slack", {"revision": 0, "data": flow}, h, "PUT"
    )
    ch = {"x-tenant": tenant}
    cart = api("/store-api/checkout/cart", {"session": uuid.uuid4().hex}, ch)
    ch["sw-context-token"] = cart["token"]
    api(
        "/store-api/checkout/cart/line-item",
        {"items": [{"referencedId": "mug", "quantity": 1}]},
        ch,
    )
    order = api(
        "/store-api/checkout/order", {}, {**ch, "Idempotency-Key": uuid.uuid4().hex}
    )
    provider.order = order["orderNumber"]
    wait(lambda: len(provider.messages) == 1)
    assert order["orderNumber"] in provider.messages[0]["text"]
    assert "token" not in json.dumps(provider.messages)
    jobs = wait(
        lambda: [
            j
            for j in action("slack", "status")["jobs"]
            if j["state"] == "completed"
        ]
    )
    wait(
        lambda: any(
            j["flow"] == "order_slack" and j["state"] == "completed"
            for j in api("/api/automation", h=h)["jobs"]
        )
    )
    assert len(provider.messages) == 1
    passed(
        "Actual order event → nested Shopware rule → durable flow → shared app action → Slack HTTP message"
    )
    # Apps publish validated namespaced events; the same flow pipeline handles them.
    manifest = {
        "id": "support_signal",
        "version": "1.0.0",
        "coreApi": "1",
        "runtime": "declarative",
        "name": names,
        "permissions": ["events.publish"],
        "entities": [],
        "slots": [],
        "events": [],
        "actions": [
            {
                "name": "received",
                "description": "Publish support signal",
                "handler": "emit",
                "inputSchema": {
                    "type": "object",
                    "properties": {"title": {"type": "string"}},
                    "required": ["title"],
                    "additionalProperties": False,
                },
            }
        ],
    }
    api("/api/apps", {"manifest": manifest}, h)
    custom = copy.deepcopy(flow)
    custom["event"] = "app.support_signal.received"
    custom["condition"] = {
        "type": "eventField",
        "path": "title",
        "operator": "contains",
        "value": "complaint",
    }
    custom["instruction"] = {l: "Support event {event}" for l in names}
    api(
        "/api/automation/flows/support_slack",
        {"revision": 0, "data": custom},
        h,
        "PUT",
    )
    api(
        "/api/apps/support_signal/actions/received",
        {"title": "Complaint received"},
        h,
    )
    wait(lambda: len(provider.messages) == 2)
    passed(
        "An app emits its own namespaced event and triggers a rule-bound Slack flow"
    )
    post = {
        "requestKey": "stable-notification",
        "event": {"orderNumber": order["orderNumber"]},
        "template": "RATE {orderNumber}",
    }
    action("slack", "post_order", post)
    action("slack", "post_order", post)
    wait(
        lambda: any(
            j["id"] == "stable-notification"
            and j["state"] == "completed"
            and j["attempts"] == 2
            for j in action("slack", "status")["jobs"]
        )
    )
    assert len(provider.messages) == 3
    action("slack", "post_order", {**post, "template": "changed"}, expected=502)
    action(
        "slack",
        "post_order",
        {**post, "requestKey": "uncertain-result", "template": "UNCERTAIN"},
    )
    wait(
        lambda: any(
            j["id"] == "uncertain-result" and j["state"] == "uncertain"
            for j in action("slack", "status")["jobs"]
        )
    )
    connector.store.enqueue(tenant, "slack", "restart-test", {"operation": "post"})
    claimed = connector.store.claim()
    assert claimed
    Store(folder + "/private.sqlite", key).recover()
    assert (
        next(
            j
            for j in connector.store.jobs(tenant, "slack")
            if j["id"] == "restart-test"
        )["state"]
        == "uncertain"
    )
    passed(
        "Idempotent inbox, 429 Retry-After retry, changed-input conflict and uncertain outcomes without automatic duplicate resend"
    )
