/** Registered workspace composition cannot carry authority, copied records or executable components. */
import { expect, it } from "vitest";
import { admitWorkspaceView } from "../../src/shared/grid/workspace-view";
import { renderHook, waitFor } from "@testing-library/react";
import { useGridAccess } from "../../src/shared/grid/useGridAccess";
import type { RequestFn } from "../../src/shared/api/types";

it("admits registered components with current domain rights and preserves only native criteria", () => {
  expect(
    admitWorkspaceView(
      {
        entity: "products",
        criteria: { lowStock: true },
        components: ["records", "details", "intake"],
      },
      ["catalog.read"],
    ),
  ).toEqual({
    entity: "products",
    criteria: { lowStock: true },
    components: ["records", "details", "intake"],
  });
  expect(
    admitWorkspaceView({ entity: "orders", criteria: {} }, [
      "orders.read",
      "customers.pii",
    ])?.components,
  ).toEqual(["records"]);
});

it("rejects unknown components, forged data, foreign scope and revoked PII rights before mounting a native view", () => {
  const valid = {
    entity: "orders",
    criteria: { state: "open" },
    components: ["records", "details"],
  };
  for (const value of [
    { ...valid, tenant: "foreign" },
    { ...valid, rows: [{ id: "forged" }] },
    { ...valid, components: ["records", "script"] },
    { ...valid, components: ["records", "intake"] },
    { ...valid, components: ["details"] },
    { ...valid, components: ["records", "records"] },
    { ...valid, criteria: { tenant: "foreign" } },
    { ...valid, entity: "payments" },
  ])
    expect(
      admitWorkspaceView(value, ["orders.read", "customers.pii"]),
    ).toBeNull();
  expect(admitWorkspaceView(valid, ["orders.read"])).toBeNull();
  expect(admitWorkspaceView(valid, ["customers.pii"])).toBeNull();
});

it("never renders the previous shop rights while admission for a new request scope is pending", async () => {
  const first: RequestFn = async () => ({
    permissions: ["orders.read", "customers.pii"],
  });
  const second: RequestFn = async () => new Promise(() => {});
  const samples: { request: RequestFn; rights: string[] }[] = [];
  const { result, rerender } = renderHook(
    ({ request }) => {
      const rights = useGridAccess(request);
      samples.push({ request, rights });
      return rights;
    },
    { initialProps: { request: first } },
  );
  await waitFor(() => expect(result.current).toContain("customers.pii"));
  rerender({ request: second });
  expect(
    samples
      .filter((sample) => sample.request === second)
      .every((sample) => sample.rights.length === 0),
  ).toBe(true);
});
