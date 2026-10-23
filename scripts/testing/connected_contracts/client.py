"""Consent-aware native test API and scoped app actions; shared polling and result reporting."""
import json
import time
import urllib.error
import urllib.parse
import urllib.request
import uuid
from testing.app_approval import consent


def http(url, body=None, headers=None, method=None, expected=200):
    if urllib.parse.urlsplit(url).path == '/api/apps' and isinstance(body,dict) and ('manifest' in body or 'builtIn' in body): body=consent(body)
    req = urllib.request.Request(
        url,
        data=json.dumps(body).encode() if body is not None else None,
        headers={"Content-Type": "application/json", **(headers or {})},
        method=method,
    )
    try:
        with urllib.request.urlopen(req, timeout=20) as r:
            status = r.status
            v = json.load(r)
    except urllib.error.HTTPError as e:
        status = e.code
        v = json.load(e)
    assert status == expected, (urllib.parse.urlsplit(url).path, status, v)
    return v


def wait(fn):
    for _ in range(120):
        v = fn()
        if v:
            return v
        time.sleep(0.2)
    raise AssertionError("Expected consumer output did not arrive")


class Client:
    def __init__(self, base):
        self.base = base
        self.headers = {}
        self.checks = []

    def api(self, path, body=None, h=None, method=None, expected=200):
        return http(self.base + path, body, h, method, expected)

    def passed(self, text):
        self.checks.append(text)
        print("PASS", text, flush=True)

    def user(self):
        return self.api("/api/auth/register", {
            "email": uuid.uuid4().hex + "@example.test",
            "name": "Connector Owner",
            "password": "Synthetic-connector-account-2026!",
            "workspaceId": "connect-" + uuid.uuid4().hex[:12],
            "workspaceName": "Synthetic connected shop",
        })

    def action(self, app, name, v=None, headers=None, expected=200):
        return self.api("/api/apps/" + app + "/actions/" + name,
                        v or {}, headers or self.headers, expected=expected)

    def configure(self, app, settings):
        status = self.action(app, "status")
        return self.action(app, "configure", {"revision": status["revision"], "settings": settings})

    def sync(self, app):
        v = self.action(app, "sync", {"requestKey": uuid.uuid4().hex})
        return wait(lambda: next((j for j in self.action(app, "status")["jobs"]
                    if j["id"] == v["jobId"] and j["state"] not in ["queued", "running"]), None))
