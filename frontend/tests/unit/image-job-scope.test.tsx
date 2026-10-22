/** A locale/request refresh during native image creation must reconcile the committed job without a second provider POST. */
import { act, renderHook, waitFor } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import { useImageJob } from "../../src/admin/catalog/useImageJob";
it("reconciles a late create after the new request initially saw no job", async () => {
  let finish!: (v: unknown) => void,
    committed = false;
  const old = vi.fn((_path: string, body?: unknown) =>
    body
      ? new Promise((resolve) => {
          finish = resolve;
        })
      : Promise.resolve({ jobs: [] }),
  );
  const current = vi.fn((path: string) =>
    Promise.resolve(
      path.includes("/products/")
        ? { jobs: committed ? [{ id: "created", state: "queued" }] : [] }
        : { id: "created", state: "queued" },
    ),
  );
  const { result, rerender } = renderHook(
    ({ request }) => useImageJob(request, "product", "Failed"),
    { initialProps: { request: old as any } },
  );
  await waitFor(() => expect(old).toHaveBeenCalled());
  let pending!: Promise<void>;
  act(() => {
    pending = result.current.start({
      mode: "generate",
      prompt: "Synthetic",
      revision: 1,
    });
  });
  rerender({ request: current });
  await waitFor(() =>
    expect(current).toHaveBeenCalledWith(
      "/api/merchant/products/product/media/jobs",
    ),
  );
  expect(result.current.busy).toBe(true);
  committed = true;
  await act(async () => {
    finish({ id: "created", state: "queued" });
    await pending;
  });
  await waitFor(() => expect(result.current.job?.id).toBe("created"));
  expect(old.mock.calls.filter((c) => c[1])).toHaveLength(1);
  expect(current.mock.calls.every((c) => c.length === 1)).toBe(true);
});
it("does not append a late image to a different product or overwrite its error", async () => {
  let fail!: (e: Error) => void;
  const old = vi.fn((path: string, body?: unknown) =>
    body
      ? new Promise((_, reject) => {
          fail = reject;
        })
      : Promise.resolve(
          path.includes("/products/")
            ? { jobs: [{ id: "ready", state: "ready" }] }
            : { id: "ready", state: "ready" },
        ),
  );
  const current = vi.fn().mockResolvedValue({ jobs: [] }),
    image = vi.fn();
  const { result, rerender } = renderHook(
    ({ request, id }) => useImageJob(request, id, "Failed"),
    { initialProps: { request: old as any, id: "one" } },
  );
  await waitFor(() => expect(result.current.job?.state).toBe("ready"));
  let pending!: Promise<void>;
  act(() => {
    pending = result.current.apply(1, image)!;
  });
  rerender({ request: current, id: "two" });
  await act(async () => {
    fail(new Error("private previous scope"));
    await pending;
  });
  expect(image).not.toHaveBeenCalled();
  expect(result.current.error).toBe("");
});

it("keeps creation disabled until the post-commit reconciliation has finished", async () => {
  let finish!: (v: unknown) => void,
    restore!: (v: unknown) => void,
    committed = false;
  const old = vi.fn((_path: string, body?: unknown) =>
    body
      ? new Promise((resolve) => {
          finish = resolve;
        })
      : Promise.resolve({ jobs: [] }),
  );
  const current = vi.fn((path: string) =>
    !committed
      ? Promise.resolve({ jobs: [] })
      : path.includes("/products/")
        ? new Promise((resolve) => {
            restore = resolve;
          })
        : Promise.resolve({ id: "ready", state: "ready" }),
  );
  const { result, rerender } = renderHook(
    ({ request }) => useImageJob(request, "one", "Failed"),
    { initialProps: { request: old as any } },
  );
  await waitFor(() => expect(result.current.busy).toBe(false));
  let pending!: Promise<void>;
  act(() => {
    pending = result.current.start({ mode: "generate" });
  });
  rerender({ request: current });
  await waitFor(() => expect(current).toHaveBeenCalled());
  committed = true;
  await act(async () => {
    finish({ id: "ready", state: "ready" });
  });
  await waitFor(() => expect(restore).toBeDefined());
  expect(result.current.busy).toBe(true);
  await act(async () => {
    restore({ jobs: [{ id: "ready", state: "ready" }] });
    await pending;
  });
  expect(result.current.job.state).toBe("ready");
  expect(result.current.busy).toBe(false);
});
