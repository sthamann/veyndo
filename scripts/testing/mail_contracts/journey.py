"""Native Rust checkout/outbox/Flow/MCP to Rust mail worker and loopback SMTP acceptance."""
import json
import os
import signal
import socket
import subprocess
import time
import urllib.parse
import uuid
from testing.runtime import ROOT
from testing.reference_connector import email_config
from testing.mail_contracts.wire import http


class NativeMailJourney:
    def test_rust_api_mcp_permissions_checkout_and_real_order_flow(self):
        if not os.getenv("DATABASE_URL"):
            self.skipTest("DATABASE_URL required for real Rust/PostgreSQL path")
        from types import SimpleNamespace
        with socket.socket() as probe:
            probe.bind(("127.0.0.1", 0))
            service = SimpleNamespace(server_port=probe.getsockname()[1])
        with socket.socket() as sock:
            sock.bind(("127.0.0.1", 0))
            port = sock.getsockname()[1]
        base = "http://127.0.0.1:" + str(port)
        # Other running workers must never consume this fixture's flow jobs.
        database = "commerce_mail_" + uuid.uuid4().hex[:12]
        container = os.getenv("DB_CONTAINER", "veyndo-postgres-1")
        from testing.database import psql
        sql = lambda command: subprocess.run(
            psql(container, "commerce", "postgres", "-v", "ON_ERROR_STOP=1", "-c", command),
            check=True,
            capture_output=True,
        )
        sql("CREATE DATABASE " + database)
        self.addCleanup(lambda: sql("DROP DATABASE " + database + " WITH (FORCE)"))
        db_url = (
            urllib.parse.urlsplit(os.environ["DATABASE_URL"])
            ._replace(path="/" + database)
            .geturl()
        )
        env = {
            **os.environ,
            "DATABASE_URL": db_url,
            "BIND_ADDR": "127.0.0.1:" + str(port),
            "APP_SERVICES": json.dumps(
                {
                    "email": {
                        "url": "http://127.0.0.1:"
                        + str(service.server_port)
                        + "/email",
                        "token": self.connector.token,
                    }
                }
            ),
            "PROCESS_ROLE": "all",
        }
        log = open(self.temp.name + "/core.log", "w")
        self.addCleanup(log.close)
        backend = subprocess.Popen(
            [str(ROOT / "target/debug/veyndo")],
            cwd=ROOT,
            env=env,
            stdout=log,
            stderr=log,
        )
        self.addCleanup(lambda: (backend.send_signal(signal.SIGINT), backend.wait(timeout=10)))

        def api(path, body=None, headers=None, method=None, expected=200):
            return http(base + path, body, headers, method, expected)

        for _ in range(100):
            try:
                api("/health")
                break
            except OSError:
                time.sleep(0.1)
        # The actual standard service is Rust/PostgreSQL, not the archived Python oracle.
        service_env = {**env, **dict(self.env.in_dict), "CONNECTOR_DATABASE_URL": db_url,
                       "CONNECTOR_PORT": str(service.server_port)}
        service_env.pop("CONNECTOR_DATABASE", None)
        mail_log = open(self.temp.name + "/rust-mail.log", "w")
        self.addCleanup(mail_log.close)
        mail_service = subprocess.Popen([str(ROOT / "target/debug/connectors")], cwd=ROOT,
                                       env=service_env, stdout=mail_log, stderr=mail_log)
        self.addCleanup(lambda: (mail_service.send_signal(signal.SIGINT), mail_service.wait(timeout=70)))
        for _ in range(100):
            try:
                http("http://127.0.0.1:" + str(service.server_port) + "/health")
                break
            except OSError:
                time.sleep(0.1)
        else:
            raise AssertionError("Rust connector did not start")
        suffix = uuid.uuid4().hex[:12]
        user = api(
            "/api/auth/register",
            {
                "email": suffix + "@example.test",
                "password": "Synthetic-email-account-2026!",
                "name": "Email Owner",
                "workspaceId": "mail-" + suffix,
                "workspaceName": "Email test shop",
            },
        )
        tenant = user["workspace"]
        h = {"Authorization": "Bearer " + user["token"], "x-tenant": tenant}
        api("/api/apps", {"builtIn": "email"}, h)
        api("/api/apps/email/actions/status", {}, {"x-tenant": tenant}, expected=401)
        api(
            "/api/apps/email/actions/status",
            {},
            {**h, "x-tenant": "other-" + suffix},
            expected=403,
        )
        s = {**self.settings, "dryRun": False, "enabled": True}
        api("/api/apps/email/actions/configure", {"revision": 0, "settings": s}, h)
        tools = api("/mcp", {"jsonrpc": "2.0", "id": 1, "method": "tools/list"}, h)[
            "result"
        ]["tools"]
        self.assertIn("app.email.send_order", [t["name"] for t in tools])
        mcp = api(
            "/mcp",
            {
                "jsonrpc": "2.0",
                "id": 2,
                "method": "tools/call",
                "params": {
                    "name": "app.email.send",
                    "arguments": {
                        "requestKey": "mcp-test",
                        "dryRun": True,
                        "message": {
                            "to": "buyer@example.test",
                            "subject": "MCP test",
                            "text": "No external delivery",
                        },
                    },
                },
            },
            h,
        )["result"]
        self.assertFalse(mcp.get("isError", False), mcp)
        self.assertEqual(mcp["structuredContent"]["state"], "accepted")
        flow = {
            "name": {l: "Email order" for l in email_config.LOCALES},
            "active": True,
            "event": "order.placed",
            "condition": {"type": "alwaysValid"},
            "action": "app_action",
            "instruction": {l: "Order email" for l in email_config.LOCALES},
            "locale": "en-GB",
            "appAction": {
                "app": "email",
                "action": "send_order",
                "arguments": {"locale": "de"},
            },
        }
        api("/api/automation/flows/mail_order", {"revision": 0, "data": flow}, h, "PUT")
        ch = {"x-tenant": tenant}
        cart = api("/store-api/checkout/cart", {"session": suffix}, ch)
        ch["sw-context-token"] = cart["token"]
        cart = api(
            "/store-api/checkout/cart/line-item",
            {"items": [{"referencedId": "mug", "quantity": 1}]},
            ch,
        )
        cart = api(
            "/store-api/checkout/context",
            {
                "revision": cart["revision"],
                "checkout": {**cart["checkout"], "customerEmail": "buyer@example.test"},
            },
            ch,
            "PUT",
        )
        order = api(
            "/store-api/checkout/order",
            {},
            {**ch, "Idempotency-Key": "order-" + suffix},
        )
        for _ in range(150):
            if self.smtp.messages:
                break
            time.sleep(0.1)
        self.assertEqual(
            len(self.smtp.messages),
            1,
            {
                "flows": api("/api/automation", headers=h),
                "mail": api("/api/apps/email/actions/status", {}, h),
            },
        )
        self.assertIn(order["orderNumber"].encode(), self.smtp.messages[0][1])
        for _ in range(100):
            jobs = api("/api/apps/email/actions/status", {}, h)["jobs"]
            if jobs[0]["result"] and jobs[0]["result"].get("outcome") == "accepted":
                break
            time.sleep(0.1)
        self.assertEqual(jobs[0]["result"]["outcome"], "accepted")
        # Public legal declaration takes the actual outbox → email app → SMTP path.
        request = api("/store-api/legal/requests", {
            "kind": "withdrawal", "name": "Fixture Buyer", "email": "buyer@example.test",
            "reference": order["orderNumber"], "message": "I withdraw this contract.", "requestKey": "legal-" + suffix,
        }, ch)
        for _ in range(150):
            if len(self.smtp.messages) >= 2:
                break
            time.sleep(0.1)
        self.assertEqual(len(self.smtp.messages), 2)
        from email import policy
        from email.parser import BytesParser
        receipt_body = BytesParser(policy=policy.default).parsebytes(self.smtp.messages[1][1]).get_content()
        self.assertIn(request["id"], receipt_body)
        self.assertIn(b"receivedAt", self.smtp.messages[1][1])
        # Published read-only actions cannot be turned into a sending flow.
        flow["appAction"]["action"] = "status"
        api(
            "/api/automation/flows/rejected",
            {"revision": 0, "data": flow},
            h,
            "PUT",
            expected=400,
        )
        stage = api("/api/environments", {"name": "Mail staging"}, h)
        api("/api/apps", {"builtIn": "email"}, {**h, "x-tenant": stage["id"]})
        # No live external service writes in a staging shop.
        api(
            "/api/apps/email/actions/send",
            {
                "requestKey": "stage-send",
                "message": {
                    "to": "buyer@example.test",
                    "subject": "Blocked",
                    "text": "x",
                },
            },
            {**h, "x-tenant": stage["id"]},
            expected=400,
        )
