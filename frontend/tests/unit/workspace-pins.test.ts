/** Saving a composed view persists presentation only through the existing actor-private CAS API. */
import { expect, it, vi } from "vitest";
import { pinWorkspaceView } from "../../src/admin/workspace/pin-workspace-view";

it("retains the component layout and safe filters without copied rows or personal search", async () => {
  const request = vi.fn(async (_path: string, body?: any) =>
    body
      ? body
      : {
          revision: 7,
          data: {
            active: "area",
            goals: [],
            areas: [{ id: "area", name: "Service", cards: [], pins: [] }],
          },
        },
  );
  await pinWorkspaceView(
    request,
    ["orders.read", "customers.pii"],
    "Open orders",
    {
      entity: "orders",
      criteria: { state: "open", customer: "Private Buyer" },
      components: ["records", "details"],
    },
  );
  expect(request.mock.calls[1]).toEqual([
    "/api/studio/workspace",
    {
      revision: 7,
      data: {
        active: "area",
        goals: [],
        areas: [
          {
            id: "area",
            name: "Service",
            cards: [],
            pins: [
              {
                title: "Open orders",
                tab: "orders",
                query: '{"state":"open"}',
                components: ["records", "details"],
              },
            ],
          },
        ],
      },
    },
    "PUT",
  ]);
  expect(JSON.stringify(request.mock.calls)).not.toContain("Private Buyer");
});

it("rejects unavailable views before a read and preserves a stale-version write rejection", async () => {
  const request = vi.fn(async () => {
    throw new Error("conflict");
  });
  await expect(
    pinWorkspaceView(request, [], "Orders", { entity: "orders", criteria: {} }),
  ).rejects.toThrow();
  expect(request).not.toHaveBeenCalled();
  request.mockResolvedValueOnce({
    revision: 3,
    data: { active: "", areas: [], goals: [] },
  } as never);
  await expect(
    pinWorkspaceView(request, ["catalog.read"], "Products", {
      entity: "products",
      criteria: {},
    }),
  ).rejects.toThrow("conflict");
});
