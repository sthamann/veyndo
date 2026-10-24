#!/usr/bin/env python3
"""Single integration suite registry, isolated DB by default; never alters an existing shop.

CI and local runs create and remove their own database inside the explicitly
selected container. --existing-database is an explicit disposable-fixture override.
SIGINT lets the Rust server flush its metrics and optional LLVM coverage profile.
"""
import argparse
from contextlib import nullcontext
import json
import os
import socket
import subprocess
import sys
import time
import urllib.parse
import uuid

from testing.runtime import ROOT, artifact_path, run, serve, stop
from testing.database import psql
from testing.parallel_check import ParallelCheck

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument("--container", default="veyndo-postgres-1")
parser.add_argument("--existing-database", action="store_true")
parser.add_argument("--only", nargs="+", help="Run selected registered HTTP/provider/browser/tooling suites in an isolated database")
parser.add_argument("--parallel-pooler", metavar="QDRANT_URL", help="Run signed_pooler concurrently with its own database, logs and a separate disposable Qdrant instance")
args = parser.parse_args()
started = time.monotonic()
env = dict(os.environ)
if args.parallel_pooler:
    if args.only or args.existing_database:
        parser.error('--parallel-pooler requires the complete suite with owned disposable databases')
    secondary = urllib.parse.urlsplit(args.parallel_pooler)
    primary = urllib.parse.urlsplit(env.get('QDRANT_URL', 'http://127.0.0.1:16333'))
    shared_port = primary.hostname in ('127.0.0.1', 'localhost', '::1') and (secondary.port or 80) == (primary.port or 80)
    if (secondary.scheme != 'http' or secondary.hostname != '127.0.0.1' or shared_port
            or secondary.username or secondary.password or secondary.query or secondary.fragment
            or secondary.path not in ('', '/')):
        parser.error('--parallel-pooler requires a different local disposable Qdrant endpoint')
if not env.get("DATABASE_URL"):
    for line in (ROOT / ".env").read_text().splitlines():
        if line.startswith("DATABASE_URL="):
            env["DATABASE_URL"] = line.split("=", 1)[1].strip().strip('"\'')
url = urllib.parse.urlsplit(env["DATABASE_URL"])
name = url.path[1:] if args.existing_database else "commerce_quality_" + uuid.uuid4().hex
user = url.username or "commerce"


def sql(statement):
    subprocess.run(
        psql(args.container,user,"postgres","-v","ON_ERROR_STOP=1"),
        input=statement, text=True, check=True, stdout=subprocess.DEVNULL,
    )


suites = json.loads((ROOT / "scripts/testing/suites.json").read_text())
if args.parallel_pooler and suites['providers'].count('signed_pooler') != 1:
    parser.error('The parallel check must appear exactly once in the provider registry')
if args.only:
    assert set(args.only) <= {s for group in suites.values() for s in group}, "Only registered suites can be selected"
    suites = {group: [s for s in names if s in args.only] for group, names in suites.items()}

if not args.existing_database:
    sql(f'CREATE DATABASE "{name}";')
with socket.socket() as probe:
    probe.bind(("127.0.0.1", 0))
    port = probe.getsockname()[1]
with socket.socket() as probe:
    probe.bind(("127.0.0.1", 0))
    frontend_port = probe.getsockname()[1]
env.update({
    "DATABASE_URL": urllib.parse.urlunsplit(url._replace(path="/" + name)),
    "DB_CONTAINER": args.container, "TEST_DB_CONTAINER": args.container,
    "TEST_DATABASE": name,
    "BASE_URL": f"http://127.0.0.1:{port}",
    "BIND_ADDR": f"127.0.0.1:{port}",
    "MERCHANT_TOKEN": "quality-only-synthetic-bootstrap-credential",
    "APP_SERVICES": "{}", "SEED_DEMO": "true", "PROCESS_ROLE": "all",
    # The existing scalability fixture deliberately offers 32 simultaneous edits
    # from one shop. Configure that admitted load explicitly; production defaults
    # remain conservative and separate saturation tests verify 429 behavior.
    "TENANT_CONCURRENCY": "32",
    # Synthetic ingress credentials test geography spoof rejection; never a live proxy key.
    "BEHAVIOR_GEO_SHARED_SECRET": "quality-only-geography-fixture-2026-" + "g"*32,
    "TEST_BEHAVIOR_GEO_SECRET": "quality-only-geography-fixture-2026-" + "g"*32,
    # Multi-process app fixtures run HTTP + memory + app workers alongside this
    # server. Give each a small explicit pool, within the real shared 80-slot cap.
    "DB_POOL_MAX": "4", "DB_POOL_MIN": "0",
    # Existing differential cases intentionally use the versioned furniture fixture.
    # The fashion_demo provider suite starts a separate server with the shipping default.
    "DEMO_CATALOG": "legacy-furniture",
    "COMMERCE_PUBLIC_ORIGIN": "https://studio.example.test",
    "OLLAMA_URL": "http://127.0.0.1:1", "TEST_PERSONAL": "1",
    "PLATFORM_SECRET_KEY": "07"*32, "INFERENCE_ALLOW_LOOPBACK": "true",
    "SHOP_DOMAIN_SUFFIX": "veyndo.ai",
    "CANONICAL_DOMAIN": "veyndo.ai", "LEGACY_DOMAINS": "migration.previous.test",
    "HOSTED_FRONTEND_ORIGIN": f"http://127.0.0.1:{frontend_port}",
    "HOSTED_FRONTEND_KEY": "fixture-gateway-" + "x"*64,
    "HOSTED_FRONTEND_EDITOR_URL": f"http://127.0.0.1:{frontend_port}/design/{{alias}}",
})
for key in ("LIVE_STUDIO", "LIVE_MODEL", "OPENAI_API_KEY", "ANTHROPIC_API_KEY"):
    env.pop(key, None)
try:
    background = nullcontext(None)
    if args.parallel_pooler:
        child = {**env, 'QDRANT_URL': args.parallel_pooler,
                 'TEST_ARTIFACT_DIR': str(artifact_path('signed-pooler/run.log').parent)}
        background = ParallelCheck([sys.executable, 'scripts/signed_pooler.py'], child,
                                   artifact_path('signed-pooler/run.log'))
    with background as parallel:
        with artifact_path('integration-server.log').open("w") as log:
            server = serve(env, env["BASE_URL"], log)
            try:
                for suite in suites["http"]:
                    if suite == "translations":
                        continue
                    command = [sys.executable, f"scripts/{suite}.py"]
                    if suite == "scalability":
                        command += ["--container", args.container]
                    run(command, env)
            finally:
                stop(server)
        if "translations" in suites["http"]:
            run([sys.executable, "scripts/translations.py"], env)
        for suite in suites["providers"]:
            if suite == 'signed_pooler' and parallel:
                parallel.wait()
            else:
                run([sys.executable, f"scripts/{suite}.py"], env)
        for suite in suites["browser_contracts"]:
            run(["node", f"frontend/tests/{suite}.mjs"], env)
        for suite in suites.get("tooling", []):
            run([sys.executable, f"scripts/{suite}.py"], env)
        run([sys.executable, "scripts/structure.py"], env)
        print("PASS selected HTTP suites plus provider, browser-contract and tooling checks" if args.only else "PASS all registered integration and browser-contract suites")
        print(f'TOTAL integration {time.monotonic()-started:.2f}s', flush=True)
finally:
    if not args.existing_database:
        sql(f'DROP DATABASE "{name}" WITH (FORCE);')
