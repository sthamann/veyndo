/** Cross-view diagnostics locate broken references without demanding optional features. */
import { expect, it } from "vitest";
import { template } from "../../src/admin/developer/app-model";
import { diagnoseConnections } from "../../src/admin/developer/app-connections";
it("accepts a compiled native template without demanding optional hooks or secrets", () => {
  expect(diagnoseConnections(template())).toEqual([]);
});
it("points to the broken view, entity, action, agent tool and missing commerce examples", () => {
  const m = template();
  m.surfaces![0].uiPath = "native/missing";
  m.views![0].blocks[1].entity = "gone";
  m.views![0].blocks[1].readAction = "gone_action";
  m.intelligence!.tools = ["list_guides"];
  m.commerceHooks = { source: "hooks.wasm", hooks: ["price"] };
  expect(diagnoseConnections(m)).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ kind: "viewMissing", tab: "design" }),
      expect.objectContaining({ kind: "modelMissing", tab: "data" }),
      expect.objectContaining({ kind: "actionMissing", tab: "connect" }),
      expect.objectContaining({ kind: "agentUnavailable", tab: "connect" }),
      expect.objectContaining({ kind: "examplesMissing", tab: "capability" }),
    ]),
  );
});
it("finds nested button calls and missing model relations", () => {
  const m = template();
  m.entities[0].fields[0].references = "missing";
  m.views![0].blocks[0].handlers = {
    click: [
      {
        op: "if",
        left: { kind: "literal", value: 1 },
        compare: "eq",
        right: { kind: "literal", value: 1 },
        then: [
          {
            op: "call",
            action: "nested_missing",
            input: { kind: "literal", value: {} },
          },
        ],
      },
    ],
  };
  expect(diagnoseConnections(m)).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ kind: "relationMissing", tab: "data" }),
      expect.objectContaining({
        kind: "actionMissing",
        reference: expect.stringContaining("nested_missing"),
      }),
    ]),
  );
});

it("includes API and intelligence references checked by native installation", () => {
  const m = template();
  m.apiRoutes = [
    {
      path: "/missing",
      method: "GET",
      scope: "admin",
      action: "missing_action",
    },
  ];
  m.intelligence!.entities = ["missing_model"];
  expect(diagnoseConnections(m)).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        kind: "actionMissing",
        reference: "GET /missing → missing_action",
        tab: "connect",
      }),
      expect.objectContaining({
        kind: "modelMissing",
        reference: "missing_model",
        tab: "data",
      }),
    ]),
  );
});
