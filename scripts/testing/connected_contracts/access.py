"""OAuth/PKCE, encrypted tenant binding, revision fences, channel tracking and read-only access."""
import json
import pathlib
import urllib.parse
import urllib.request
import uuid
from testing.runtime import ROOT
from testing.connected_contracts.client import http


def run(client, runtime):
    api, action, configure, passed = client.api, client.action, client.configure, client.passed
    base, config, connector, folder, app_url = runtime.base, runtime.config, runtime.connector, runtime.folder, runtime.app_url
    with urllib.request.urlopen(base + "/store-api/apps/analytics.js") as response:
        assert response.headers.get_content_type() == "text/javascript"
        assert response.headers.get("X-Content-Type-Options") == "nosniff"
        assert (
            response.read().decode()
            == (ROOT / "extensions/sdk/analytics.js").read_text()
        )

    u = client.user()
    other = client.user()
    tenant = u["workspace"]
    h = {"Authorization": "Bearer " + u["token"], "x-tenant": tenant}
    oh = {
        "Authorization": "Bearer " + other["token"],
        "x-tenant": other["workspace"],
    }
    client.headers = h
    for app in config:
        api("/api/apps", {"builtIn": app}, h)

    for app in config:
        start = action(app, "connect")
        params = urllib.parse.parse_qs(
            urllib.parse.urlsplit(start["authorizationUrl"]).query
        )
        if app != "slack":
            assert (
                params["code_challenge_method"] == ["S256"]
                and "access_type" in params
            )
        http(
            app_url
            + "/oauth/callback?"
            + urllib.parse.urlencode(
                {
                    "state": params["state"][0],
                    "code": "gmail" if app == "gmail" else "ga4",
                }
            )
        )
        http(
            app_url
            + "/oauth/callback?"
            + urllib.parse.urlencode(
                {"state": params["state"][0], "code": "gmail"}
            ),
            expected=400,
        )
        assert action(app, "status")["connected"]
        action(app, "status", headers=oh, expected=404)
    assert "fixture-access" not in json.dumps(api("/api/apps", h=h))
    assert (
        b"fixture-refresh"
        not in pathlib.Path(folder + "/private.sqlite").read_bytes()
    )
    with connector.store.db() as db:
        sealed = db.execute(
            "SELECT data FROM config WHERE app=?", ("gmail",)
        ).fetchone()["data"]
    try:
        connector.store.open(other["workspace"], "gmail", sealed)
        raise AssertionError("Cross-tenant credential decoded")
    except ValueError:
        pass
    passed(
        "OAuth with PKCE, single-use state, private encryption and cross-tenant binding"
    )

    configure(
        "google_analytics",
        {
            "measurementId": "G-TEST12345",
            "propertyId": "123456",
            "salesChannel": "default",
        },
    )
    configure("gmail", {"labelId": "Support"})
    configure("slack", {"channelId": "C0123456789", "notifyOrders": False})
    old = action("slack", "status")["revision"]
    action(
        "slack", "configure", {"revision": old - 1, "settings": {}}, expected=502
    )
    assert action("gmail", "labels")["labels"]
    assert action("slack", "channels")["channels"][0]["id"] == "C0123456789"
    public = {"x-tenant": tenant}
    assert (
        api(
            "/store-api/apps/google_analytics/actions/tracking",
            {"salesChannel": "default"},
            public,
        )["measurementId"]
        == "G-TEST12345"
    )
    assert (
        api(
            "/store-api/apps/google_analytics/actions/tracking",
            {"salesChannel": "other"},
            public,
        )["measurementId"]
        is None
    )
    passed(
        "Live provider metadata, revision-fenced settings and sales-channel-scoped public tracking"
    )
    invite = api(
        "/api/workspace/invitations",
        {"email": uuid.uuid4().hex + "@example.test", "role": "viewer"},
        h,
    )
    viewer = api(
        "/api/auth/accept",
        {
            "invitationToken": invite["token"],
            "name": "Reader",
            "password": "Synthetic-reader-account-2026!",
        },
    )
    vh = {"Authorization": "Bearer " + viewer["token"], "x-tenant": tenant}
    assert not action("gmail", "status", headers=vh)["settings"].get("tokens")
    action("gmail", "sync", {"requestKey": "forbidden"}, vh, 403)
    api("/api/knowledge/external", h=public, expected=401)
    passed(
        "Read-only users cannot import, reconnect or send Slack; public callers cannot read mail"
    )

    return tenant, h, oh
