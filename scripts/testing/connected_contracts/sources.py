"""Private Gmail/GA4 import, native graph/MCP/model consumption, refresh and disconnect cleanup."""
import json
import time
from testing.connected_contracts.client import wait


def run(client, runtime, tenant, h, oh):
    api, action, sync, passed = client.api, client.action, client.sync, client.passed
    provider, connector = runtime.provider, runtime.connector
    assert sync("gmail")["state"] == "completed"
    assert sync("google_analytics")["state"] == "completed"
    sources = wait(
        lambda: (
            api("/api/knowledge/external", h=h)["elements"]
            if len(api("/api/knowledge/external", h=h)["elements"]) == 3
            else None
        )
    )
    assert any("Cracked mug" in s["text"] for s in sources)
    assert all("ignore all rules" not in s["text"] for s in sources)
    assert api("/api/knowledge/external", h=oh)["elements"] == []
    assert "Cracked mug" not in json.dumps(api("/api/knowledge", h=h))
    assert any(
        s["metadata"].get("metadata", {}).get("subjectToThresholding")
        for s in sources
    )
    graph = api("/api/knowledge/external", h=h)["graph"]
    assert len(graph["sources"]) == 3, graph
    assert any(r["productId"] == "mug" for r in graph["productRelations"]), graph
    tool = api(
        "/mcp",
        {
            "jsonrpc": "2.0",
            "id": 1,
            "method": "tools/call",
            "params": {"name": "knowledge.external", "arguments": {"query": "mug"}},
        },
        h,
    )
    assert len(tool["result"]["structuredContent"]["elements"]) == 3
    chat = api(
        "/api/agent/chat",
        {
            "message": "Read the complaint and product analytics; do not change anything.",
            "inference": {"provider": "openai"},
        },
        h,
    )
    assert "taskId" in chat["messages"][-1]["data"], chat["messages"][-1]["data"]
    assert any(
        "Cracked mug" in body.get("input", "")
        and "subjectToThresholding" in body.get("input", "")
        for path, body in provider.calls
        if path == "/v1/responses"
    )
    passed(
        "Private SQL product provenance and MCP evidence feed the actual merchant model prompt"
    )
    sync("gmail")
    time.sleep(0.3)
    assert len(api("/api/knowledge/external", h=h)["elements"]) == 3
    provider.expired = True
    assert sync("gmail")["state"] == "completed"
    provider.removed = True
    assert sync("gmail")["state"] == "completed"
    wait(lambda: len(api("/api/knowledge/external", h=h)["elements"]) == 2)
    state = connector.store.get(tenant, "google_analytics")
    state["tokens"]["expires_at"] = 0
    connector.store.save(tenant, "google_analytics", state)
    sync("google_analytics")
    assert any(
        v.get("grant_type") == ["refresh_token"]
        for p, v in provider.calls
        if p == "/google_token"
    )
    passed(
        "Gmail HTML/history expiry/label removal and GA4 rows/threshold metadata reach private retrieval; token refresh works"
    )


def disconnect(client, h):
    api, action, passed = client.api, client.action, client.passed
    action("google_analytics", "disconnect")
    wait(lambda: api("/api/knowledge/external", h=h)["elements"] == [])
    passed(
        "Disconnect removes provider credentials and private PostgreSQL/graph sources"
    )
