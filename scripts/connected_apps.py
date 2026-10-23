#!/usr/bin/env python3
"""Registered connected-app suite: archived OAuth oracle to real Rust knowledge, MCP and Flow consumers."""
import json
from testing.connected_contracts import access, flows, sources
from testing.connected_contracts.client import Client
from testing.connected_contracts.runtime import fixture

def main():
    with fixture() as runtime:
        client = Client(runtime.base)
        tenant, owner, other = access.run(client, runtime)
        sources.run(client, runtime, tenant, owner, other)
        flows.run(client, runtime, tenant, owner)
        sources.disconnect(client, owner)
        print(json.dumps({
            "passed": len(client.checks), "checks": client.checks,
            "providers": "local protocol fixtures; live OAuth credentials not exercised",
        }))

if __name__ == "__main__":
    main()
