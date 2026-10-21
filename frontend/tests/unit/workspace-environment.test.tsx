/** Personal layouts stay with the shop; task review follows the selected environment. */
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { expect, it, vi } from "vitest";
import PersonalWorkspace from "../../src/admin/workspace/PersonalWorkspace";
import { StudioContext } from "../../src/admin/shell/StudioContext";
import type { StudioController } from "../../src/admin/shell/useStudioController";
import type { RequestFn } from "../../src/admin/shell/studio-types";
import { LocaleScope } from "../../src/shared/i18n/i18n";

const layout = {
  revision: 1,
  data: {
    areas: [{ id: "business", name: "Business", cards: [], pins: [] }],
    active: "business",
    goals: [],
  },
  versions: [],
};
const task = {
  id: "private-flow-task",
  applied: false,
  preview: {
    proposal: {
      summary: "Create a private review category",
      changes: [],
      operations: [
        {
          name: "merchant.category.create",
          arguments_json: "{}",
          label: "Create category",
        },
      ],
    },
    catalogBefore: [],
  },
};
function view(request: RequestFn, liveRequest: RequestFn) {
  const context = {
    request,
    liveRequest,
    workspace: "shop",
    environment: "private",
    access: ["assistant.use", "catalog.read", "orders.read", "knowledge.read"],
    nav: [],
    tabLabel: (id: string) => id,
    selectTab: vi.fn(),
    setDraft: vi.fn(),
  } as unknown as StudioController;
  return (
    <LocaleScope locale="en-GB">
      <StudioContext.Provider value={context}>
        <PersonalWorkspace />
      </StudioContext.Provider>
    </LocaleScope>
  );
}

it("reviews and approves private work in the sandbox while saving the personal layout in the parent shop", async () => {
  const liveRequest = vi.fn(async (path: string) => {
    if (path === "/api/studio/workspace") return layout;
    throw new Error(`Unexpected live access: ${path}`);
  });
  const request = vi.fn(async (path: string) => {
    if (path === "/api/studio/work") return { items: [] };
    if (path === "/api/agent/tasks") return { tasks: [task] };
    if (path === "/api/agent/tasks/private-flow-task/apply")
      return { applied: true };
    throw new Error(`Unexpected private access: ${path}`);
  });
  render(view(request as RequestFn, liveRequest as RequestFn));
  await screen.findByText("Create a private review category");
  fireEvent.click(screen.getByText("Agent proposals · 1"));
  fireEvent.click(screen.getByRole("button", { name: "Open" }));
  fireEvent.click(screen.getByRole("button", { name: /approve/i }));
  await screen.findByText("Done");
  expect(request).toHaveBeenCalledWith(
    "/api/agent/tasks/private-flow-task/apply",
    { approve: true },
  );
  fireEvent.click(screen.getByRole("button", { name: "Save workspace" }));
  await screen.findByText("Workspace saved");
  expect(liveRequest).toHaveBeenCalledWith(
    "/api/studio/workspace",
    { revision: 1, data: layout.data },
    "PUT",
  );
  expect(
    liveRequest.mock.calls.every(([path]) => path === "/api/studio/workspace"),
  ).toBe(true);
  expect(
    request.mock.calls.some(([path]) => path === "/api/studio/workspace"),
  ).toBe(false);
});

it("discards a late sandbox proposal after switching environments without losing the saved layout", async () => {
  let finish!: (value: unknown) => void;
  const liveRequest = vi.fn(async () => layout);
  const privateRequest = vi.fn(async (path: string) =>
    path === "/api/agent/tasks"
      ? new Promise((resolve) => {
          finish = resolve;
        })
      : { items: [] },
  );
  const nextRequest = vi.fn(async (path: string) =>
    path === "/api/agent/tasks" ? { tasks: [] } : { items: [] },
  );
  const { rerender } = render(
    view(privateRequest as RequestFn, liveRequest as RequestFn),
  );
  await waitFor(() =>
    expect(privateRequest).toHaveBeenCalledWith("/api/agent/tasks"),
  );
  rerender(view(nextRequest as RequestFn, liveRequest as RequestFn));
  await waitFor(() =>
    expect(nextRequest).toHaveBeenCalledWith("/api/agent/tasks"),
  );
  await act(async () => finish({ tasks: [task] }));
  expect(
    screen.queryByText("Create a private review category"),
  ).not.toBeInTheDocument();
  expect(screen.getByText("Agent proposals · 0")).toBeInTheDocument();
  expect(screen.getByRole("tab", { name: "Business" })).toBeInTheDocument();
  expect(liveRequest).toHaveBeenCalledOnce();
});
