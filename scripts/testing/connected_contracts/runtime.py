"""Lifetime of the archived connector oracle, local providers and real Rust commerce process."""
import json
import os
import signal
import socket
import subprocess
import tempfile
import threading
import uuid
from contextlib import contextmanager
from dataclasses import dataclass
from http.server import ThreadingHTTPServer
from unittest.mock import patch
from cryptography.fernet import Fernet
from testing.runtime import ROOT
from testing.reference_connector import Connector, Handler
from testing.connected_contracts.client import http, wait
from testing.connected_contracts.wire import Provider


@dataclass


class Runtime:
    base: str
    app_url: str
    provider: ThreadingHTTPServer
    connector: Connector
    folder: str
    key: str
    config: dict


@contextmanager


def fixture():
    with tempfile.TemporaryDirectory(prefix="commerce-connectors-") as folder, patch.dict(os.environ):
        provider = ThreadingHTTPServer(("127.0.0.1", 0), Provider)
        provider.calls = []
        provider.messages = []
        provider.rate = False
        provider.expired = False
        provider.removed = False
        provider.order = "RAC-TEST"
        threading.Thread(target=provider.serve_forever, daemon=True).start()
        url = "http://127.0.0.1:" + str(provider.server_port)
        gateway = uuid.uuid4().hex + uuid.uuid4().hex
        key = Fernet.generate_key().decode()
        os.environ.update(
            CONNECTOR_DATABASE=folder + "/private.sqlite",
            CONNECTOR_SECRET_KEY=key,
            CONNECTOR_GATEWAY_TOKEN=gateway,
            CONNECTOR_PUBLIC_URL="http://127.0.0.1:8797",
            GOOGLE_CLIENT_ID="fixture-google-client",
            GOOGLE_CLIENT_SECRET="fixture-client-secret",
            SLACK_CLIENT_ID="fixture-slack-client",
            SLACK_CLIENT_SECRET="fixture-slack-secret",
            CONNECTOR_TEST_ENDPOINTS=json.dumps(
                {
                    k: url + "/" + k
                    for k in [
                        "google_token",
                        "google_revoke",
                        "slack_token",
                        "google_authorize",
                        "slack_authorize",
                    ]
                }
                | {
                    "gmail": url + "/gmail",
                    "analytics": url + "/analytics",
                    "slack": url + "/slack",
                }
            ),
        )
        connector = Connector()
        service = ThreadingHTTPServer(("127.0.0.1", 0), Handler)
        service.connector = connector
        service.daemon_threads = False
        threading.Thread(target=service.serve_forever, daemon=True).start()
        stop_workers = threading.Event()
        workers = []
        for app in sorted(["gmail", "google_analytics", "slack"]):
            worker = threading.Thread(
                target=connector.loop, args=(app, stop_workers), daemon=True
            )
            worker.start()
            workers.append(worker)
        app_url = "http://127.0.0.1:" + str(service.server_port)
        with socket.socket() as s:
            s.bind(("127.0.0.1", 0))
            port = s.getsockname()[1]
        base = "http://127.0.0.1:" + str(port)
        config = {
            a: {"url": app_url + "/" + a, "token": gateway}
            for a in ["gmail", "google_analytics", "slack"]
        }
        log = open(ROOT / ".run/connected-apps-test.log", "w")
        backend = subprocess.Popen(
            [str(ROOT / "target/debug/veyndo")],
            cwd=ROOT,
            env={
                **os.environ,
                "APP_SERVICES": json.dumps(config),
                "BIND_ADDR": "127.0.0.1:" + str(port),
                "PROCESS_ROLE": "all",
                "OPENAI_API_KEY": "fixture-only",
                "OPENAI_BASE_URL": url + "/v1",
            },
            stdout=log,
            stderr=log,
        )

        def api(path, body=None, h=None, method=None, expected=200):
            return http(base + path, body, h, method, expected)

        def ready():
            if backend.poll() is not None:
                raise AssertionError(
                    "Backend startup failed; inspect .run/connected-apps-test.log"
                )
            try:
                return api("/health")
            except OSError:
                return False


        try:
            wait(ready)
            yield Runtime(base, app_url, provider, connector, folder, key, config)
        finally:
            backend.send_signal(signal.SIGINT)
            backend.wait(20)
            log.close()
            stop_workers.set()
            service.shutdown()
            service.server_close()
            for worker in workers:
                worker.join(30)
                assert not worker.is_alive(), (
                    "Connector writer still active during state cleanup"
                )
            provider.shutdown()
            provider.server_close()
