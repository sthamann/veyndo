/** Acknowledged work remains pending until the native worker confirms it. */
import {
  act,
  fireEvent,
  render,
  renderHook,
  screen,
} from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { useWorkspaceTaskRun } from "../../src/admin/workspace/useWorkspaceTaskRun";
import WorkspaceTask from "../../src/admin/workspace/WorkspaceTask";
import { LocaleScope } from "../../src/shared/i18n/i18n";
import type { SavedRun } from "../../src/admin/shell/useChatTurns";
afterEach(() => vi.useRealTimers());
function value(state: SavedRun["state"], revision = 3): SavedRun {
  return {
    taskId: "work-1",
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
  };
}
it("shows queued and running work without completion or a duplicate approval, then confirms the native receipt", async () => {
  vi.useFakeTimers();
  let run = value("queued");
  const request = vi.fn(async (path: string) =>
    path.endsWith("/apply") ? { queued: true, applied: false } : run,
  );
  const { result, unmount } = renderHook(() =>
    useWorkspaceTaskRun("work-1", false, request as any),
  );
  await act(() => result.current.approve());
  expect(result.current.accepted).toBe(true);
  expect(result.current.applied).toBe(false);
  expect(result.current.run?.state).toBe("queued");
  await act(() => result.current.approve());
  expect(
    request.mock.calls.filter(([path]) => path.endsWith("/apply")),
  ).toHaveLength(1);
  run = value("running", 4);
  await act(() => vi.advanceTimersByTimeAsync(1500));
  expect(result.current.run?.state).toBe("running");
  expect(result.current.applied).toBe(false);
  run = value("ready", 5);
  await act(() => vi.advanceTimersByTimeAsync(1500));
  expect(result.current.applied).toBe(true);
  const count = request.mock.calls.length;
  await act(() => vi.advanceTimersByTimeAsync(9000));
  expect(request).toHaveBeenCalledTimes(count);
  unmount();
});
it("does not confuse a ready proposal with applied work and accepts an immediate native apply", async () => {
  const request = vi.fn(async (path: string) =>
    path.endsWith("/apply")
      ? { queued: true }
      : { ...value("ready"), approvalRequired: true },
  );
  const first = renderHook(() =>
    useWorkspaceTaskRun("work-1", false, request as any),
  );
  await act(() => first.result.current.approve());
  expect(first.result.current.applied).toBe(false);
  first.unmount();
  const immediate = vi.fn(async () => ({ applied: true }));
  const next = renderHook(() =>
    useWorkspaceTaskRun("legacy-1", false, immediate),
  );
  await act(() => next.result.current.approve());
  expect(next.result.current.applied).toBe(true);
  expect(immediate).toHaveBeenCalledOnce();
});
it("does not turn a status outage into success and offers an explicit refresh", async () => {
  let broken = true;
  const request = vi.fn(async (path: string) => {
    if (path.endsWith("/apply")) return { queued: true };
    if (broken) throw new Error("Progress unavailable");
    return value("ready");
  });
  const { result } = renderHook(() =>
    useWorkspaceTaskRun("work-1", false, request as any),
  );
  await act(() => result.current.approve());
  expect(result.current.applied).toBe(false);
  expect(result.current.error).toBe("Progress unavailable");
  broken = false;
  await act(async () => result.current.reload());
  expect(result.current.error).toBe("");
  expect(result.current.applied).toBe(true);
});
it("retains failed work and resumes only on an explicit command with the observed revision", async () => {
  let run = value("failed", 8);
  const request = vi.fn(async (path: string) => {
    if (path.endsWith("/apply")) return { queued: true };
    if (path.endsWith("/resume")) run = value("ready", 9);
    return run;
  });
  const { result } = renderHook(() =>
    useWorkspaceTaskRun("work-1", false, request as any),
  );
  await act(() => result.current.approve());
  expect(result.current.run?.state).toBe("failed");
  expect(result.current.applied).toBe(false);
  expect(request.mock.calls.some(([path]) => path.endsWith("/resume"))).toBe(
    false,
  );
  await act(() => result.current.control("resume"));
  expect(request).toHaveBeenCalledWith("/api/agent/runs/work-1/resume", {
    revision: 8,
    approve: true,
  });
  expect(result.current.applied).toBe(true);
});
it("discards a late approval across a request identity change, even after returning to that identity", async () => {
  let finish!: (value: any) => void;
  const old = vi.fn(
    () =>
      new Promise<any>((resolve) => {
        finish = resolve;
      }),
  );
  const next = vi.fn(async () => value("ready"));
  const { result, rerender } = renderHook(
    ({ request }) => useWorkspaceTaskRun("work-1", false, request),
    { initialProps: { request: old as any } },
  );
  let pending!: Promise<void>;
  act(() => {
    pending = result.current.approve();
  });
  rerender({ request: next });
  rerender({ request: old });
  await act(async () => {
    finish({ queued: true });
    await pending;
  });
  expect(result.current.accepted).toBe(false);
  expect(result.current.applied).toBe(false);
  expect(old).toHaveBeenCalledOnce();
  expect(next).not.toHaveBeenCalled();
});
it("renders worker progress in the same shared card rather than declaring completion on approval", async () => {
  const request = vi.fn(async (path: string) =>
    path.endsWith("/apply") ? { queued: true } : value("queued"),
  );
  const task: any = {
    id: "work-1",
    applied: false,
    preview: {
      proposal: {
        summary: "Create a category",
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
  const { unmount } = render(
    <LocaleScope locale="en-GB">
      <WorkspaceTask
        task={task}
        request={request as any}
        onTranslations={vi.fn()}
      />
    </LocaleScope>,
  );
  fireEvent.click(screen.getByRole("button", { name: "Open" }));
  await act(async () =>
    fireEvent.click(screen.getByRole("button", { name: /approve/i })),
  );
  expect(screen.getByText("Saved · waiting for a worker")).toBeInTheDocument();
  expect(screen.queryByText("Done")).toBeNull();
  expect(screen.queryByText("Approved work completed")).toBeNull();
  unmount();
});
it("stops polling after cancellation and discards an older in-flight status response", async () => {
  vi.useFakeTimers();
  let finish!: (run: SavedRun) => void;
  let reads = 0;
  const request = vi.fn(async (path: string) => {
    if (path.endsWith("/apply")) return { queued: true };
    if (path.endsWith("/cancel")) return value("cancelled", 6);
    reads += 1;
    if (reads === 2)
      return new Promise<SavedRun>((resolve) => {
        finish = resolve;
      });
    return reads === 1 ? value("running", 5) : value("cancelled", 6);
  });
  const { result, unmount } = renderHook(() =>
    useWorkspaceTaskRun("work-1", false, request as any),
  );
  await act(() => result.current.approve());
  await act(() => vi.advanceTimersByTimeAsync(1500));
  await act(() => result.current.control("cancel"));
  expect(request).toHaveBeenCalledWith("/api/agent/runs/work-1/cancel", {
    revision: 5,
    approve: true,
  });
  await act(async () => finish(value("ready", 5)));
  expect(result.current.run?.state).toBe("cancelled");
  expect(result.current.applied).toBe(false);
  const count = request.mock.calls.length;
  await act(() => vi.advanceTimersByTimeAsync(9000));
  expect(request).toHaveBeenCalledTimes(count);
  unmount();
});
it("preserves a failed approval for retry and ignores late status after switching tasks", async () => {
  let fail = true;
  let finish!: (run: SavedRun) => void;
  const request = vi.fn(async (path: string) => {
    if (path.endsWith("/apply")) {
      if (fail) throw new Error("Approval rejected");
      return { queued: true };
    }
    return new Promise<SavedRun>((resolve) => {
      finish = resolve;
    });
  });
  const { result, rerender } = renderHook(
    ({ id }) => useWorkspaceTaskRun(id, false, request as any),
    { initialProps: { id: "work-1" } },
  );
  await act(() => result.current.approve());
  expect(result.current.error).toBe("Approval rejected");
  expect(result.current.busy).toBe(false);
  expect(result.current.accepted).toBe(false);
  fail = false;
  await act(() => result.current.approve());
  rerender({ id: "work-2" });
  await act(async () => finish(value("ready")));
  expect(result.current.applied).toBe(false);
  expect(result.current.accepted).toBe(false);
  expect(result.current.run).toBeUndefined();
});
