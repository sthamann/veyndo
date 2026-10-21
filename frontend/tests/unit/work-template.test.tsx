/** Real completed-task handoff and protected-source mapping; configuration never contains source inputs. */
import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { useState } from "react";
import WorkspaceTask from "../../src/admin/workspace/WorkspaceTask";
import WorkTemplateEditor from "../../src/admin/automation/WorkTemplateEditor";
import {
  clearGoalFlow,
  goalTemplate,
} from "../../src/admin/automation/goal-template";
import {
  copyWorkTemplate,
  scalarFields,
  type WorkTemplate,
} from "../../src/admin/automation/work-template";
import { LocaleScope } from "../../src/shared/i18n/i18n";

const preview: any = {
  proposal: {
    summary: "Private original description",
    changes: [],
    operations: [
      {
        name: "merchant.category.create",
        label: "Private category",
        arguments_json: JSON.stringify({
          category: {
            id: "old_category",
            revision: 3,
            data: {
              parentId: "old_category",
              translations: { "de-DE": { name: "Private original content" } },
            },
          },
        }),
        binding: { expected_app_revision: 7 },
      },
    ],
  },
};
const source = {
  state: "ready",
  approvalRequired: false,
  execution: { completed: 1, total: 1 },
  preview,
};
afterEach(clearGoalFlow);
it("hands off actual completed work as an inactive reference-only draft without copying private description, inputs or execution authority", () => {
  const onFlow = vi.fn();
  const { rerender } = render(
    <LocaleScope locale="de-DE">
      <WorkspaceTask
        task={{ id: "source", preview, applied: false }}
        request={vi.fn()}
        onTranslations={vi.fn()}
        onFlow={onFlow}
      />
    </LocaleScope>,
  );
  expect(screen.queryByText("Als Flow wiederverwenden")).toBeNull();
  rerender(
    <LocaleScope locale="de-DE">
      <WorkspaceTask
        task={{ id: "source", preview, applied: true }}
        request={vi.fn()}
        onTranslations={vi.fn()}
        onFlow={onFlow}
      />
    </LocaleScope>,
  );
  fireEvent.click(screen.getByText("Als Flow wiederverwenden"));
  expect(onFlow).toHaveBeenCalledOnce();
  const flow = goalTemplate("de-DE")!;
  expect(flow).toMatchObject({
    name: { "de-DE": "Geprüften Auftrag wiederholen" },
    active: false,
    action: "work_proposal",
    event: "product.updated",
    workTemplate: { taskId: "source", dailyLimit: 10 },
  });
  expect(flow.workTemplate?.bindings).toEqual([
    { step: 0, pointer: "/category/id", source: "run.key:step_0" },
    { step: 0, pointer: "/category/data/parentId", source: "run.key:step_0" },
  ]);
  expect(JSON.stringify(flow)).not.toMatch(
    /Private|arguments_json|binding"|old_category/,
  );
  expect(goalTemplate("de-DE")).toBeNull();
});
it("rejects malformed or oversized source plans and escapes field paths without evaluating their contents", () => {
  expect(
    copyWorkTemplate("source", { proposal: { operations: [] } } as any),
  ).toBeNull();
  expect(
    copyWorkTemplate("source", {
      proposal: { operations: [{ arguments_json: "not JSON" }] },
    } as any),
  ).toBeNull();
  expect(
    copyWorkTemplate("source", {
      proposal: { operations: Array(13).fill(preview.proposal.operations[0]) },
    } as any),
  ).toBeNull();
  expect(
    scalarFields({ "a/b": { "~x": ["{{do_not_execute}}", true, null, 4] } }),
  ).toEqual([
    { pointer: "/a~1b/~0x/0", value: "{{do_not_execute}}" },
    { pointer: "/a~1b/~0x/3", value: 4 },
  ]);
});
it("loads original protected inputs and edits only the selected binding and daily limit", async () => {
  const request = vi.fn(async () => source);
  let saved: WorkTemplate | undefined;
  function Editor() {
    const [value, setValue] = useState(copyWorkTemplate("source", preview)!);
    saved = value;
    return (
      <WorkTemplateEditor request={request} value={value} onChange={setValue} />
    );
  }
  render(
    <LocaleScope locale="de-DE">
      <Editor />
    </LocaleScope>,
  );
  expect(await screen.findByText(/Private category/)).toBeInTheDocument();
  expect(request).toHaveBeenCalledWith("/api/agent/runs/source");
  fireEvent.change(screen.getByLabelText("Eingabefeld"), {
    target: { value: "/category/data/translations/de-DE/name" },
  });
  fireEvent.change(screen.getByLabelText("Wert verwenden aus"), {
    target: { value: "event.productId" },
  });
  expect(saved?.bindings).toContainEqual({
    step: 0,
    pointer: "/category/data/translations/de-DE/name",
    source: "event.productId",
  });
  fireEvent.change(
    screen.getByLabelText("Höchstens so viele Vorschläge pro Tag (UTC)"),
    { target: { value: "2" } },
  );
  expect(saved?.dailyLimit).toBe(2);
  expect(JSON.stringify(saved)).not.toMatch(
    /Private|old_category|arguments_json/,
  );
  fireEvent.change(screen.getByLabelText("Eingabefeld"), {
    target: { value: "/category/revision" },
  });
  expect(
    screen.queryByRole("option", {
      name: "Produkt, das das Ereignis ausgelöst hat",
    }),
  ).toBeNull();
  fireEvent.change(screen.getByLabelText("Wert verwenden aus"), {
    target: { value: "event.revision" },
  });
  expect(saved?.bindings).toContainEqual({
    step: 0,
    pointer: "/category/revision",
    source: "event.revision",
  });
});
it("immediately hides source data on a request-scope change and ignores late old responses", async () => {
  let resolve: (value: any) => void = () => {};
  const first = vi.fn(
    () =>
      new Promise((r) => {
        resolve = r;
      }),
  );
  const second = vi.fn(async () => {
    throw new Error("Forbidden");
  });
  const value = copyWorkTemplate("source", preview)!;
  const { rerender } = render(
    <LocaleScope locale="de-DE">
      <WorkTemplateEditor value={value} request={first} onChange={vi.fn()} />
    </LocaleScope>,
  );
  rerender(
    <LocaleScope locale="de-DE">
      <WorkTemplateEditor value={value} request={second} onChange={vi.fn()} />
    </LocaleScope>,
  );
  await act(async () => resolve(source));
  expect(await screen.findByRole("alert")).toHaveTextContent(
    "Quellauftrag ist nicht verfügbar",
  );
  expect(screen.queryByText("Private category")).toBeNull();
});
it.each([
  undefined,
  { ...source, approvalRequired: true },
  { ...source, execution: { completed: 0, total: 1 } },
])("does not expose pending or unavailable source work", async (run) => {
  render(
    <LocaleScope locale="de-DE">
      <WorkTemplateEditor
        value={copyWorkTemplate("source", preview)!}
        request={vi.fn(async () => run)}
        onChange={vi.fn()}
      />
    </LocaleScope>,
  );
  expect(await screen.findByRole("alert")).toBeInTheDocument();
  expect(screen.queryByText("Private category")).toBeNull();
});
