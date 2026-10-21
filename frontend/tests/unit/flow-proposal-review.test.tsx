/** Flow history and the personal workspace must observe one task, never approve it twice. */
import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { LocaleScope } from "../../src/shared/i18n/i18n";
import AutomationView from "../../src/admin/automation/AutomationView";
import FlowProposalReview from "../../src/admin/automation/FlowProposalReview";
import type { Preview } from "../../src/admin/shell/studio-types";
afterEach(() => vi.useRealTimers());
const preview = {
  proposal: {
    summary: "Prepare hidden category",
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
} as unknown as Preview;
const value = (state = "running", revision = 4) => ({
  taskId: "flow-work",
  state,
  revision,
  approvalRequired: state !== "ready",
  execution: {
    completed: state === "ready" ? 1 : 0,
    total: 1,
    steps: [
      {
        name: "merchant.category.create",
        label: "Create category",
        completed: state === "ready",
      },
    ],
  },
});
it("restores already approved work inside the actual Flow history and waits for native completion", async () => {
  vi.useFakeTimers();
  let run = value();
  const job = {
    id: "job-1",
    flow: "Private category flow",
    state: "completed",
    applied: false,
    executionStarted: true,
    result: { taskId: "flow-work", preview },
  };
  const request = vi.fn(async (path: string) => {
    if (path === "/api/automation")
      return {
        rules: [],
        flows: [],
        promotions: [],
        channels: [],
        jobs: [job],
      };
    if (path === "/api/automation/executions") return { jobs: [job] };
    if (path === "/api/automation/catalog")
      return { conditions: [], events: [], fields: [], apps: [] };
    if (path === "/api/auth/access")
      return { permissions: ["automation.manage"] };
    if (path === "/store-api/context")
      return { mainLocale: "en-GB", availableLocales: ["en-GB"] };
    if (path === "/api/agent/runs/flow-work") return run;
    throw new Error("Unexpected request: " + path);
  });
  render(
    <LocaleScope locale="en-GB">
      <AutomationView request={request as any} role="owner" />
    </LocaleScope>,
  );
  await act(async () => {});
  expect(screen.getByText("Working · progress is saved")).toBeInTheDocument();
  expect(screen.queryByText("Approved work completed")).toBeNull();
  expect(screen.queryByRole("button", { name: /approve/i })).toBeNull();
  run = value("ready", 5);
  await act(() => vi.advanceTimersByTimeAsync(1500));
  expect(screen.getByText("Approved work completed")).toBeInTheDocument();
  expect(screen.getByText("Completed operations: 1")).toBeInTheDocument();
  expect(request.mock.calls.some(([path]) => path.endsWith("/apply"))).toBe(
    false,
  );
});
it("approves once, restores an interrupted task, and respects current control permission", async () => {
  const request = vi.fn(async (path: string) =>
    path.endsWith("/apply")
      ? { queued: true }
      : path.endsWith("/resume")
        ? value("ready", 8)
        : value("failed", 7),
  );
  const props = {
    taskId: "flow-work",
    preview,
    applied: false,
    executionStarted: false,
    request: request as any,
    manage: true,
  };
  const view = (manage: boolean, started = false) => (
    <LocaleScope locale="en-GB">
      <FlowProposalReview
        {...props}
        manage={manage}
        executionStarted={started}
      />
    </LocaleScope>
  );
  const { rerender } = render(view(true));
  await act(async () =>
    fireEvent.click(screen.getByRole("button", { name: /approve/i })),
  );
  expect(
    screen.getByText("Stopped · completed steps are saved"),
  ).toBeInTheDocument();
  expect(screen.queryByRole("button", { name: /approve/i })).toBeNull();
  rerender(view(false, true));
  const resume = screen.getByRole("button", { name: /continue|resume/i });
  expect(resume).toBeDisabled();
  fireEvent.click(resume);
  expect(
    request.mock.calls.filter(([path]) => path.endsWith("/resume")),
  ).toHaveLength(0);
  rerender(view(true, true));
  await act(async () =>
    fireEvent.click(screen.getByRole("button", { name: /continue|resume/i })),
  );
  expect(request).toHaveBeenCalledWith("/api/agent/runs/flow-work/resume", {
    revision: 7,
    approve: true,
  });
  expect(
    request.mock.calls.filter(([path]) => path.endsWith("/apply")),
  ).toHaveLength(1);
});
it("keeps legacy proposals reviewable without fetching a nonexistent durable run", async () => {
  const request = vi.fn(async () => ({ applied: true }));
  render(
    <LocaleScope locale="en-GB">
      <FlowProposalReview
        taskId="legacy"
        preview={preview}
        applied={false}
        executionStarted={false}
        request={request}
        manage={true}
      />
    </LocaleScope>,
  );
  await act(async () =>
    fireEvent.click(screen.getByRole("button", { name: /approve/i })),
  );
  expect(request).toHaveBeenCalledExactlyOnceWith(
    "/api/agent/tasks/legacy/apply",
    { approve: true },
  );
  expect(screen.queryByRole("button", { name: /approve/i })).toBeNull();
});
